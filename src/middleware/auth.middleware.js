const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');


async function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No access token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired. Use /api/auth/refresh-token to get a new one.' });
        }
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
}
async function authSystemUserMiddleware(req, res, next) {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);
        if (!user || !user.systemUser) {
            return res.status(403).json({ message: 'Forbidden: Access denied for non-system users' });
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired. Use /api/auth/refresh-token to get a new one.' });
        }
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};