const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    message: 'Status must be one of the following: pending, completed, failed, reversed',
    default: 'pending',
  },
  amount: {
    type: Number,
    required: true,
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
  },
  failureReason: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;