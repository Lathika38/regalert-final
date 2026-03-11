// routes/obligations.js — Full CRUD for obligations
const express = require('express');
const router = express.Router();
const Obligation = require('../models/Obligation');
const AuditLog = require('../models/AuditLog');
const { sendDeadlineEmail } = require('../services/emailService');

// GET /api/obligations?sector=FinTech
router.get('/', async (req, res) => {
    try {
        const { sector } = req.query;
        const filter = {};
        if (sector) filter.sector = sector;
        const obls = await Obligation.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, count: obls.length, data: obls });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/obligations — Create new obligation
router.post('/', async (req, res) => {
    try {
        const obl = await Obligation.create(req.body);
        await AuditLog.create({
            icon: 'fa-plus-circle', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6',
            action: 'Obligation Created',
            detail: `"${obl.title}" — Owner: ${obl.owner}, Due: ${obl.dl}`,
            sector: obl.sector,
            time: new Date().toLocaleString('en-IN')
        });
        res.status(201).json({ success: true, data: obl });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// PATCH /api/obligations/:id/status — Toggle status
router.patch('/:id/status', async (req, res) => {
    try {
        const obl = await Obligation.findById(req.params.id);
        if (!obl) return res.status(404).json({ success: false, message: 'Not found' });

        obl.status = (obl.status === 'Done') ? 'Pending' : 'Done';
        obl.scls = (obl.status === 'Done') ? 'p-done' : 'p-pending';
        obl.dcls = (obl.status === 'Done') ? 'dl-green' : 'dl-yellow';
        await obl.save();

        await AuditLog.create({
            icon: obl.status === 'Done' ? 'fa-check-circle' : 'fa-undo',
            iconBg: obl.status === 'Done' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            iconColor: obl.status === 'Done' ? '#10b981' : '#f59e0b',
            action: obl.status === 'Done' ? 'Obligation Completed' : 'Obligation Reopened',
            detail: obl.title, sector: obl.sector,
            time: new Date().toLocaleString('en-IN')
        });
        res.json({ success: true, data: obl });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/obligations/:id — Update any field
router.patch('/:id', async (req, res) => {
    try {
        const obl = await Obligation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!obl) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: obl });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// POST /api/obligations/:id/notify — Manually send email reminder
router.post('/:id/notify', async (req, res) => {
    try {
        const { targetEmail } = req.body;
        const obl = await Obligation.findById(req.params.id);
        if (!obl) return res.status(404).json({ success: false, message: 'Not found' });

        const email = targetEmail || process.env.EMAIL_USER;
        const result = await sendDeadlineEmail(email, obl.title, obl.dl, 'High Penalty');

        await AuditLog.create({
            icon: 'fa-envelope', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6',
            action: 'Email Reminder Sent',
            detail: `Sent manual team reminder for: "${obl.title}"`,
            sector: obl.sector,
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

// DELETE /api/obligations/:id
router.delete('/:id', async (req, res) => {
    try {
        await Obligation.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Obligation deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
