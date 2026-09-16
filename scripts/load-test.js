const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Set environment for benchmark
process.env.NODE_ENV = 'benchmark';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.PORT = '0';
process.env.JWT_SECRET = 'load-test-super-secret-jwt-key-minimum-32-chars-long';

const app = require('../src/app');
const userModel = require('../src/models/user.model');
const accountModel = require('../src/models/account.model');
const ledgerModel = require('../src/models/ledger.model');
const transactionModel = require('../src/models/transaction.model');
const redisService = require('../src/service/redis.service');
const jwt = require('jsonwebtoken');

function calculatePercentiles(latencies) {
    if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
    const sorted = [...latencies].sort((a, b) => a - b);
    const getPercentile = (p) => {
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    };

    const sum = sorted.reduce((acc, val) => acc + val, 0);
    return {
        min: parseFloat(sorted[0].toFixed(2)),
        max: parseFloat(sorted[sorted.length - 1].toFixed(2)),
        avg: parseFloat((sum / sorted.length).toFixed(2)),
        p50: parseFloat(getPercentile(50).toFixed(2)),
        p90: parseFloat(getPercentile(90).toFixed(2)),
        p95: parseFloat(getPercentile(95).toFixed(2)),
        p99: parseFloat(getPercentile(99).toFixed(2))
    };
}

