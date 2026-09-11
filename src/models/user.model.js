const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email']

    },
    name: {
        type: String,
        required: [true, 'Name is required for creating account'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required for creating account'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Exclude password from query results by default
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true // Once set, this field cannot be changed

    },
    refreshTokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 7 * 24 * 60 * 60 // Expire after 7 days
        }
    }]
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;