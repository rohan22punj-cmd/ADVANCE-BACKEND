const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../service/GmailService');

async function userRegisterController(req, res) {
    const { email, name, password } = req.body;

    try {
        const isExistingUser = await userModel.findOne({ email });
        if (isExistingUser) {
            return res.status(422).json({ message: 'User already exists' });
        }

        const user = await userModel.create({ email, name, password });

        await emailService.sendRegistrationEmail(email, name);

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        return res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Something went wrong' });
    }
}

async function userLoginController(req, res) {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email }).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Something went wrong' });
    }
}

module.exports = {
    userRegisterController,
    userLoginController
};