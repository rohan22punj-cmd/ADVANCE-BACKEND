const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");
const emailService = require("../service/GmailService");

/**
 * Account-to-Account Money Transfer
 * Executes a double-entry financial transfer within an ACID MongoDB session
 */
async function createTransaction(req, res) {
    const { fromAccountId, toAccountId, amount, idempotencyKey } = req.body;

    try {
        // ==========================================
        // 1. PRE-DB INPUT VALIDATION
        // ==========================================
        if (!fromAccountId || !toAccountId || !amount || !idempotencyKey) {
            return res.status(400).json({
                message: "Missing required fields: fromAccountId, toAccountId, amount, and idempotencyKey are required"
            });
        }

        // Validate amount is a positive number
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number greater than zero" });
        }

        // Prevent transferring to the exact same account
        if (fromAccountId.toString() === toAccountId.toString()) {
            return res.status(400).json({ message: "Cannot transfer funds to the same account" });
        }

        // Validate MongoDB ObjectIds format
        if (!mongoose.Types.ObjectId.isValid(fromAccountId) || !mongoose.Types.ObjectId.isValid(toAccountId)) {
            return res.status(400).json({ message: "Invalid account ID format" });
        }

        // ==========================================
        // 2. IDEMPOTENCY CHECK
        // ==========================================
        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            return res.status(409).json({
                message: "Transaction already processed with this idempotency key",
                transaction: existingTransaction
            });
        }

        // ==========================================
        // 3. ACCOUNT VERIFICATION & AUTHORIZATION
        // ==========================================
        // Sender account must exist and belong to the authenticated user
        const fromAccount = await accountModel.findOne({
            _id: fromAccountId,
            user: req.user._id
        }).populate('user', 'name email');

        if (!fromAccount) {
            return res.status(404).json({ message: "Source account not found or does not belong to you" });
        }

        if (fromAccount.status !== 'active') {
            return res.status(400).json({ message: `Source account is ${fromAccount.status} and cannot initiate transfers` });
        }

        // Destination account must exist
        const toAccount = await accountModel.findById(toAccountId).populate('user', 'name email');
        if (!toAccount) {
            return res.status(404).json({ message: "Destination account not found" });
        }

        if (toAccount.status !== 'active') {
            return res.status(400).json({ message: `Destination account is ${toAccount.status} and cannot receive transfers` });
        }

        // Ensure both accounts use the same currency
        if (fromAccount.currency !== toAccount.currency) {
            return res.status(400).json({
                message: `Currency mismatch: source account is in ${fromAccount.currency} but destination is in ${toAccount.currency}`
            });
        }

        // ==========================================
        // 4. PRE-TRANSACTION BALANCE CHECK (LEDGER AGGREGATION)
        // ==========================================
        const balanceAgg = await ledgerModel.aggregate([
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
        ]);

        const currentBalance = balanceAgg.length > 0 ? balanceAgg[0].balance : 0;

        if (currentBalance < numericAmount) {
            // Send failure notification email
            if (fromAccount.user?.email) {
                emailService.failureNotificationEmail(
                    fromAccount.user.email,
                    fromAccount.user.name,
                    `Insufficient funds. You attempted to send ${numericAmount} ${fromAccount.currency} but your current balance is ${currentBalance} ${fromAccount.currency}.`
                ).catch(err => console.error("Failure email failed:", err.message));
            }

            return res.status(400).json({
                message: "Insufficient funds",
                currentBalance,
                requestedAmount: numericAmount,
                currency: fromAccount.currency
            });
        }

        // ==========================================
        // 5. ACID TRANSACTION EXECUTION (MONGODB SESSION)
        // ==========================================
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Step A: Create transaction journal entry with status "pending"
            const transactionDocs = await transactionModel.create([{
                fromAccount: fromAccount._id,
                toAccount: toAccount._id,
                status: "pending",
                amount: numericAmount,
                idempotencyKey,
            }], { session });

            const transaction = transactionDocs[0];

            // Step B: Write DEBIT ledger entry for sender account
            await ledgerModel.create([{
                account: fromAccount._id,
                amount: numericAmount,
                transaction: transaction._id,
                type: 'debit',
            }], { session });

            // Step C: Write CREDIT ledger entry for recipient account
            await ledgerModel.create([{
                account: toAccount._id,
                amount: numericAmount,
                transaction: transaction._id,
                type: 'credit',
            }], { session });

            // Step D: Update transaction status to "completed"
            transaction.status = 'completed';
            await transaction.save({ session });

            // Step E: Commit the entire atomic transaction
            await session.commitTransaction();
            session.endSession();

            // Step F: Send email notification asynchronously (non-blocking)
            if (fromAccount.user?.email) {
                emailService.sendTransactionEmail(
                    fromAccount.user.email,
                    fromAccount.user.name,
                    `Sent ${numericAmount} ${fromAccount.currency} to account ${toAccount._id}. Transaction ID: ${transaction._id}`
                ).catch(err => console.error("Email notification failed:", err.message));
            }

            return res.status(201).json({
                message: "Transaction completed successfully",
                transaction
            });

        } catch (error) {
            // Roll back all writes made in this session if anything fails
            await session.abortTransaction();
            session.endSession();

            // Send failure notification email
            if (fromAccount.user?.email) {
                emailService.failureNotificationEmail(
                    fromAccount.user.email,
                    fromAccount.user.name,
                    `Transaction failed: ${error.message}. Amount: ${numericAmount} ${fromAccount.currency}. Please contact support if this issue persists.`
                ).catch(err => console.error("Failure email failed:", err.message));
            }

            throw error;
        }

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Transaction failed"
        });
    }
}

