const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

let mongoServer;

/**
 * Connect to the in-memory database before all tests
 */
async function connect() {
    // Close any existing connections
    await mongoose.disconnect();

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri);
}

/**
 * Drop all collections and clear data after each test
 */
async function clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Close database connection and stop the in-memory server after all tests
 */
async function closeDatabase() {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

module.exports = {
    connect,
    clearDatabase,
    closeDatabase
};
