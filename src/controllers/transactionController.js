const mongoose = require('mongoose');
const accountModel = require('../models/account.model');
const ledgerModel = require('../models/ledger.model');
const transactionModel = require('../models/transaction.model');
const redisService = require('../service/redis.service');
const emailService = require('../service/GmailService');
const crypto = require('crypto');
const { AppError } = require('../middleware/error.middleware');

function notify(send) {
    Promise.resolve().then(send).catch(() => undefined);
}

async function logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, reason, userId) {
    try {
        await transactionModel.create([{
            fromAccount: fromAccountId,
            toAccount: toAccountId,
            amount: Number(amount),
            status: 'failed',
            idempotencyKey,
            failureReason: reason
        }]);
    } catch (e) {
        // If we can't even log the failure (e.g. duplicate idempotencyKey), just silently ignore
        // The original error will still be returned to the client
    }
}

/**
 * Account‑to‑Account Money Transfer
 * Executes a double‑entry financial transfer protected by Redis Distributed Locks and MongoDB ACID Transactions
 */
async function createTransaction(req, res, next) {
    const { fromAccountId, toAccountId, amount, idempotencyKey } = req.body;
    let multiLock = null;
    let idempotencyClaimed = false;

    try {
        // 1. PRE‑DB INPUT VALIDATION
        if (!fromAccountId || !toAccountId || !amount || !idempotencyKey) {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Missing required fields', req.user._id);
            return res.status(400).json({ message: "Missing required fields: fromAccountId, toAccountId, amount, and idempotencyKey are required" });
        }
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Invalid amount (must be positive number)', req.user._id);
            return res.status(400).json({ message: "Amount must be a positive number greater than zero" });
        }
        // Normalize IDs before comparison (trim whitespace, lowercase)
        const normFrom = fromAccountId.toString().trim().toLowerCase();
        const normTo = toAccountId.toString().trim().toLowerCase();
        if (normFrom === normTo) {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Cannot transfer to same account', req.user._id);
            return res.status(400).json({ message: "Cannot transfer funds to the same account" });
        }
        if (!mongoose.Types.ObjectId.isValid(fromAccountId) || !mongoose.Types.ObjectId.isValid(toAccountId)) {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Invalid account ID format', req.user._id);
            return res.status(400).json({ message: "Invalid account ID format" });
        }

        // 2. FAST REDIS IDEMPOTENCY CHECK
        const redisIdempotency = await redisService.checkIdempotency(idempotencyKey);
        if (redisIdempotency.status === 'COMPLETED') {
            return res.status(200).json({ message: "Transaction already processed (cached)", transaction: redisIdempotency.data ?.transaction || redisIdempotency.data });
        }
        if (redisIdempotency.status === 'IN_PROGRESS') {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Duplicate idempotency key (in progress)', req.user._id);
            return res.status(409).json({ message: "A transaction with this idempotency key is currently being processed" });
        }
        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            await redisService.setIdempotencyCompleted(idempotencyKey, { transaction: existingTransaction });
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Duplicate idempotency key (already processed)', req.user._id);
            return res.status(409).json({ message: "Transaction already processed with this idempotency key", transaction: existingTransaction });
        }
        idempotencyClaimed = await redisService.setIdempotencyProcessing(idempotencyKey, 60);
        if (!idempotencyClaimed) {
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Duplicate idempotency key (concurrent)', req.user._id);
            return res.status(409).json({ message: "A transaction with this idempotency key is currently being processed" });
        }

        // 3. REDIS DISTRIBUTED LOCK ACQUISITION
        const accountLockKeys = [`lock:account:${fromAccountId}`, `lock:account:${toAccountId}`];
        multiLock = await redisService.acquireMultiLock(accountLockKeys, 8000);
        if (!multiLock.acquired) {
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Could not acquire lock (account busy)', req.user._id);
            return res.status(429).json({ message: "Accounts are currently processing another transaction. Please try again shortly." });
        }

        // 4. ACCOUNT VERIFICATION & AUTHORIZATION
        const fromAccount = await accountModel.findOne({ _id: fromAccountId, user: req.user._id }).populate('user', 'name email');
        if (!fromAccount) {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Source account not found or not owned by user', req.user._id);
            return res.status(404).json({ message: "Source account not found or does not belong to you" });
        }
        if (fromAccount.status !== 'active') {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, `Source account is ${fromAccount.status}`, req.user._id);
            return res.status(400).json({ message: `Source account is ${fromAccount.status} and cannot initiate transfers` });
        }
        const toAccount = await accountModel.findById(toAccountId).populate('user', 'name email');
        if (!toAccount) {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, 'Destination account not found', req.user._id);
            return res.status(404).json({ message: "Destination account not found" });
        }
        if (toAccount.status !== 'active') {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, `Destination account is ${toAccount.status}`, req.user._id);
            return res.status(400).json({ message: `Destination account is ${toAccount.status} and cannot receive transfers` });
        }
        if (fromAccount.currency !== toAccount.currency) {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, `Currency mismatch: ${fromAccount.currency} vs ${toAccount.currency}`, req.user._id);
            return res.status(400).json({ message: `Currency mismatch: source ${fromAccount.currency} vs destination ${toAccount.currency}` });
        }

        // 5. PRE‑TRANSACTION BALANCE CHECK
        const balanceAgg = await ledgerModel.aggregate([
            { $match: { account: fromAccount._id } },
            { $group: { _id: null, balance: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", { $multiply: ["$amount", -1] }] } } } }
        ]);
        const currentBalance = balanceAgg.length ? balanceAgg[0].balance : 0;
        if (currentBalance < numericAmount) {
            await multiLock.releaseAll();
            await redisService.clearIdempotency(idempotencyKey);
            if (fromAccount.user ?.email) {
                notify(() => emailService.failureNotificationEmail(fromAccount.user.email, fromAccount.user.name, `Insufficient funds. You attempted to send ${numericAmount} ${fromAccount.currency} but your balance is ${currentBalance} ${fromAccount.currency}.`));
            }
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, `Insufficient funds: balance ${currentBalance} < requested ${numericAmount}`, req.user._id);
            return res.status(400).json({ message: "Insufficient funds", currentBalance, requestedAmount: numericAmount, currency: fromAccount.currency });
        }

        // 6. ACID TRANSACTION EXECUTION (MONGODB SESSION)
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const lockedSource = await accountModel.findOneAndUpdate({ _id: fromAccount._id, status: 'active' }, { $inc: { version: 1 } }, { session, returnDocument: 'after' });
            if (!lockedSource) throw new Error("Source account is no longer active or available");
            const txBalanceAgg = await ledgerModel.aggregate([
                { $match: { account: fromAccount._id } },
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
            const txBalance = txBalanceAgg.length ? txBalanceAgg[0].balance : 0;
            if (txBalance < numericAmount) throw new Error(`Insufficient funds: available ${txBalance} ${fromAccount.currency}`);

            const transactionDocs = await transactionModel.create([{ fromAccount: fromAccount._id, toAccount: toAccount._id, status: "pending", amount: numericAmount, idempotencyKey }], { session });
            const transaction = transactionDocs[0];
            await ledgerModel.create([{ account: fromAccount._id, amount: numericAmount, transaction: transaction._id, type: 'debit' }], { session });
            await ledgerModel.create([{ account: toAccount._id, amount: numericAmount, transaction: transaction._id, type: 'credit' }], { session });
            transaction.status = 'completed';
            await transaction.save({ session });
            await session.commitTransaction();
            session.endSession();
            await redisService.setIdempotencyCompleted(idempotencyKey, { transaction });
            if (multiLock) {
                await multiLock.releaseAll();
                multiLock = null;
            }
            if (fromAccount.user ?.email) {
                notify(() => emailService.sendTransactionEmail(fromAccount.user.email, fromAccount.user.name, `Sent ${numericAmount} ${fromAccount.currency} to account ${toAccount._id}. Tx ID: ${transaction._id}`));
            }
            return res.status(201).json({ message: "Transaction completed successfully", transaction });
        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            await redisService.clearIdempotency(idempotencyKey);
            if (multiLock) {
                await multiLock.releaseAll();
                multiLock = null;
            }
            if (fromAccount.user ?.email) {
                notify(() => emailService.failureNotificationEmail(fromAccount.user.email, fromAccount.user.name, `Transaction failed: ${e.message}. Amount: ${numericAmount} ${fromAccount.currency}.`));
            }
            // Log the in-session failure as a separate failed transaction
            await logFailedTransaction(fromAccountId, toAccountId, amount, idempotencyKey, e.message, req.user._id);
            throw e;
        }
    } catch (e) {
        if (multiLock) await multiLock.releaseAll().catch(() => {});
        await redisService.clearIdempotency(idempotencyKey).catch(() => {});
        next(e);
    }
}

