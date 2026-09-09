const express = require('express');
const router = express.Router();
const { authMiddleware, authSystemUserMiddleware } = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transactionController');
const {
    validateBody,
    validateQuery,
    createTransactionSchema,
    initialFundsSchema,
    transactionQuerySchema
} = require('../middleware/validate.middleware');

// User-to-user transfer
router.post('/', authMiddleware, validateBody(createTransactionSchema), transactionController.createTransaction);

// System user initial funds injection
router.post('/initial', authSystemUserMiddleware, validateBody(initialFundsSchema), transactionController.createInitialfundsTransaction);

// Transaction history with pagination and filtering
router.get('/', authMiddleware, validateQuery(transactionQuerySchema), transactionController.getTransactionHistory);

module.exports = router;
