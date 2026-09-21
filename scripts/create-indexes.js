#!/usr/bin/env node
/**
 * Create indexes for transaction collection to support filtering and pagination.
 * Run once: node scripts/create-indexes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Transaction = require('../src/models/transaction.model');

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Compound index for common query patterns:
    // - filter by fromAccount / toAccount (user accounts)
    // - optional amount range
    // - status filter
    // - sort by createdAt descending
    await Transaction.collection.createIndex(
      { fromAccount: 1, toAccount: 1, createdAt: -1, amount: 1, status: 1 },
      { name: 'txn_history_filter_idx', background: true }
    );
    console.log('Created compound index txn_history_filter_idx');

    // Index for search by counterparty account (used in search feature)
    await Transaction.collection.createIndex(
      { fromAccount: 1, toAccount: 1 },
      { name: 'txn_counterparty_idx', background: true }
    );
    console.log('Created counterparty index txn_counterparty_idx');

    console.log('All indexes created successfully');
  } catch (err) {
    console.error('Error creating indexes:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();