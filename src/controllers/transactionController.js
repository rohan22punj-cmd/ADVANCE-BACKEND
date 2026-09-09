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

module.exports = {
    createTransaction,
    createInitialfundsTransaction
};
