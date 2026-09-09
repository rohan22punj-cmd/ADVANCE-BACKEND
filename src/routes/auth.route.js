const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validate.middleware');

router.post('/register', validateBody(registerSchema), authController.userRegisterController);
router.post('/login', validateBody(loginSchema), authController.userLoginController);

module.exports = router;