function sendTransferRequest(agent, serverPort, token, fromAccountId, toAccountId, amount) {
    return new Promise((resolve) => {
        const idempotencyKey = crypto.randomUUID();
        const postData = JSON.stringify({
            fromAccountId,
            toAccountId,
            amount,
            idempotencyKey
        });

        const startTime = process.hrtime.bigint();

        const req = http.request({
            hostname: '127.0.0.1',
            port: serverPort,
            path: '/api/transactions',
            method: 'POST',
            agent,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000
        }, (res) => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                const endTime = process.hrtime.bigint();
                const latencyMs = Number(endTime - startTime) / 1e6;
                resolve({
                    statusCode: res.statusCode,
                    latencyMs,
                    body: body ? (() => { try { return JSON.parse(body); } catch { return body; } })() : null
                });
            });
        });

        req.on('error', (err) => {
            const endTime = process.hrtime.bigint();
            const latencyMs = Number(endTime - startTime) / 1e6;
            if (!global.printedErr) {
                console.log('Socket error example:', err.code || err.message);
                global.printedErr = true;
            }
            resolve({
                statusCode: 0,
                error: err.message,
                latencyMs
            });
        });

        req.write(postData);
        req.end();
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runBenchmark() {
    console.log('======================================================================');
    console.log('       LEDGERLINE HIGH-CONCURRENCY LOAD TEST & BENCHMARK SUITE        ');
    console.log('======================================================================\n');

    console.log('[1/4] Initializing In-Memory MongoDB Replica Set & Redis Layer...');
    const replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const mongoUri = replSet.getUri();
    await mongoose.connect(mongoUri);
    redisService.getRedisClient();

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', 2048, resolve));
    const serverPort = server.address().port;
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity, maxFreeSockets: 1000 });
    console.log(`       Backend API live on port ${serverPort}\n`);

    // Create Test User & Generate Token
    const testUser = await userModel.create({
        name: 'Benchmark User',
        email: `benchmark-${Date.now()}@ledgerline.io`,
        password: 'Password123!',
        systemUser: false
    });

    const token = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    // ======================================================================
    // BENCHMARK 1: 500 CONCURRENT USERS ACROSS DISJOINT ACCOUNT POOLS
    // ======================================================================
    const CONCURRENCY_1 = 500;
    const NUM_PAIRS = 500; // 1,000 total accounts (500 distinct sender-receiver pairs)
    const INITIAL_PER_ACCOUNT = 100000;

    console.log(`[2/4] Executing Benchmark 1: High-Throughput Distributed Transfers...`);
    console.log(`       • Seeding ${NUM_PAIRS} Distinct Account Pairs (1,000 total accounts)...`);

    const accountPairs = [];
    const seedAccounts = [];
    const seedTxs = [];
    const seedLedgers = [];

    for (let i = 0; i < NUM_PAIRS; i++) {
        const senderId = new mongoose.Types.ObjectId();
        const receiverId = new mongoose.Types.ObjectId();
        const txId = new mongoose.Types.ObjectId();

        seedAccounts.push(
            { _id: senderId, user: testUser._id, currency: 'INR', status: 'active', version: 0 },
            { _id: receiverId, user: testUser._id, currency: 'INR', status: 'active', version: 0 }
        );

        seedTxs.push({
            _id: txId,
            fromAccount: senderId,
            toAccount: senderId,
            status: 'completed',
            amount: INITIAL_PER_ACCOUNT,
            idempotencyKey: `seed-pair-${i}-${Date.now()}`
        });

        seedLedgers.push({
            account: senderId,
            amount: INITIAL_PER_ACCOUNT,
            transaction: txId,
            type: 'credit'
        });

        accountPairs.push({ senderId: senderId.toString(), receiverId: receiverId.toString() });
    }

    await accountModel.insertMany(seedAccounts);
    await transactionModel.insertMany(seedTxs);
    await ledgerModel.insertMany(seedLedgers);
    console.log(`       • Accounts seeded successfully.`);
    console.log(`       • Launching ${CONCURRENCY_1} Concurrent Virtual Workers...`);

    const TOTAL_REQUESTS_1 = 500;
    const latencies1 = [];
    const statusCodes1 = {};

    const start1 = process.hrtime.bigint();

    // Launch all 500 concurrent requests across distinct account pairs
    const workers1 = accountPairs.map((pair) => {
        return sendTransferRequest(
            httpAgent,
            serverPort,
            token,
            pair.senderId,
            pair.receiverId,
            50
        ).then(res => {
            latencies1.push(res.latencyMs);
            statusCodes1[res.statusCode] = (statusCodes1[res.statusCode] || 0) + 1;
        });
    });

    await Promise.all(workers1);
    const end1 = process.hrtime.bigint();
    const duration1 = Number(end1 - start1) / 1e9;
    const stats1 = calculatePercentiles(latencies1);
    const rps1 = parseFloat((TOTAL_REQUESTS_1 / duration1).toFixed(2));

    console.log(`       Completed in ${duration1.toFixed(2)}s | Throughput: ${rps1} RPS | p95: ${stats1.p95}ms\n`);

    // ======================================================================
    // BENCHMARK 2: HOTSPOT CONCURRENT MUTEX CONTENTION TEST
    // ======================================================================
    console.log('[3/4] Executing Benchmark 2: Single-Account Hotspot Mutex Contention...');
    console.log('       • 1 Single Hotspot Sender Account (Initial Balance: ₹500,000)');
    console.log('       • 500 Concurrent Virtual Workers attacking the same account simultaneously');

    const hotSender = await accountModel.create({ user: testUser._id, currency: 'INR', status: 'active', version: 0 });
    const hotReceiver = await accountModel.create({ user: testUser._id, currency: 'INR', status: 'active', version: 0 });

    const hotInitTx = await transactionModel.create({
        fromAccount: hotSender._id,
        toAccount: hotSender._id,
        status: 'completed',
        amount: 500000,
        idempotencyKey: `seed-hot-${Date.now()}`
    });

    await ledgerModel.create({
        account: hotSender._id,
        amount: 500000,
        transaction: hotInitTx._id,
        type: 'credit'
    });

    const CONCURRENCY_2 = 500;
    const latencies2 = [];
    const statusCodes2 = {};

    const start2 = process.hrtime.bigint();
    const promises2 = Array.from({ length: CONCURRENCY_2 }).map(() =>
        sendTransferRequest(
            httpAgent,
            serverPort,
            token,
            hotSender._id.toString(),
            hotReceiver._id.toString(),
            10
        ).then(res => {
            latencies2.push(res.latencyMs);
            statusCodes2[res.statusCode] = (statusCodes2[res.statusCode] || 0) + 1;
        })
    );

    await Promise.all(promises2);
    const end2 = process.hrtime.bigint();
    const duration2 = Number(end2 - start2) / 1e9;
    const stats2 = calculatePercentiles(latencies2);
    const rps2 = parseFloat((CONCURRENCY_2 / duration2).toFixed(2));

    // Audit Hotspot Balance
    const hotSenderAgg = await ledgerModel.aggregate([
        { $match: { account: hotSender._id } },
        {
            $group: {
                _id: null,
                balance: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", { $multiply: ["$amount", -1] }] } }
            }
        }
    ]);
    const hotSenderBalance = hotSenderAgg.length > 0 ? hotSenderAgg[0].balance : 0;

    const hotReceiverAgg = await ledgerModel.aggregate([
        { $match: { account: hotReceiver._id } },
        {
            $group: {
                _id: null,
                balance: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", { $multiply: ["$amount", -1] }] } }
            }
        }
    ]);
    const hotReceiverBalance = hotReceiverAgg.length > 0 ? hotReceiverAgg[0].balance : 0;
    const hotConservationPassed = (hotSenderBalance + hotReceiverBalance) === 500000;

    console.log(`       Completed in ${duration2.toFixed(2)}s | Hotspot Conservation: ${hotConservationPassed ? 'PASS' : 'FAIL'}\n`);

    // ======================================================================
    // FINAL BENCHMARK REPORT
    // ======================================================================
    console.log('[4/4] Generating Benchmark Results Report...\n');
    console.log('======================================================================');
    console.log('             BENCHMARK 1: DISTRIBUTED MULTI-ACCOUNT THROUGHPUT        ');
    console.log('======================================================================');
    console.log(`Concurrency:             ${CONCURRENCY_1} Concurrent Virtual Users`);
    console.log(`Total Requests:          ${TOTAL_REQUESTS_1}`);
    console.log(`Duration:                ${duration1.toFixed(2)}s`);
    console.log(`Throughput:              ${rps1} Requests/Sec (RPS)`);
    console.log('Latency Distribution:');
    console.log(`  • Min:                 ${stats1.min} ms`);
    console.log(`  • Average:             ${stats1.avg} ms`);
    console.log(`  • Median (p50):        ${stats1.p50} ms`);
    console.log(`  • p90:                 ${stats1.p90} ms`);
    console.log(`  • p95:                 ${stats1.p95} ms`);
    console.log(`  • p99:                 ${stats1.p99} ms`);
    console.log(`  • Max:                 ${stats1.max} ms`);
    console.log('Status Codes:');
    for (const [code, count] of Object.entries(statusCodes1)) {
        const desc = code === '201' ? 'Success (201 Created)' : code === '429' ? 'Lock Contention (429)' : 'Other';
        console.log(`  • HTTP ${code} (${desc}): ${count} (${((count / TOTAL_REQUESTS_1) * 100).toFixed(1)}%)`);
    }

    console.log('\n======================================================================');
    console.log('             BENCHMARK 2: SINGLE-ACCOUNT HOTSPOT MUTEX CONTENTION     ');
    console.log('======================================================================');
    console.log(`Concurrency:             ${CONCURRENCY_2} Simultaneous Requests on 1 Account`);
    console.log(`Total Requests:          ${CONCURRENCY_2}`);
    console.log(`Duration:                ${duration2.toFixed(2)}s`);
    console.log(`Throughput:              ${rps2} Requests/Sec (RPS)`);
    console.log('Latency Distribution:');
    console.log(`  • Min:                 ${stats2.min} ms`);
    console.log(`  • Average:             ${stats2.avg} ms`);
    console.log(`  • Median (p50):        ${stats2.p50} ms`);
    console.log(`  • p95:                 ${stats2.p95} ms`);
    console.log(`  • Max:                 ${stats2.max} ms`);
    console.log('Status Codes:');
    for (const [code, count] of Object.entries(statusCodes2)) {
        const desc = code === '201' ? 'Successful Transfers' : code === '429' ? 'Protected by Mutex (429)' : 'Other';
        console.log(`  • HTTP ${code} (${desc}): ${count} (${((count / CONCURRENCY_2) * 100).toFixed(1)}%)`);
    }
    console.log('Ledger Invariant Audit:');
    console.log(`  • Initial Balance:     ₹5,00,000`);
    console.log(`  • Sender Final:        ₹${hotSenderBalance.toLocaleString()}`);
    console.log(`  • Receiver Final:      ₹${hotReceiverBalance.toLocaleString()}`);
    console.log(`  • Total System Balance:₹${(hotSenderBalance + hotReceiverBalance).toLocaleString()}`);
    console.log(`  • Conservation Status: ${hotConservationPassed ? 'PASS (100% Zero-Loss Accounting)' : 'FAIL'}`);
    console.log('======================================================================\n');

    const fullReport = {
        timestamp: new Date().toISOString(),
        environment: {
            node: process.version,
            database: 'MongoDB 7.0 (WiredTiger Replica Set)',
            cache: 'Redis 7 (Distributed Mutex & Idempotency)'
        },
        benchmark1_distributedThroughput: {
            concurrency: CONCURRENCY_1,
            totalRequests: TOTAL_REQUESTS_1,
            durationSeconds: parseFloat(duration1.toFixed(2)),
            throughputRps: rps1,
            latencyMs: stats1,
            statusCodes: statusCodes1
        },
        benchmark2_hotspotContention: {
            concurrency: CONCURRENCY_2,
            totalRequests: CONCURRENCY_2,
            durationSeconds: parseFloat(duration2.toFixed(2)),
            throughputRps: rps2,
            latencyMs: stats2,
            statusCodes: statusCodes2,
            ledgerConservationPassed: hotConservationPassed
        }
    };

    fs.writeFileSync(path.join(__dirname, '../load-test-report.json'), JSON.stringify(fullReport, null, 2));
    console.log('Complete load test metrics written to load-test-report.json');

    server.close();
    httpAgent.destroy();
    await mongoose.disconnect();
    await replSet.stop();
    await redisService.closeRedis();
    process.exit(0);
}

runBenchmark().catch(err => {
    console.error('Benchmark error:', err);
    process.exit(1);
});
