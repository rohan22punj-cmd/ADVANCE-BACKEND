const request = require('supertest');
const app = require('../app');
const { connect, clearDatabase, closeDatabase } = require('./setup/testDb');
const userModel = require('../models/user.model');
const accountModel = require('../models/account.model');
const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const jwt = require('jsonwebtoken');

// Mock the GmailService to prevent actual emails during tests
jest.mock('../service/GmailService', () => ({
    sendEmail: jest.fn(),
    sendRegistrationEmail: jest.fn(),
    sendTransactionEmail: jest.fn(),
    failureNotificationEmail: jest.fn()
}));

describe('Transaction Money-Moving Tests', () => {
    let authToken;
    let systemUserToken;
    let regularUser;
    let systemUser;
    let accountA;
    let accountB;

    // Connect to in-memory database before all tests
    beforeAll(async () => {
        await connect();
    });

    // Clear all data after each test
    afterEach(async () => {
        await clearDatabase();
    });

    // Close database connection after all tests
    afterAll(async () => {
        await closeDatabase();
    });

    // Setup: Create users and accounts before each test
    beforeEach(async () => {
        // Create regular user
        regularUser = await userModel.create({
            email: 'alice@example.com',
            name: 'Alice',
            password: 'password123'
        });

        // Create system user
        systemUser = await userModel.create({
            email: 'system@example.com',
            name: 'System',
            password: 'systempass123',
            systemUser: true
        });

        // Generate JWT tokens
        authToken = jwt.sign({ userId: regularUser._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        systemUserToken = jwt.sign({ userId: systemUser._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

        // Create two accounts for the regular user
        accountA = await accountModel.create({
            user: regularUser._id,
            currency: 'USD'
        });

        accountB = await accountModel.create({
            user: regularUser._id,
            currency: 'USD'  // Changed to USD to match accountA
        });
    });

    describe('Test 1: Transaction creates exactly two balanced ledger entries', () => {
        test('Initial funds transaction should create one debit and one credit ledger entry', async () => {
            const idempotencyKey = 'initial-test-001';
            const amount = 1000;

            // Create initial funds transaction (system user injecting money)
            const response = await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: amount,
                    idempotencyKey: idempotencyKey
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Initial funds transaction created successfully');

            // Verify two ledger entries were created
            const ledgerEntries = await ledgerModel.find({ transactionId: response.body.transaction._id });
            expect(ledgerEntries).toHaveLength(2);

            // Find the debit and credit entries
            const creditEntry = ledgerEntries.find(entry => entry.type === 'credit');
            const debitEntry = ledgerEntries.find(entry => entry.type === 'debit');

            expect(creditEntry).toBeDefined();
            expect(debitEntry).toBeDefined();

            // Verify amounts are equal and opposite
            expect(creditEntry.amount).toBe(amount);
            expect(debitEntry.amount).toBe(amount);

            // Verify credit goes to the destination account
            expect(creditEntry.account.toString()).toBe(accountA._id.toString());

            // Verify debit comes from null (system source)
            expect(debitEntry.account).toBeNull();
        });

        test('Regular transfer should create balanced debit and credit ledger entries', async () => {
            // First, fund account A with initial balance
            await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 5000,
                    idempotencyKey: 'setup-initial-001'
                });

            // Now create a regular transfer from A to B
            const transferAmount = 500;
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: transferAmount,
                    idempotencyKey: 'transfer-test-001'
                });

            expect(response.status).toBe(201);

            // Verify two ledger entries were created for this transaction
            const ledgerEntries = await ledgerModel.find({ transactionId: response.body.transaction._id });
            expect(ledgerEntries).toHaveLength(2);

            const debitEntry = ledgerEntries.find(entry => entry.type === 'debit' && entry.account.toString() === accountA._id.toString());
            const creditEntry = ledgerEntries.find(entry => entry.type === 'credit' && entry.account.toString() === accountB._id.toString());

            expect(debitEntry).toBeDefined();
            expect(creditEntry).toBeDefined();

            // Verify amounts match
            expect(debitEntry.amount).toBe(transferAmount);
            expect(creditEntry.amount).toBe(transferAmount);
        });
    });

    describe('Test 2: Insufficient balance transfers are rejected', () => {
        test('Should reject transfer when account has zero balance', async () => {
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 100,
                    idempotencyKey: 'insufficient-test-001'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/insufficient/i);

            // Verify no ledger entries were created
            const ledgerEntries = await ledgerModel.find({});
            expect(ledgerEntries).toHaveLength(0);
        });

        test('Should reject transfer when amount exceeds available balance', async () => {
            // Fund account A with 100
            await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 100,
                    idempotencyKey: 'setup-insufficient-001'
                });

            // Try to transfer 150 (more than available)
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 150,
                    idempotencyKey: 'insufficient-test-002'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/insufficient/i);

            // Verify balance remains unchanged (only initial transaction)
            const ledgerEntries = await ledgerModel.find({ account: accountA._id });
            expect(ledgerEntries).toHaveLength(1); // Only the initial credit entry
            expect(ledgerEntries[0].type).toBe('credit');
        });
    });

    describe('Test 3: Duplicate idempotency keys are blocked', () => {
        test('Should reject transaction with duplicate idempotency key', async () => {
            // Fund account A
            await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 1000,
                    idempotencyKey: 'setup-idempotency-001'
                });

            const idempotencyKey = 'duplicate-test-001';

            // First transfer should succeed
            const firstResponse = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 100,
                    idempotencyKey: idempotencyKey
                });

            expect(firstResponse.status).toBe(201);

            // Second transfer with same idempotency key should fail
            const secondResponse = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 50,
                    idempotencyKey: idempotencyKey // Same key
                });

            expect(secondResponse.status).toBe(409);
            expect(secondResponse.body.message).toMatch(/already.*processed|duplicate/i);

            // Verify only the first transaction was created
            const transactions = await transactionModel.find({ idempotencyKey: idempotencyKey });
            expect(transactions).toHaveLength(1);
        });

        test('Should block duplicate idempotency key for initial funds', async () => {
            const idempotencyKey = 'initial-duplicate-001';

            // First initial funds transaction
            const firstResponse = await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 500,
                    idempotencyKey: idempotencyKey
                });

            expect(firstResponse.status).toBe(201);

            // Second with same key should fail
            const secondResponse = await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 1000,
                    idempotencyKey: idempotencyKey
                });

            expect(secondResponse.status).toBe(409);
        });
    });

    describe('Test 4: Balance aggregation accuracy', () => {
        test('Should accurately calculate balance from multiple ledger entries', async () => {
            // Inject 1000 into account A
            await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 1000,
                    idempotencyKey: 'balance-setup-001'
                });

            // Transfer 300 from A to B
            await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 300,
                    idempotencyKey: 'balance-transfer-001'
                });

            // Transfer 200 from A to B again
            await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 200,
                    idempotencyKey: 'balance-transfer-002'
                });

            // Check balance of account A (should be 1000 - 300 - 200 = 500)
            const responseA = await request(app)
                .get(`/api/accounts/${accountA._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(responseA.status).toBe(200);
            expect(responseA.body.balance).toBe(500);

            // Check balance of account B (should be 300 + 200 = 500)
            const responseB = await request(app)
                .get(`/api/accounts/${accountB._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(responseB.status).toBe(200);
            expect(responseB.body.balance).toBe(500);
        });

        test('Balance should be zero for new account with no transactions', async () => {
            const response = await request(app)
                .get(`/api/accounts/${accountA._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.balance).toBe(0);
        });
    });

    describe('Test 5: Transaction reversals create offsetting entries', () => {
        test('Should create offsetting ledger entries when reversing a transaction', async () => {
            // Fund account A with 1000
            await request(app)
                .post('/api/transactions/initial')
                .set('Authorization', `Bearer ${systemUserToken}`)
                .send({
                    toAccountId: accountA._id.toString(),
                    amount: 1000,
                    idempotencyKey: 'reversal-setup-001'
                });

            // Transfer 400 from A to B
            const transferResponse = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fromAccountId: accountA._id.toString(),
                    toAccountId: accountB._id.toString(),
                    amount: 400,
                    idempotencyKey: 'reversal-transfer-001'
                });

            const originalTransactionId = transferResponse.body.transaction._id;

            // Verify balances before reversal
            // Account A: 1000 - 400 = 600
            // Account B: 0 + 400 = 400
            let balanceA = await request(app)
                .get(`/api/accounts/${accountA._id}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(balanceA.body.balance).toBe(600);

            let balanceB = await request(app)
                .get(`/api/accounts/${accountB._id}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(balanceB.body.balance).toBe(400);

            // Now reverse the transaction
            const reversalResponse = await request(app)
                .post(`/api/transactions/${originalTransactionId}/reverse`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    reason: 'Test reversal',
                    idempotencyKey: 'reversal-001'
                });

            expect(reversalResponse.status).toBe(201);
            expect(reversalResponse.body.message).toMatch(/reversed successfully/i);

            // Verify reversal transaction was created
            const reversalTransactionId = reversalResponse.body.reversalTransaction._id;
            expect(reversalTransactionId).toBeDefined();

            // Verify offsetting ledger entries were created
            const reversalLedgerEntries = await ledgerModel.find({ transactionId: reversalTransactionId });
            expect(reversalLedgerEntries).toHaveLength(2);

            // The reversal should debit B and credit A (opposite of original)
            const reversalDebit = reversalLedgerEntries.find(entry => entry.type === 'debit' && entry.account.toString() === accountB._id.toString());
            const reversalCredit = reversalLedgerEntries.find(entry => entry.type === 'credit' && entry.account.toString() === accountA._id.toString());

            expect(reversalDebit).toBeDefined();
            expect(reversalCredit).toBeDefined();
            expect(reversalDebit.amount).toBe(400);
            expect(reversalCredit.amount).toBe(400);

            // Verify balances are restored
            // Account A: back to 1000
            // Account B: back to 0
            balanceA = await request(app)
                .get(`/api/accounts/${accountA._id}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(balanceA.body.balance).toBe(1000);

            balanceB = await request(app)
                .get(`/api/accounts/${accountB._id}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(balanceB.body.balance).toBe(0);

            // Verify original transaction status changed to 'reversed'
            const originalTransaction = await transactionModel.findById(originalTransactionId);
            expect(originalTransaction.status).toBe('reversed');

            // Verify the ledger is immutable (4 total entries: 2 original + 2 reversal)
            const allLedgerEntries = await ledgerModel.find({
                account: { $in: [accountA._id, accountB._id] }
            });
            expect(allLedgerEntries.length).toBeGreaterThanOrEqual(4); // Initial + transfer + reversal
        });
    });
});
