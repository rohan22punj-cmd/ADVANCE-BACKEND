const express = require('express');
const authController = require('../controllers/auth.controller');

const authRouter = require(",/routes/auth.route");

const app = express();

app.use("/api/auth", authRouter);

const router = express.Router();

router.post('/register', authController.userReegisterController);

module.exports = router;