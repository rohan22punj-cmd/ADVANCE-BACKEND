const mongoose = require('mongoose');
const Account = require('../models/account.model');
const Ledger = require('../models/ledger.model');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const { AppError } = require('../middleware/error.middleware');

async function demoFundAccount(req, res, next) {
    if (process.env.NODE_ENV === 'production') return next(new AppError('Not found', 404));

    try {
        const { accountId, amount = 1000 } = req.body;
        const destination = await Account.findOne({ _id: accountId, user: req.user._id });
        if (!destination) return next(new AppError('Account not found', 404));
        if (destination.status !== 'active') return next(new AppError('Only active accounts can be funded', 400));

        let systemUser = await User.findOne({ email: 'demo-funding@ledgerline.local' });
        if (!systemUser) {
            systemUser = await User.create({ email: 'demo-funding@ledgerline.local', name: 'Demo Funding', password: 'demo-funding-password', systemUser: true });
        }
        let source = await Account.findOne({ user: systemUser._id, currency: destination.currency });
        if (!source) source = await Account.create({ user: systemUser._id, currency: destination.currency });

        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const [transaction] = await Transaction.create([{
                fromAccount: source._id, toAccount: destination._id, amount: Number(amount), status: 'completed',
                idempotencyKey: `demo-fund-${new mongoose.Types.ObjectId()}`
            }], { session });
            await Ledger.create([
                { account: source._id, transaction: transaction._id, amount: Number(amount), type: 'debit' },
                { account: destination._id, transaction: transaction._id, amount: Number(amount), type: 'credit' }
            ], { session, ordered: true });
            await session.commitTransaction();
            res.status(201).json({ message: 'Demo funds added', transaction });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally { await session.endSession(); }
    } catch (error) { next(error); }
}

module.exports = { demoFundAccount };
