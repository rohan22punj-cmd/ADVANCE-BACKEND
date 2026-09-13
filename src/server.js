const path = require('path');

// Load environment variables from root .env or src/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

// Normalize environment variable names
if (!process.env.JWT_SECRET && process.env.jwt_secret) {
    process.env.JWT_SECRET = process.env.jwt_secret;
}
if (!process.env.MONGO_URI && process.env.mongo_uri) {
    process.env.MONGO_URI = process.env.mongo_uri;
}

const app = require('./app');
const connectToDB = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
    await connectToDB();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();
