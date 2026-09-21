const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();
const { authMiddleware, authSystemUserMiddleware } = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transactionController');
const {
    validateBody,
    validateQuery,
    createTransactionSchema,
    initialFundsSchema,
    transactionQuerySchema,
    reverseTransactionSchema
} = require('../middleware/validate.middleware');

// Transfer limiter: 20 requests per minute per user
const transferLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
    message: { message: 'Too many transfer attempts, please try again in a minute' },
    standardHeaders: true,
    legacyHeaders: false,
});

// User-to-user transfer
router.post('/', authMiddleware, transferLimiter, validateBody(createTransactionSchema), transactionController.createTransaction);

// System user initial funds injection
router.post('/initial', authSystemUserMiddleware, validateBody(initialFundsSchema), transactionController.createInitialfundsTransaction);

// Transaction history with pagination and filtering
router.get('/', authMiddleware, validateQuery(transactionQuerySchema), transactionController.getTransactionHistory);

// Reverse a completed transaction
router.post('/:transactionId/reverse', authMiddleware, transferLimiter, validateBody(reverseTransactionSchema), transactionController.reverseTransaction);

module.exports = router;