/** System User Initial Funds Injection */
async function createInitialfundsTransaction(req, res, next) {
    const { toAccountId, amount, idempotencyKey } = req.body;
    try {
        if (!toAccountId || !amount || !idempotencyKey) return res.status(400).json({ message: "Missing toAccountId, amount, idempotencyKey" });
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: "Amount must be > 0" });
        if (!mongoose.Types.ObjectId.isValid(toAccountId)) return res.status(400).json({ message: "Invalid toAccountId" });
        const existing = await transactionModel.findOne({ idempotencyKey });
        if (existing) return res.status(409).json({ message: "Already processed", transaction: existing });
        const toAccount = await accountModel.findById(toAccountId);
        if (!toAccount) return res.status(404).json({ message: "Destination account not found" });
        let fromUserAccount = await accountModel.findOne({ user: req.user._id, currency: toAccount.currency });
        if (!fromUserAccount) fromUserAccount = await accountModel.create({ user: req.user._id, currency: toAccount.currency });
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const txDocs = await transactionModel.create([{ fromAccount: fromUserAccount._id, toAccount: toAccount._id, status: "pending", amount: numericAmount, idempotencyKey }], { session });
            const tx = txDocs[0];
            await ledgerModel.create([{ account: fromUserAccount._id, amount: numericAmount, transaction: tx._id, type: 'debit' }], { session });
            await ledgerModel.create([{ account: toAccount._id, amount: numericAmount, transaction: tx._id, type: 'credit' }], { session });
            tx.status = 'completed';
            await tx.save({ session });
            await session.commitTransaction();
            session.endSession();
            return res.status(201).json({ message: "Initial funds injected", transaction: tx });
        } catch (e) {
            await session.abortTransaction();
            session.endSession();
            throw e;
        }
    } catch (e) { next(e); }
}

