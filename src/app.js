const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRouter = require("./routes/auth.route");
const accountRouter = require("./routes/account.route");
const transactionRouter = require("./routes/transaction.route");

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet: Sets secure HTTP headers
app.use(helmet());

// CORS: Restrict to specific frontend origins
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting: Prevent brute force attacks on auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// General API rate limiter (more permissive)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(apiLimiter);

// ==========================================
// BODY PARSING MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(cookieParser());

// ==========================================
// ROUTES
// ==========================================
app.use("/api/auth", authLimiter, authRouter); // Stricter rate limit on auth routes
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
