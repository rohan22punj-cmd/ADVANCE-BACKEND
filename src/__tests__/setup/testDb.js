const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

async function connect() {
    await mongoose.disconnect();
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(mongoServer.getUri());
}

async function clearDatabase() {
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({});
    }
}

async function closeDatabase() {
    await mongoose.disconnect();
    await mongoServer?.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };
