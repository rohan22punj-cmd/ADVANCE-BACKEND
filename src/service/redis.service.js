const Redis = require('ioredis');
const crypto = require('crypto');

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

// Safe unlock Lua script: only delete the key if its value matches the lockValue
const UNLOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

/**
 * Initialize Redis connection
 */
function getRedisClient() {
    if (redisClient) {
        return isConnected ? redisClient : null;
    }

    if (process.env.ENABLE_REDIS === 'false' || (!process.env.REDIS_URI && !process.env.REDIS_HOST && process.env.NODE_ENV === 'test')) {
        return null;
    }

    const redisUrl = process.env.REDIS_URI || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

    try {
        redisClient = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            lazyConnect: true,
            retryStrategy(times) {
                if (times > 3) {
                    if (process.env.NODE_ENV !== 'test') {
                        console.warn('[Redis] Max reconnection attempts reached. Running without Redis.');
                    }
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 2000);
            }
        });

        redisClient.on('connect', () => {
            isConnected = true;
            if (process.env.NODE_ENV !== 'test') {
                console.log('[Redis] Connected successfully to distributed cache & lock manager.');
            }
        });

        redisClient.on('ready', () => {
            isConnected = true;
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            if (!connectionAttempted && process.env.NODE_ENV !== 'test') {
                console.warn('[Redis] Warning: Unable to connect to Redis:', err.message);
                console.warn('[Redis] Falling back to MongoDB session-only transactions.');
            }
            connectionAttempted = true;
        });

        redisClient.connect().catch((err) => {
            isConnected = false;
            if (process.env.NODE_ENV !== 'test') {
                console.warn('[Redis] Redis not available at startup:', err.message);
            }
        });

        return redisClient;
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn('[Redis] Redis initialization skipped:', error.message);
        }
        return null;
    }
}

/**
 * Acquire a single distributed lock using Redis atomic SET NX PX
 * @param {string} resourceKey - e.g. "lock:account:650f..."
 * @param {number} ttlMs - Time to live in milliseconds (default: 5000ms)
 * @returns {Promise<{ acquired: boolean, lockValue: string|null, release: Function }>}
 */
async function acquireLock(resourceKey, ttlMs = 5000) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        // Graceful degradation: If Redis is offline, allow operation to continue under MongoDB ACID protection
        return {
            acquired: true,
            lockValue: null,
            release: async () => {}
        };
    }

    const lockValue = crypto.randomUUID();

    try {
        // Atomic acquire with NX (only if not exists) and PX (millisecond expiry)
        const result = await client.set(resourceKey, lockValue, 'PX', ttlMs, 'NX');

        if (result === 'OK') {
            return {
                acquired: true,
                lockValue,
                release: async () => {
                    try {
                        await client.eval(UNLOCK_SCRIPT, 1, resourceKey, lockValue);
                    } catch (releaseErr) {
                        // Ignore release errors on shutdown
                    }
                }
            };
        }

        return {
            acquired: false,
            lockValue: null,
            release: async () => {}
        };
    } catch (error) {
        // If Redis throws during lock acquisition, fallback safely
        return {
            acquired: true,
            lockValue: null,
            release: async () => {}
        };
    }
}

/**
 * Helper to acquire multiple distributed locks in sorted order to prevent AB-BA deadlocks
 * @param {string[]} resourceKeys - Array of lock keys
 * @param {number} ttlMs - Time to live in ms
 * @returns {Promise<{ acquired: boolean, releaseAll: Function }>}
 */
async function acquireMultiLock(resourceKeys, ttlMs = 5000) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        return {
            acquired: true,
            releaseAll: async () => {}
        };
    }

    // Sort keys alphabetically to enforce a global lock acquisition hierarchy
    const sortedKeys = [...new Set(resourceKeys)].sort();
    const acquiredLocks = [];

    for (const key of sortedKeys) {
        const lock = await acquireLock(key, ttlMs);
        if (!lock.acquired) {
            // Failed to acquire one of the locks: roll back and release all previously acquired locks
            await Promise.all(acquiredLocks.map(l => l.release()));
            return {
                acquired: false,
                releaseAll: async () => {}
            };
        }
        acquiredLocks.push(lock);
    }

    return {
        acquired: true,
        releaseAll: async () => {
            await Promise.all(acquiredLocks.map(l => l.release()));
        }
    };
}

/**
 * Check idempotency cache in Redis
 * @param {string} idempotencyKey
 * @returns {Promise<{ status: 'NOT_FOUND'|'IN_PROGRESS'|'COMPLETED', data?: any }>}
 */
async function checkIdempotency(idempotencyKey) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        return { status: 'NOT_FOUND' };
    }

    try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        const cached = await client.get(cacheKey);

        if (!cached) {
            return { status: 'NOT_FOUND' };
        }

        if (cached === 'IN_PROGRESS') {
            return { status: 'IN_PROGRESS' };
        }

        try {
            const data = JSON.parse(cached);
            return { status: 'COMPLETED', data };
        } catch {
            return { status: 'COMPLETED', data: cached };
        }
    } catch {
        return { status: 'NOT_FOUND' };
    }
}

/**
 * Mark an idempotency key as currently being processed (prevents concurrent duplicate submits)
 * @param {string} idempotencyKey
 * @param {number} ttlSeconds - Default: 60 seconds
 * @returns {Promise<boolean>} - True if marked, false if already in progress or completed
 */
async function setIdempotencyProcessing(idempotencyKey, ttlSeconds = 60) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        return true;
    }

    try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        const result = await client.set(cacheKey, 'IN_PROGRESS', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    } catch {
        return true;
    }
}

/**
 * Save completed transaction response in Redis for fast idempotent replay
 * @param {string} idempotencyKey
 * @param {object} responseData
 * @param {number} ttlSeconds - Default: 24 hours (86400s)
 */
async function setIdempotencyCompleted(idempotencyKey, responseData, ttlSeconds = 86400) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        return;
    }

    try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        await client.set(cacheKey, JSON.stringify(responseData), 'EX', ttlSeconds);
    } catch {
        // Ignore cache write errors
    }
}

/**
 * Clear an idempotency key (used if a transaction fails before completion)
 * @param {string} idempotencyKey
 */
async function clearIdempotency(idempotencyKey) {
    const client = getRedisClient();
    if (!client || !isConnected) {
        return;
    }

    try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        await client.del(cacheKey);
    } catch {
        // Ignore deletion errors
    }
}

/**
 * Close Redis connection (used during server shutdown or test cleanup)
 */
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            // Ignore error on quit
        }
        redisClient = null;
        isConnected = false;
    }
}

module.exports = {
    getRedisClient,
    acquireLock,
    acquireMultiLock,
    checkIdempotency,
    setIdempotencyProcessing,
    setIdempotencyCompleted,
    clearIdempotency,
    closeRedis
};
