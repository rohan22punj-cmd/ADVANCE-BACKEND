const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const accountController = require('../controllers/account.controller');
const { validateBody, createAccountSchema } = require('../middleware/validate.middleware');

router.post('/', authMiddleware, validateBody(createAccountSchema), accountController.createAccount);
router.get('/', authMiddleware, accountController.getAccounts);
router.get('/:accountId', authMiddleware, accountController.getAccountBalanceController);

module.exports = router;
