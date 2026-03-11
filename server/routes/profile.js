// routes/profile.js — Get and update business profile
const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const AuditLog = require('../models/AuditLog');

// GET /api/profile
router.get('/', async (req, res) => {
    try {
        let profile = await Profile.findOne();
        if (!profile) profile = await Profile.create({});  // auto-create default
        res.json({ success: true, data: profile });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/profile — Update profile
router.patch('/', async (req, res) => {
    try {
        let profile = await Profile.findOne();
        if (!profile) profile = new Profile();
        Object.assign(profile, req.body);
        await profile.save();
        await AuditLog.create({
            icon: 'fa-cog', iconBg: 'rgba(34,211,238,0.15)', iconColor: '#22d3ee',
            action: 'Profile Updated',
            detail: `Company: ${profile.companyName}, Sector: ${profile.sector}`,
            time: new Date().toLocaleString('en-IN')
        });
        res.json({ success: true, data: profile });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/profile/team — Add team member
router.post('/team', async (req, res) => {
    try {
        const { name, role, email, receives } = req.body;
        if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });
        const profile = await Profile.findOne();
        profile.teamMembers.push({ name, role, email, receives, active: true });
        await profile.save();
        await AuditLog.create({
            icon: 'fa-user-plus', iconBg: 'rgba(16,185,129,0.15)', iconColor: '#10b981',
            action: 'Team Member Added', detail: `${name} (${role}) — ${email}`,
            time: new Date().toLocaleString('en-IN')
        });
        res.json({ success: true, data: profile.teamMembers });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
