const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
async function userReegisterController(req, res) {
    const { email, name, password } = req.body;

    const isExistingUser = await userModel.findOne({ email });
    if (isExistingUser) {
        return res.status(422).json({ message: 'User already exists' });
    }
}
const user = await userModel.create({ email, name, password });

const token = jwt.sign({ userId: user._id }, process.env.jwt_secret, { expiresIn: '1h' });

res.cookies('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

res.status(201).json({
    user: {
        _id: user._id,
        email: user.email,
        name: user.name
    },
    token: token
});

module.exports = {
    userReegisterController
};