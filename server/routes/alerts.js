// routes/alerts.js — GET all alerts by sector, GET single alert
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const { sendDeadlineEmail } = require('../services/emailService');

// GET /api/alerts?sector=FinTech&urgency=HIGH&reg=RBI
router.get('/', async (req, res) => {
    try {
        const { sector, urgency, reg } = req.query;
        const filter = { isActive: true };
        if (sector) filter.sector = sector;
        if (urgency) filter.urgency = urgency;
        if (reg) filter.reg = reg;
        const alerts = await Alert.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/alerts/search?q=kyc
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, data: [] });
        const regex = new RegExp(q, 'i');
        const alerts = await Alert.find({
            isActive: true,
            $or: [{ title: regex }, { desc: regex }, { reg: regex }, { summary: regex }]
        }).sort({ createdAt: -1 });
        res.json({ success: true, count: alerts.length, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/alerts/:id/notify
router.post('/:id/notify', async (req, res) => {
    try {
        const { targetEmail } = req.body;
        const alert = await Alert.findById(req.params.id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

        const email = targetEmail || process.env.EMAIL_USER;
        const result = await sendDeadlineEmail(
            email,
            `[ALERT NOTIFICATION] ${alert.title}`,
            alert.deadline,
            alert.penalty
        );

        await AuditLog.create({
            icon: 'fa-envelope', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6',
            action: 'Alert Email Sent',
            detail: `Team notified about: "${alert.title}"`,
            sector: alert.sector,
            time: new Date().toLocaleString('en-IN')
        });

        if (result.success) {
            res.json({ success: true, message: result.mock ? 'Mock email scheduled' : 'Email sent successfully!' });
        } else {
            res.status(500).json({ success: false, message: result.message });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
