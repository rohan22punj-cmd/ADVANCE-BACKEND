const accountModel = require('../models/account.model');

async function createAccount(req, res) {
    const user = req.user; // Assuming the user is attached to the request by the auth middleware
    const account = await accountModel.create({ user: user._id, ...req.body });
    res.status(201).json({ message: 'Account created successfully', account });
}

module.exports = {
    createAccount,
};