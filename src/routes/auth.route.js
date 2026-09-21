const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validate.middleware');

// Stricter limiter for registration: 5 requests per hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { message: 'Too many registration attempts, please try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', registerLimiter, validateBody(registerSchema), authController.userRegisterController);
router.post('/login', validateBody(loginSchema), authController.userLoginController);
router.post('/refresh-token', authController.refreshTokenController);
router.post('/logout', authController.logoutController);

module.exports = router;
