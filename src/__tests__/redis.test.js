const redisService = require('../service/redis.service');

describe('Redis Service & Distributed Locking Unit Tests', () => {
    afterAll(async () => {
        await redisService.closeRedis();
    });

    test('Graceful degradation: acquireLock returns acquired:true when Redis is offline', async () => {
        const lock = await redisService.acquireLock('lock:test:account-123', 5000);
        expect(lock.acquired).toBe(true);
        expect(typeof lock.release).toBe('function');
        await expect(lock.release()).resolves.not.toThrow();
    });

    test('Graceful degradation: acquireMultiLock returns acquired:true and safely releases all', async () => {
        const multiLock = await redisService.acquireMultiLock([
            'lock:account:B',
            'lock:account:A',
            'lock:account:C'
        ], 5000);

        expect(multiLock.acquired).toBe(true);
        expect(typeof multiLock.releaseAll).toBe('function');
        await expect(multiLock.releaseAll()).resolves.not.toThrow();
    });

    test('Graceful degradation: checkIdempotency returns NOT_FOUND when offline', async () => {
        const result = await redisService.checkIdempotency('non-existent-key');
        expect(result.status).toBe('NOT_FOUND');
    });

    test('Graceful degradation: setIdempotencyProcessing & setIdempotencyCompleted work safely', async () => {
        const key = 'test-idempotency-key-001';
        const processingResult = await redisService.setIdempotencyProcessing(key, 60);
        expect(processingResult).toBe(true);

        await expect(redisService.setIdempotencyCompleted(key, { transactionId: '123' }, 3600)).resolves.not.toThrow();
        await expect(redisService.clearIdempotency(key)).resolves.not.toThrow();
    });
});
