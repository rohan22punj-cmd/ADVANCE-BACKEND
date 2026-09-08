const accountModel = require('../models/account.model');

async function createAccount(req, res) {
    const user = req.user; // Assuming the user is attached to the request by the auth middleware
    const account = await accountModel.create({ user: user._id, ...req.body });
    res.status(201).json({ message: 'Account created successfully', account });
}

async function getAccounts(req, res) {
    const user = req.user; // Assuming the user is attached to the request by the auth middleware
    const accounts = await accountModel.find({ user: user._id });
    res.status(200).json({ accounts });
}
async function getAccountBalanceController(req, res) {
    const accountId = req.params.accountId;
    try {
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        res.status(200).json({ balance: account.balance });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching account balance' });
    }
}

module.exports = {
    createAccount,
    getAccounts,
    getAccountBalanceController
};