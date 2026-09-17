const mongoose = require('mongoose');
const accountModel = require('../models/account.model');
const ledgerModel = require('../models/ledger.model');
const { AppError } = require('../middleware/error.middleware');

async function createAccount(req, res, next) {
    try {
        const user = req.user;
        const account = await accountModel.create({
            user: user._id,
            currency: req.body.currency,
            ...(req.body.status && { status: req.body.status })
        });
        res.status(201).json({ message: 'Account created successfully', account });
    } catch (error) {
        next(error);
    }
}

async function getAccounts(req, res, next) {
    try {
        const user = req.user;
        const accounts = await accountModel.find({ user: user._id });
        res.status(200).json({ accounts });
    } catch (error) {
        next(error);
    }
}

async function getAccountBalanceController(req, res, next) {
    const accountId = req.params.accountId;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return next(new AppError('Invalid account ID format', 400));
    }

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
        next(error);
    }
}

async function lookupAccountForTransfer(req, res, next) {
    const accountId = req.params.accountId;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return next(new AppError('Invalid account ID format', 400));
    }

    try {
        const account = await accountModel.findById(accountId).populate('user', 'name');

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        if (account.status !== 'active') {
            return res.status(400).json({ message: 'Account is not active and cannot receive transfers' });
        }

        const accountIdStr = account._id.toString();
        const maskedAccountId = '****' + accountIdStr.slice(-4);

        res.status(200).json({
            account: {
                maskedId: maskedAccountId,
                currency: account.currency,
                status: account.status,
                holderName: account.user?.name || 'Unknown'
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createAccount,
    getAccounts,
    getAccountBalanceController,
    lookupAccountForTransfer
};
