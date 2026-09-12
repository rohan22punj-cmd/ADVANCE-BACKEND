const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { demoFundAccount } = require('../controllers/demo.controller');

router.post('/fund', authMiddleware, demoFundAccount);

module.exports = router;