/**
 * System User Initial Funds Injection
 * Injects initial funds from a system user into any user account
 */
async function createInitialfundsTransaction(req, res) {
    const { toAccountId, amount, idempotencyKey } = req.body;

    try {
        // Pre-DB Input Validation
        if (!toAccountId || !amount || !idempotencyKey) {
            return res.status(400).json({ message: "Missing required fields: toAccountId, amount, and idempotencyKey are required" });
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number greater than zero" });
        }

        if (!mongoose.Types.ObjectId.isValid(toAccountId)) {
            return res.status(400).json({ message: "Invalid destination account ID format" });
        }

        // Idempotency check
        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            return res.status(409).json({
                message: "Transaction already processed with this idempotency key",
                transaction: existingTransaction
            });
        }

        // Find recipient account
        const toAccount = await accountModel.findById(toAccountId);
        if (!toAccount) {
            return res.status(404).json({ message: "Destination account not found" });
        }

        // Find system user's account
        const fromUserAccount = await accountModel.findOne({ user: req.user._id });
        if (!fromUserAccount) {
            return res.status(404).json({ message: "System user account not found" });
        }

        // Start ACID Transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transactionDocs = await transactionModel.create([{
                fromAccount: fromUserAccount._id,
                toAccount: toAccount._id,
                status: "pending",
                amount: numericAmount,
                idempotencyKey,
            }], { session });

            const transaction = transactionDocs[0];

            await ledgerModel.create([{
                account: fromUserAccount._id,
                amount: numericAmount,
                transaction: transaction._id,
                type: 'debit',
            }], { session });

            await ledgerModel.create([{
                account: toAccount._id,
                amount: numericAmount,
                transaction: transaction._id,
                type: 'credit',
            }], { session });

            transaction.status = 'completed';
            await transaction.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: "Initial funds injected successfully",
                transaction
            });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Initial funds transaction failed"
        });
    }
}

/**
 * Get Transaction History with Pagination and Filtering
 * Returns paginated list of transactions for the authenticated user's accounts
 */
