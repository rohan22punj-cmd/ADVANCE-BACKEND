const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { connect, clearDatabase, closeDatabase } = require('./setup/testDb');
const User = require('../models/user.model');
const Account = require('../models/account.model');
const Transaction = require('../models/transaction.model');
const Ledger = require('../models/ledger.model');

jest.mock('../service/GmailService', () => ({
    sendEmail: jest.fn(),
    sendRegistrationEmail: jest.fn(),
    sendTransactionEmail: jest.fn(),
    failureNotificationEmail: jest.fn()
}));

describe('Comprehensive API Test Suite', () => {
    beforeAll(async () => {
        process.env.JWT_SECRET = 'test-secret-suite';
        await connect();
    });

    afterEach(clearDatabase);
    afterAll(closeDatabase);

    describe('Health check endpoint', () => {
        test('GET /health returns 200 OK', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.uptime).toBeDefined();
        });

        test('GET /undefined-route returns 404', async () => {
            const res = await request(app).get('/api/not-existing');
            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Route not found');
        });
    });

    describe('Authentication Routes', () => {
        test('Register new user -> Success', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123'
                });

            expect(res.status).toBe(201);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('john@example.com');
            expect(res.body.accessToken).toBeDefined();
            expect(res.body.refreshToken).toBeDefined();
        });

        test('Register existing user -> 422 Conflict', async () => {
            await User.create({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Duplicate',
                    email: 'john@example.com',
                    password: 'password123'
                });

            expect(res.status).toBe(422);
            expect(res.body.message).toMatch(/already exists/i);
        });

        test('Register with invalid email / short password -> 400 Validation failed', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'J',
                    email: 'invalid-email',
                    password: '123'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Validation failed/i);
        });

        test('Login user with valid credentials', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test',
                    email: 'login@example.com',
                    password: 'password123'
                });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body.accessToken).toBeDefined();
        });

        test('Login with wrong password -> 401', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test',
                    email: 'login2@example.com',
                    password: 'password123'
                });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login2@example.com',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/Invalid password/i);
        });

        test('Refresh token -> Success with cookie', async () => {
            const agent = request.agent(app);
            const regRes = await agent
                .post('/api/auth/register')
                .send({
                    name: 'Refresh Test',
                    email: 'refresh@example.com',
                    password: 'password123'
                });

            expect(regRes.status).toBe(201);

            const refreshRes = await agent
                .post('/api/auth/refresh-token');

            expect(refreshRes.status).toBe(200);
            expect(refreshRes.body.accessToken).toBeDefined();
        });

        test('Logout -> clears refresh token', async () => {
            const agent = request.agent(app);
            const regRes = await agent
                .post('/api/auth/register')
                .send({
                    name: 'Logout Test',
                    email: 'logout@example.com',
                    password: 'password123'
                });

            expect(regRes.status).toBe(201);
            const refreshToken = regRes.body.refreshToken;

            const logoutRes = await agent
                .post('/api/auth/logout');

            expect(logoutRes.status).toBe(200);

            // Attempting to refresh with invalidated token should fail
            const tryRefresh = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken });

            expect(tryRefresh.status).toBe(403);
        });
    });

    describe('Account Routes', () => {
        let token;
        let user;

        beforeEach(async () => {
            user = await User.create({
                name: 'Account Owner',
                email: 'owner@example.com',
                password: 'password123'
            });
            token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        });

        test('Create account and get balance', async () => {
            const createRes = await request(app)
                .post('/api/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({ currency: 'USD' });

            expect(createRes.status).toBe(201);
            expect(createRes.body.account.currency).toBe('USD');
            expect(createRes.body.account.user.toString()).toBe(user._id.toString());

            const accountId = createRes.body.account._id;

            const listRes = await request(app)
                .get('/api/accounts')
                .set('Authorization', `Bearer ${token}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.accounts).toHaveLength(1);

            const balanceRes = await request(app)
                .get(`/api/accounts/${accountId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(balanceRes.status).toBe(200);
            expect(balanceRes.body.balance).toBe(0);
        });

        test('Create account ignores mass-assignment user override', async () => {
            const attackerId = '507f1f77bcf86cd799439011';
            const createRes = await request(app)
                .post('/api/accounts')
                .set('Authorization', `Bearer ${token}`)
                .send({ currency: 'EUR', user: attackerId });

            expect(createRes.status).toBe(201);
            expect(createRes.body.account.user.toString()).toBe(user._id.toString());
        });

        test('Get balance for non-existent account -> 404', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .get(`/api/accounts/${nonExistentId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });

        test('Get balance with invalid ID format -> 400', async () => {
            const res = await request(app)
                .get('/api/accounts/invalid-id')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);
        });
    });

    describe('Transactions and History Routes', () => {
        let token;
        let user;
        let account1;
        let account2;

        beforeEach(async () => {
            user = await User.create({
                name: 'Tx User',
                email: 'tx@example.com',
                password: 'password123'
            });
            token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            account1 = await Account.create({ user: user._id, currency: 'USD' });
            account2 = await Account.create({ user: user._id, currency: 'USD' });
        });

        test('Transaction history with empty query strings and pagination works', async () => {
            const res = await request(app)
                .get('/api/transactions?accountId=&status=&page=1&limit=10')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.transactions).toEqual([]);
            expect(res.body.pagination.page).toBe(1);
        });

        test('Demo fund account and transfer between user accounts', async () => {
            const fundRes = await request(app)
                .post('/api/demo/fund')
                .set('Authorization', `Bearer ${token}`)
                .send({ accountId: account1._id.toString(), amount: 500 });

            expect(fundRes.status).toBe(201);

            const transferRes = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    fromAccountId: account1._id.toString(),
                    toAccountId: account2._id.toString(),
                    amount: 200,
                    idempotencyKey: 'transfer-test-12345678'
                });

            expect(transferRes.status).toBe(201);

            // Verify balances
            const bal1 = await request(app).get(`/api/accounts/${account1._id}`).set('Authorization', `Bearer ${token}`);
            expect(bal1.body.balance).toBe(300);

            const bal2 = await request(app).get(`/api/accounts/${account2._id}`).set('Authorization', `Bearer ${token}`);
            expect(bal2.body.balance).toBe(200);

            // Test reversal
            const revRes = await request(app)
                .post(`/api/transactions/${transferRes.body.transaction._id}/reverse`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    reason: 'Testing transaction reversal',
                    idempotencyKey: 'reversal-test-12345678'
                });

            expect(revRes.status).toBe(201);

            // Verify balances reverted
            const bal1Rev = await request(app).get(`/api/accounts/${account1._id}`).set('Authorization', `Bearer ${token}`);
            expect(bal1Rev.body.balance).toBe(500);

            const bal2Rev = await request(app).get(`/api/accounts/${account2._id}`).set('Authorization', `Bearer ${token}`);
            expect(bal2Rev.body.balance).toBe(0);
        });
    });
});
