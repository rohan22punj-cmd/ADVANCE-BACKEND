const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'frozen', 'closed'],
            message: 'Invalid account status'
        },
        default: 'active',
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
    },
}, {
    timestamps: true,
});
accountSchema.index({ user: 1, currency: 1 }, { unique: true });

const accountModel = mongoose.model('Account', accountSchema);

module.exports = mongoose.model('Account', accountSchema);