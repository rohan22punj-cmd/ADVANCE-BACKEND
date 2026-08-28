const mongoose = require('mongoose');

async function connectToDB() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing. Add it to your .env file.');
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
}

module.exports = connectToDB;
