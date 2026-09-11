const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { AppError } = require('./error.middleware');


async function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return next(new AppError('Unauthorized: No access token provided', 401));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);
        if (!user) {
            return next(new AppError('Unauthorized: Invalid token', 401));
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Access token expired. Use /api/auth/refresh-token to get a new one.', 401));
        }
        next(error);
    }
}
async function authSystemUserMiddleware(req, res, next) {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new AppError('Unauthorized: No access token provided', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);
        if (!user || !user.systemUser) {
            return next(new AppError('Forbidden: Access denied for non-system users', 403));
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Access token expired. Use /api/auth/refresh-token to get a new one.', 401));
        }
        next(error);
    }
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};
