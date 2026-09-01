const express = require('express');
const authmiddleware = require('../middleware/auth.middleware');


const router = express.Router();

router.post("/", authmiddleware.authmiddleware, accountController.createAccount);
module.exports = router;