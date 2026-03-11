const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

// Demo credentials for hackathon demo when DB is not connected
const DEMO_USERS = [
    { _id: 'demo001', name: 'Arjun Kumar', email: 'arjun@fintech.com', password: 'demo123', companyName: 'PayFlow India' },
    { _id: 'demo002', name: 'Admin User', email: 's.amulu9600@gmail.com', password: 'admin123', companyName: 'RegAlert Corp' },
    { _id: 'demo003', name: 'Priya Sharma', email: 'priya@sebicheck.com', password: 'demo123', companyName: 'SEBI Check' },
];

function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, companyName } = req.body;

    // Demo mode fallback when DB is not connected
    if (!isDbConnected()) {
        return res.status(201).json({
            success: true,
            user: { _id: 'demo_' + Date.now(), name, email, companyName },
            token: generateToken('demo_' + Date.now()),
            demo: true
        });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ name, email, password, companyName });
        if (user) {
            res.status(201).json({
                success: true,
                user: { _id: user._id, name: user.name, email: user.email, companyName: user.companyName },
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Demo mode fallback when DB is not connected
    if (!isDbConnected()) {
        // Check against demo credentials
        const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
        if (demoUser) {
            return res.json({
                success: true,
                user: { _id: demoUser._id, name: demoUser.name, email: demoUser.email, companyName: demoUser.companyName },
                token: generateToken(demoUser._id),
                demo: true
            });
        }
        // Also allow any login in full demo mode
        return res.json({
            success: true,
            user: { _id: 'demo001', name: 'Arjun Kumar', email: email, companyName: 'Demo Company' },
            token: generateToken('demo001'),
            demo: true
        });
    }

    try {
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                user: { _id: user._id, name: user.name, email: user.email, companyName: user.companyName },
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
