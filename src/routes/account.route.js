const express = require('express');
const authmiddleware = require('../middleware/auth.middleware');


const router = express.Router();

router.post("/", authmiddleware.authmiddleware, accountController.createAccount);

router.get("/", authmiddleware.authmiddleware, accountController.getAccounts);
router.get("/:accountId", authmiddleware.authmiddleware, accountController.getAccountById);
module.exports = router;