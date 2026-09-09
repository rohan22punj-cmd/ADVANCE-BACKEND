const express = require('express');
const router = express.Router();
const { authMiddleware, authSystemUserMiddleware } = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transactionController');

router.post('/', authMiddleware, transactionController.createTransaction);
router.post('/initial', authSystemUserMiddleware, transactionController.createInitialfundsTransaction);

module.exports = router;
