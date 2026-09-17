const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const authRouter = require("./routes/auth.route");
const accountRouter = require("./routes/account.route");
const transactionRouter = require("./routes/transaction.route");
const demoRouter = require('./routes/demo.route');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ==========================================
// LOGGING MIDDLEWARE (Morgan)
// ==========================================
// Skip logging in test environment
if (process.env.NODE_ENV !== 'test') {
    // Use 'combined' format in production (Apache-style logs)
    // Use 'dev' format in development (colored, concise)
    const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    app.use(morgan(morganFormat));
}

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet: Sets secure HTTP headers
app.use(helmet());

// CORS: Restrict to specific frontend origins
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:4173', 'http://127.0.0.1:4173'];

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // #region agent log
        fetch('http://127.0.0.1:7896/ingest/2b2c0b13-d65c-462e-b0c9-28761c706c36',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a58762'},body:JSON.stringify({sessionId:'a58762',location:'app.js:cors:rejected',message:'CORS origin rejected',data:{origin,allowedOrigins},timestamp:Date.now(),hypothesisId:'D',runId:'pre-fix'})}).catch(()=>{});
        // #endregion
        callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting: Prevent brute force attacks on auth endpoints
const isExemptFromRateLimit = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'benchmark' || process.env.DISABLE_RATE_LIMIT === 'true';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isExemptFromRateLimit ? 100000 : 50, // Limit requests per windowMs
    message: {
        message: 'Too many auth requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// General API rate limiter (more permissive)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isExemptFromRateLimit ? 500000 : 200, // Limit each IP per windowMs
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
app.use('/api/demo', demoRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ==========================================
// ERROR HANDLING MIDDLEWARE (Must be last)
// ==========================================

// 404 Handler - catches requests to undefined routes
app.use(notFoundHandler);

// Centralized Error Handler - catches all errors
app.use(errorHandler);

module.exports = app;
