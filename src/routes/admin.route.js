const express = require('express');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transactionController');
const accountModel = require('../models/account.model');
const ledgerModel = require('../models/ledger.model');
const transactionModel = require('../models/transaction.model');
const { AppError } = require('../middleware/error.middleware');
const mongoose = require('mongoose');

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin);

// GET /admin/accounts - list all accounts with balance
router.get('/accounts', async (req, res, next) => {
    try {
        const accounts = await accountModel.find().populate('user', 'name email');
        const accountsWithBalance = await Promise.all(accounts.map(async (acc) => {
            const balanceAgg = await ledgerModel.aggregate([
                { $match: { account: acc._id } },
                {
                    $group: {
                        _id: null,
                        balance: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$type", "credit"] },
                                    "$amount",
                                    { $multiply: ["$amount", -1] }
                                ]
                            }
                        }
                    }
                }
            ]);
            const balance = balanceAgg.length > 0 ? balanceAgg[0].balance : 0;
            return {
                _id: acc._id,
                user: acc.user,
                currency: acc.currency,
                status: acc.status,
                balance,
                createdAt: acc.createdAt
            };
        }));
        res.json({ accounts: accountsWithBalance });
    } catch (err) {
        next(err);
    }
});

// GET /admin/transactions - list all transactions with filters
router.get('/transactions', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, startDate, endDate, minAmount, maxAmount } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const filter = {};

        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        if (minAmount || maxAmount) {
            filter.amount = {};
            if (minAmount) filter.amount.$gte = Number(minAmount);
            if (maxAmount) filter.amount.$lte = Number(maxAmount);
        }

        const skip = (pageNum - 1) * limitNum;
        const [transactions, total] = await Promise.all([
            transactionModel.find(filter)
                .populate('fromAccount', 'currency status user')
                .populate('toAccount', 'currency status user')
                .populate('fromAccount.user', 'name email')
                .populate('toAccount.user', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            transactionModel.countDocuments(filter)
        ]);

        res.json({
            transactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasNextPage: pageNum < Math.ceil(total / limitNum),
                hasPrevPage: pageNum > 1
            }
        });
    } catch (err) {
        next(err);
    }
});

// POST /admin/transactions/:id/reverse - admin force reverse
router.post('/transactions/:id/reverse', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason, idempotencyKey } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid transaction ID format' });
        }
        if (!reason || !idempotencyKey) {
            return res.status(400).json({ message: 'reason and idempotencyKey are required' });
        }

        // reuse existing reversal logic but bypass owner check
        // We'll call the internal reversal function logic here (duplicate minimal)
        const originalTransaction = await transactionModel.findById(id)
            .populate('fromAccount')
            .populate('toAccount');

        if (!originalTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        if (originalTransaction.status !== 'completed') {
            return res.status(400).json({ message: `Cannot reverse transaction with status '${originalTransaction.status}'` });
        }
        if (originalTransaction.status === 'reversed') {
            return res.status(400).json({ message: 'Transaction already reversed' });
        }

        // verify ledger legs
        const originalLedger = await ledgerModel.find({ transaction: originalTransaction._id });
        if (originalLedger.length !== 2) {
            return res.status(400).json({ message: 'Original transaction ledger entries are inconsistent – manual review required' });
        }

        // acquire locks
        const redisService = require('../service/redis.service');
        const accountLockKeys = [
            `lock:account:${originalTransaction.fromAccount._id}`,
            `lock:account:${originalTransaction.toAccount._id}`
        ];
        const multiLock = await redisService.acquireMultiLock(accountLockKeys, 8000);
        if (!multiLock.acquired) {
            return res.status(429).json({ message: 'Accounts are currently busy processing another transfer. Please retry shortly.' });
        }

        // check receiver balance for reversal
        const balanceAgg = await ledgerModel.aggregate([
            { $match: { account: originalTransaction.toAccount._id } },
            {
                $group: {
                    _id: null,
                    balance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "credit"] },
                                "$amount",
                                { $multiply: ["$amount", -1] }
                            ]
                        }
                    }
                }
            }
        ]);
        const currentBalance = balanceAgg.length > 0 ? balanceAgg[0].balance : 0;
        if (currentBalance < originalTransaction.amount) {
            await multiLock.releaseAll();
            return res.status(400).json({ message: 'Cannot reverse: destination account has insufficient funds for reversal', requiredAmount: originalTransaction.amount, currentBalance, currency: originalTransaction.toAccount.currency });
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const lockedDebitAccount = await accountModel.findOneAndUpdate(
                { _id: originalTransaction.toAccount._id, status: 'active' },
                { $inc: { version: 1 } },
                { session, returnDocument: 'after' }
            );
            if (!lockedDebitAccount) throw new Error('Target account for reversal is no longer active');

            const txBalanceAgg = await ledgerModel.aggregate([
                { $match: { account: originalTransaction.toAccount._id } },
                {
                    $group: {
                        _id: null,
                        balance: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$type", "credit"] },
                                    "$amount",
                                    { $multiply: ["$amount", -1] }
                                ]
                            }
                        }
                    }
                }
            ]).session(session);
            const txBalance = txBalanceAgg.length > 0 ? txBalanceAgg[0].balance : 0;
            if (txBalance < originalTransaction.amount) throw new Error(`Insufficient funds for reversal: required ${originalTransaction.amount}, available ${txBalance}`);

            // verify ledger legs inside session
            const sessionLedger = await ledgerModel.find({ transaction: originalTransaction._id }).session(session);
            if (sessionLedger.length !== 2) throw new Error('Original transaction ledger entries are inconsistent – manual review required');

            const reversalDocs = await transactionModel.create([{
                fromAccount: originalTransaction.toAccount._id,
                toAccount: originalTransaction.fromAccount._id,
                status: "pending",
                amount: originalTransaction.amount,
                idempotencyKey,
            }], { session });
            const reversalTransaction = reversalDocs[0];

            await ledgerModel.create([{
                account: originalTransaction.toAccount._id,
                amount: originalTransaction.amount,
                transaction: reversalTransaction._id,
                type: 'debit',
            }], { session });

            await ledgerModel.create([{
                account: originalTransaction.fromAccount._id,
                amount: originalTransaction.amount,
                transaction: reversalTransaction._id,
                type: 'credit',
            }], { session });

            reversalTransaction.status = 'completed';
            await reversalTransaction.save({ session });

            originalTransaction.status = 'reversed';
            await originalTransaction.save({ session });

            await session.commitTransaction();
            session.endSession();

            await multiLock.releaseAll();

            res.status(201).json({ message: 'Transaction reversed successfully by admin', originalTransaction, reversalTransaction, reason });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            await multiLock.releaseAll();
            throw err;
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;