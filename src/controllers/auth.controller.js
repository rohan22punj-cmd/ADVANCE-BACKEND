const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../service/GmailService');
const crypto = require('crypto');

/**
 * Generate Access Token (Short-lived: 15 minutes)
 */
function generateAccessToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '15m'
    });
}

/**
 * Generate Refresh Token (Long-lived: 7 days, stored in DB)
 */
function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

/**
 * User Registration
 */
async function userRegisterController(req, res, next) {
    const { email, name, password } = req.body;

    try {
        const isExistingUser = await userModel.findOne({ email });
        if (isExistingUser) {
            return res.status(422).json({ message: 'User already exists' });
        }

        const user = await userModel.create({ email, name, password });

        // Send welcome email asynchronously
        void emailService.sendRegistrationEmail(email, name);

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken();

        // Store refresh token in database
        user.refreshTokens.push({ token: refreshToken });
        await user.save();

        // Set tokens in cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        next(error);
    }
}

/**
 * User Login
 */
async function userLoginController(req, res, next) {
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

        // Generate new tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken();

        // Store refresh token in database
        user.refreshTokens.push({ token: refreshToken });
        await user.save();

        // Set tokens in cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Refresh Access Token using Refresh Token
 */
async function refreshTokenController(req, res, next) {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not provided' });
    }

    try {
        // Find user with this refresh token
        const user = await userModel.findOne({
            'refreshTokens.token': refreshToken
        });

        if (!user) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken(user._id);

        // Set new access token in cookie
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        return res.status(200).json({
            accessToken: newAccessToken,
            message: 'Access token refreshed successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Logout - Invalidate Refresh Token
 */
async function logoutController(req, res, next) {
    const { refreshToken } = req.cookies;

    try {
        if (refreshToken) {
            // Remove refresh token from database
            await userModel.updateOne(
                { 'refreshTokens.token': refreshToken },
                { $pull: { refreshTokens: { token: refreshToken } } }
            );
        }

        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    refreshTokenController,
    logoutController
};
