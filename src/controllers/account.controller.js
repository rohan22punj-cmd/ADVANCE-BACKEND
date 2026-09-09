const accountModel = require('../models/account.model');
const ledgerModel = require('../models/ledger.model');

async function createAccount(req, res) {
    try {
        const user = req.user;
        const account = await accountModel.create({ user: user._id, ...req.body });
        res.status(201).json({ message: 'Account created successfully', account });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Account with this currency already exists for user' });
        }
        res.status(500).json({ message: error.message || 'Error creating account' });
    }
}

async function getAccounts(req, res) {
    try {
        const user = req.user;
        const accounts = await accountModel.find({ user: user._id });
        res.status(200).json({ accounts });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching accounts' });
    }
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

        // Calculate balance from ledger entries
        const balanceAgg = await ledgerModel.aggregate([
            { $match: { account: account._id } },
            {
                $group: {
                    _id: null,
                    balance: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "credit"] },
                                "$amount",
                                { $multiply: ["$amount", -1] }
                            ]
                        }
                    }
                }
            }
        ]);

        const balance = balanceAgg.length > 0 ? balanceAgg[0].balance : 0;

        res.status(200).json({
            accountId: account._id,
            currency: account.currency,
            status: account.status,
            balance
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching account balance' });
    }
}

module.exports = {
    createAccount,
    getAccounts,
    getAccountBalanceController
};
