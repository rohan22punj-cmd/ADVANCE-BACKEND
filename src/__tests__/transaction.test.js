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

describe('money-moving paths', () => {
    let token;
    let sourceAccount;
    let destinationAccount;

    beforeAll(async () => {
        process.env.JWT_SECRET = 'test-secret';
        await connect();
    });

    afterEach(clearDatabase);
    afterAll(closeDatabase);

    beforeEach(async () => {
        const user = await User.create({
            email: 'alice@example.com',
            name: 'Alice',
            password: 'password123'
        });
        const recipient = await User.create({
            email: 'bob@example.com',
            name: 'Bob',
            password: 'password123'
        });
        token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        sourceAccount = await Account.create({ user: user._id, currency: 'USD' });
        destinationAccount = await Account.create({ user: recipient._id, currency: 'USD' });
    });

    async function fundSourceAccount(amount) {
        const funding = await Transaction.create({
            fromAccount: sourceAccount._id,
            toAccount: sourceAccount._id,
            amount,
            status: 'completed',
            idempotencyKey: `seed-${amount}-${Date.now()}`
        });
        await Ledger.create({
            account: sourceAccount._id,
            transaction: funding._id,
            amount,
            type: 'credit'
        });
    }

    function transfer(payload) {
        return request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                fromAccountId: sourceAccount._id.toString(),
                toAccountId: destinationAccount._id.toString(),
                ...payload
            });
    }

    test('creates exactly two balanced ledger entries for a completed transfer', async () => {
        await fundSourceAccount(500);

        const response = await transfer({ amount: 125, idempotencyKey: 'balanced-transfer-001' });

        expect(response.status).toBe(201);
        const entries = await Ledger.find({ transaction: response.body.transaction._id }).lean();
        expect(entries).toHaveLength(2);
        expect(entries.map(entry => entry.type).sort()).toEqual(['credit', 'debit']);
        expect(entries.find(entry => entry.type === 'debit').account.toString()).toBe(sourceAccount._id.toString());
        expect(entries.find(entry => entry.type === 'credit').account.toString()).toBe(destinationAccount._id.toString());
        expect(entries.reduce((total, entry) => total + (entry.type === 'credit' ? entry.amount : -entry.amount), 0)).toBe(0);
    });

    test('rejects a transfer that exceeds the available balance without writing entries', async () => {
        await fundSourceAccount(50);

        const response = await transfer({ amount: 51, idempotencyKey: 'insufficient-funds-001' });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/insufficient funds/i);
        expect(await Ledger.countDocuments({ account: destinationAccount._id })).toBe(0);
        expect(await Transaction.countDocuments({ idempotencyKey: 'insufficient-funds-001' })).toBe(0);
    });

    test('blocks a duplicate idempotency key without duplicating ledger entries', async () => {
        await fundSourceAccount(500);
        const payload = { amount: 100, idempotencyKey: 'duplicate-transfer-001' };

        expect((await transfer(payload)).status).toBe(201);
        const duplicate = await transfer(payload);

        expect(duplicate.status).toBe(409);
        expect(await Transaction.countDocuments({ idempotencyKey: payload.idempotencyKey })).toBe(1);
        expect(await Ledger.countDocuments({ account: destinationAccount._id })).toBe(1);
    });
});
