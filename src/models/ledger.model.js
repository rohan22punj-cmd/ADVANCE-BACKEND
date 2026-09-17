const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
    },
});

function preventLedgerModification() {
    throw new Error('Ledger entries are immutable and cannot be modified.');
}
//does not allow modification of ledger entries after creation
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);

const ledgerModel = mongoose.model('Ledger', ledgerSchema);

module.exports = ledgerModel;