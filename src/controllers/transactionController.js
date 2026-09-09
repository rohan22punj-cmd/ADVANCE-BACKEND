const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");


async function createTransaction(req, res) {
    const { fromAccountId, toAccountId, amount, idempotencyKey } = req.body;

    try {
        // Validate inputs
        if (!fromAccountId || !toAccountId || !amount || !idempotencyKey) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        // Check for duplicate idempotency key
        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            return res.status(409).json({
                message: "Transaction already processed",
                transaction: existingTransaction
            });
        }

        // Find both accounts
        const fromAccount = await accountModel.findOne({
            _id: fromAccountId,
            user: req.user._id
        });

        if (!fromAccount) {
            return res.status(404).json({ message: "Source account not found or unauthorized" });
        }

        const toAccount = await accountModel.findById(toAccountId);
        if (!toAccount) {
            return res.status(404).json({ message: "Destination account not found" });
        }

        // Check if accounts have the same currency
        if (fromAccount.currency !== toAccount.currency) {
            return res.status(400).json({ message: "Currency mismatch between accounts" });
        }

        // Calculate current balance of fromAccount
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

        if (currentBalance < amount) {
            return res.status(400).json({
                message: "Insufficient funds",
                currentBalance,
                requestedAmount: amount
            });
        }

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create transaction record
            const transaction = await transactionModel.create([{
                fromAccount: fromAccount._id,
                toAccount: toAccount._id,
                status: "pending",
                amount,
                idempotencyKey,
            }], { session });

            // Create debit ledger entry (withdraw from source)
            await ledgerModel.create([{
                account: fromAccount._id,
                amount,
                transaction: transaction[0]._id,
                type: 'debit',
            }], { session });

            // Create credit ledger entry (deposit to destination)
            await ledgerModel.create([{
                account: toAccount._id,
                amount,
                transaction: transaction[0]._id,
                type: 'credit',
            }], { session });

            // Mark transaction as completed
            transaction[0].status = 'completed';
            await transaction[0].save({ session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: "Transaction completed successfully",
                transaction: transaction[0]
            });
        } catch (error) {
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

async function createInitialfundsTransaction(req, res) {
    const { toAccountId, amount, idempotencyKey } = req.body;

    try {
        if (!toAccountId || !amount || !idempotencyKey) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than zero" });
        }

        // Check for duplicate idempotency key
        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            return res.status(409).json({
                message: "Transaction already processed",
                transaction: existingTransaction
            });
        }

        const touseraccount = await accountModel.findById(toAccountId);
        if (!touseraccount) {
            return res.status(404).json({ message: "Account not found" });
        }

        const fromUserAccount = await accountModel.findOne({ user: req.user._id });
        if (!fromUserAccount) {
            return res.status(404).json({ message: "System user account not found" });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await transactionModel.create([{
                fromAccount: fromUserAccount._id,
                toAccount: touseraccount._id,
                status: "pending",
                amount,
                idempotencyKey,
            }], { session });

            await ledgerModel.create([{
                account: fromUserAccount._id,
                amount,
                transaction: transaction[0]._id,
                type: 'debit',
            }], { session });

            await ledgerModel.create([{
                account: touseraccount._id,
                amount,
                transaction: transaction[0]._id,
                type: 'credit',
            }], { session });

            transaction[0].status = 'completed';
            await transaction[0].save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: "Transaction completed successfully",
                transaction: transaction[0]
            });
        } catch (error) {
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

module.exports = {
    createTransaction,
    createInitialfundsTransaction
};