async function getTransactionHistory(req, res) {
    try {
        const { page, limit, status, startDate, endDate, accountId } = req.query;

        // Get all accounts owned by the authenticated user
        const userAccounts = await accountModel.find({ user: req.user._id }).select('_id');
        const userAccountIds = userAccounts.map(acc => acc._id);

        if (userAccountIds.length === 0) {
            return res.status(200).json({
                transactions: [],
                pagination: {
                    page: page || 1,
                    limit: limit || 10,
                    total: 0,
                    totalPages: 0
                }
            });
        }

        // Build query filter
        const filter = {
            $or: [
                { fromAccount: { $in: userAccountIds } },
                { toAccount: { $in: userAccountIds } }
            ]
        };

        // Filter by specific account if provided
        if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
            // Check if this account belongs to the user
            if (!userAccountIds.some(id => id.toString() === accountId)) {
                return res.status(403).json({ message: 'Access denied to this account' });
            }
            filter.$or = [
                { fromAccount: new mongoose.Types.ObjectId(accountId) },
                { toAccount: new mongoose.Types.ObjectId(accountId) }
            ];
        }

        // Filter by status if provided
        if (status) {
            filter.status = status;
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add one day to include the entire end date
                const endDateTime = new Date(endDate);
                endDateTime.setDate(endDateTime.getDate() + 1);
                filter.createdAt.$lt = endDateTime;
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [transactions, totalCount] = await Promise.all([
            transactionModel
                .find(filter)
                .populate('fromAccount', 'currency status')
                .populate('toAccount', 'currency status')
                .sort({ createdAt: -1 }) // Most recent first
                .skip(skip)
                .limit(limit)
                .lean(),
            transactionModel.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return res.status(200).json({
            transactions,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Failed to retrieve transaction history"
        });
    }
}

/**
 * Reverse a Completed Transaction
 * Creates offsetting ledger entries to reverse a completed transaction
 */
async function reverseTransaction(req, res) {
    const { transactionId } = req.params;
    const { reason, idempotencyKey } = req.body;

    try {
        // Validate transaction ID format
        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({ message: "Invalid transaction ID format" });
        }

        // Check for duplicate reversal idempotency key
        const existingReversal = await transactionModel.findOne({ idempotencyKey });
        if (existingReversal) {
            return res.status(409).json({
                message: "Reversal already processed with this idempotency key",
                transaction: existingReversal
            });
        }

        // Find the original transaction
        const originalTransaction = await transactionModel.findById(transactionId)
            .populate('fromAccount')
            .populate('toAccount');

        if (!originalTransaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // Authorization: User must be the sender OR a system user
        const isAuthorized =
            originalTransaction.fromAccount.user.toString() === req.user._id.toString() ||
            req.user.systemUser === true;

        if (!isAuthorized) {
            return res.status(403).json({
                message: "Forbidden: You can only reverse transactions you initiated"
            });
        }

        // Validate transaction status
        if (originalTransaction.status !== 'completed') {
            return res.status(400).json({
                message: `Cannot reverse transaction with status '${originalTransaction.status}'. Only 'completed' transactions can be reversed.`
            });
        }

        // Populate full account details with user info
        await originalTransaction.fromAccount.populate('user', 'name email');
        await originalTransaction.toAccount.populate('user', 'name email');

        // Check if destination account (who received funds) has sufficient balance to be debited
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
            return res.status(400).json({
                message: "Cannot reverse: destination account has insufficient funds for reversal",
                requiredAmount: originalTransaction.amount,
                currentBalance,
                currency: originalTransaction.toAccount.currency
            });
        }

        // Start ACID Transaction for Reversal
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create reversal transaction record
            const reversalDocs = await transactionModel.create([{
                fromAccount: originalTransaction.toAccount._id,  // Reversed direction
                toAccount: originalTransaction.fromAccount._id,  // Reversed direction
                status: "pending",
                amount: originalTransaction.amount,
                idempotencyKey,
            }], { session });

            const reversalTransaction = reversalDocs[0];

            // Create offsetting ledger entries
            // Debit the account that originally received funds
            await ledgerModel.create([{
                account: originalTransaction.toAccount._id,
                amount: originalTransaction.amount,
                transaction: reversalTransaction._id,
                type: 'debit',
            }], { session });

            // Credit the account that originally sent funds
            await ledgerModel.create([{
                account: originalTransaction.fromAccount._id,
                amount: originalTransaction.amount,
                transaction: reversalTransaction._id,
                type: 'credit',
            }], { session });

            // Mark reversal transaction as completed
            reversalTransaction.status = 'completed';
            await reversalTransaction.save({ session });

            // Mark original transaction as reversed
            originalTransaction.status = 'reversed';
            await originalTransaction.save({ session });

            // Commit the reversal
            await session.commitTransaction();
            session.endSession();

            // Send email notifications
            if (originalTransaction.fromAccount.user?.email) {
                emailService.sendTransactionEmail(
                    originalTransaction.fromAccount.user.email,
                    originalTransaction.fromAccount.user.name,
                    `Transaction reversed: ${originalTransaction.amount} ${originalTransaction.fromAccount.currency} has been returned to your account. Reason: ${reason}. Reversal ID: ${reversalTransaction._id}`
                ).catch(err => console.error("Reversal email failed:", err.message));
            }

            if (originalTransaction.toAccount.user?.email) {
                emailService.sendTransactionEmail(
                    originalTransaction.toAccount.user.email,
                    originalTransaction.toAccount.user.name,
                    `Transaction reversed: ${originalTransaction.amount} ${originalTransaction.toAccount.currency} has been debited from your account. Reason: ${reason}. Reversal ID: ${reversalTransaction._id}`
                ).catch(err => console.error("Reversal email failed:", err.message));
            }

            return res.status(201).json({
                message: "Transaction reversed successfully",
                originalTransaction,
                reversalTransaction,
                reason
            });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Transaction reversal failed"
        });
    }
}

module.exports = {
    createTransaction,
    createInitialfundsTransaction,
    getTransactionHistory,
    reverseTransaction
};