/** Get Transaction History with Pagination & Filtering */
async function getTransactionHistory(req, res, next) {
    try {
        const { page = 1, limit = 20, status, startDate, endDate, accountId, minAmount, maxAmount, type, search } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const userAccounts = await require('../models/account.model').find({ user: req.user._id }).select('_id');
        const userAccountIds = userAccounts.map(a => a._id);
        if (!userAccountIds.length) return res.json({ transactions: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } });
        const filter = { $or: [{ fromAccount: { $in: userAccountIds } }, { toAccount: { $in: userAccountIds } }] };
        if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
            if (!userAccountIds.some(id => id.toString() === accountId.toString())) return res.status(403).json({ message: 'Access denied' });
            filter.$or = [{ fromAccount: new mongoose.Types.ObjectId(accountId) }, { toAccount: new mongoose.Types.ObjectId(accountId) }];
        }
        if (status) filter.status = status;
        if (minAmount !== undefined || maxAmount !== undefined) {
            filter.amount = {};
            if (minAmount !== undefined) filter.amount.$gte = Number(minAmount);
            if (maxAmount !== undefined) filter.amount.$lte = Number(maxAmount);
        }
        if (type && req.user.role !== 'admin') {
            if (type === 'incoming') {
                filter.toAccount = { $in: userAccountIds };
                delete filter.$or;
            } else if (type === 'outgoing') {
                filter.fromAccount = { $in: userAccountIds };
                delete filter.$or;
            }
        }
        if (search ?.trim()) {
            const term = search.trim();
            const isAdmin = req.user.role === 'admin';
            const accountQuery = isAdmin ? {} : { user: { $in: userAccountIds } };
            // NOTE: matching `term` against `_id` with $regex is unreliable since _id is
            // an ObjectId, not a string — this only works if `term` happens to be a valid
            // ObjectId substring. If you want to search by account number/name, this needs
            // to target the actual searchable field on the account schema instead of _id.
            const counterpartAccounts = await require('../models/account.model').find({ $and: [accountQuery, { _id: { $regex: term, $options: 'i' } }] }).select('_id').lean();
            const counterpartIds = counterpartAccounts.map(a => a._id);
            if (counterpartIds.length) {
                filter.$or = [{ fromAccount: { $in: counterpartIds } }, { toAccount: { $in: counterpartIds } }];
            } else {
                filter._id = { $exists: false };
            }
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const ed = new Date(endDate);
                if (endDate.length <= 10) {
                    ed.setDate(ed.getDate() + 1);
                    filter.createdAt.$lt = ed;
                } else filter.createdAt.$lte = ed;
            }
        }
        const skip = (pageNum - 1) * limitNum;
        const [transactions, total] = await Promise.all([
            require('../models/transaction.model').find(filter).populate('fromAccount', 'currency status user').populate('toAccount', 'currency status user').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
            require('../models/transaction.model').countDocuments(filter)
        ]);
        const totalPages = Math.ceil(total / limitNum);
        return res.json({ transactions, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 } });
    } catch (e) { next(e); }
}

