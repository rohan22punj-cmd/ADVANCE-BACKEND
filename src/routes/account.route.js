const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const accountController = require('../controllers/account.controller');

router.post('/', authMiddleware, accountController.createAccount);
router.get('/', authMiddleware, accountController.getAccounts);
router.get('/:accountId', authMiddleware, accountController.getAccountBalanceController);

module.exports = router;
