const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET && process.env.jwt_secret) {
    process.env.JWT_SECRET = process.env.jwt_secret;
}

const app = require('./app');
const connectToDB = require('./config/db');

async function startServer() {
    await connectToDB();
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

startServer();