/** User-Initiated Transaction Reversal */
async function reverseTransaction(req, res, next) {
    try {
        const { id } = req.params;
        const { reason, idempotencyKey } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid transaction ID format' });
        }
        if (!reason || !idempotencyKey) {
            return res.status(400).json({ message: 'reason and idempotencyKey are required' });
        }

        const originalTransaction = await transactionModel.findById(id)
            .populate('fromAccount')
            .populate('toAccount');

        if (!originalTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const userAccounts = await accountModel.find({ user: req.user._id }).select('_id');
        const userAccountIds = userAccounts.map(a => a._id.toString());

        const fromAccountId = originalTransaction.fromAccount._id.toString();
        const toAccountId = originalTransaction.toAccount._id.toString();

        if (!userAccountIds.includes(fromAccountId) && !userAccountIds.includes(toAccountId)) {
            return res.status(403).json({ message: 'Not authorized to reverse this transaction' });
        }

        if (originalTransaction.status !== 'completed') {
            return res.status(400).json({ message: `Cannot reverse transaction with status '${originalTransaction.status}'` });
        }
        if (originalTransaction.status === 'reversed') {
            return res.status(400).json({ message: 'Transaction already reversed' });
        }

        const originalLedger = await ledgerModel.find({ transaction: originalTransaction._id });
        if (originalLedger.length !== 2) {
            return res.status(400).json({ message: 'Original transaction ledger entries are inconsistent – manual review required' });
        }

        const redisService = require('../service/redis.service');
        const accountLockKeys = [
            `lock:account:${fromAccountId}`,
            `lock:account:${toAccountId}`
        ];
        const multiLock = await redisService.acquireMultiLock(accountLockKeys, 8000);
        if (!multiLock.acquired) {
            return res.status(429).json({ message: 'Accounts are currently busy processing another transfer. Please retry shortly.' });
        }

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

            res.status(201).json({ message: 'Transaction reversed successfully', originalTransaction, reversalTransaction, reason });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            await multiLock.releaseAll();
            throw err;
        }
    } catch (err) {
        next(err);
    }
}

module.exports = { createTransaction, createInitialfundsTransaction, getTransactionHistory, reverseTransaction };