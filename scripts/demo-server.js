const { MongoMemoryReplSet } = require('mongodb-memory-server');

async function startDemoServer() {
    const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGO_URI = replicaSet.getUri();
    require('../src/server');
}

startDemoServer().catch((error) => {
    console.error('Unable to start the local demo database:', error);
    process.exit(1);
});
