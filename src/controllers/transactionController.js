const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");


async function createTransaction(req, res) {
    const { fromAccountId, toAccountId, amount, impotencyKey } = req.body;

}

async function createInitialfundsTransaction(req, res) {
    const { toAccountId, amount, impotencyKey } = req.body;
    if (!toAccountId || !amount || !impotencyKey) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const touseraccount = await accountModel.findById(toAccountId);
    if (!touseraccount) {
        return res.status(404).json({ message: "account not found" });
    }
    const fromUserAccount = await accountModel.findOne({ user: req.user._id });
    if (!fromUserAccount) {
        return res.status(404).json({ message: "System user  account not found" });
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const transaction = await transactionModel.create([{
        fromAccount: fromUserAccount._id,
        toAccount: touseraccount._id,
        status: "PENDING",
        amount,
        impotencyKey,
    }], { session });

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount,
        transaction: transaction[0]._id,
        type: 'debit',
    }], { session });
    const creditLedgerEntry = await ledgerModel.create([{
        account: touseraccount._id,
        amount,
        transaction: transaction[0]._id,
        type: 'credit',
    }], { session });

    transaction[0].status = 'COMPLETED';
    await transaction[0].save({ session });
    await session.commitTransaction();
    session.endSession();
    return res.status(201).json({ message: "Transaction completed successfully", transaction: transaction[0] });

}
module.exports = {
    createTransaction,
    createInitialfundsTransaction
}