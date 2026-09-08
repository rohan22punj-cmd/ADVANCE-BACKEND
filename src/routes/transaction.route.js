const router = require('express').Router();
const trasactionRouter = require('./transaction.route');


transactionRouter.post("/", authMiddleware, async(req, res) => {
    // Implementation for creating a new transaction
});
module.exports = transactionRouter;