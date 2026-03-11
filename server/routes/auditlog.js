// routes/auditlog.js + stats endpoint
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const Obligation = require('../models/Obligation');

// GET /api/auditlog?sector=FinTech&limit=10
router.get('/', async (req, res) => {
    try {
        const { sector, limit = 10 } = req.query;
        const filter = sector ? { sector } : {};
        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auditlog — Add a log entry
router.post('/', async (req, res) => {
    try {
        const log = await AuditLog.create({ ...req.body, time: new Date().toLocaleString('en-IN') });
        res.status(201).json({ success: true, data: log });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// GET /api/stats?sector=FinTech — Dynamic compliance stats
router.get('/stats', async (req, res) => {
    try {
        const { sector } = req.query;
        const filter = sector ? { sector } : {};
        const all = await Obligation.find(filter);
        const done = all.filter(o => o.status === 'Done').length;
        const pending = all.filter(o => o.status === 'Pending').length;
        const overdue = all.filter(o => o.status === 'Overdue').length;
        const critical = all.filter(o => o.priority === 'Critical' || o.priority === 'High').length;
        const total = all.length || 1;
        const score = Math.round((done / total) * 100);

        const byReg = {};
        all.forEach(o => {
            if (!byReg[o.reg]) byReg[o.reg] = { done: 0, total: 0 };
            byReg[o.reg].total++;
            if (o.status === 'Done') byReg[o.reg].done++;
        });
        const regScores = {};
        Object.keys(byReg).forEach(r => {
            regScores[r] = Math.round((byReg[r].done / byReg[r].total) * 100);
        });

        res.json({
            success: true,
            data: {
                score, done, pending, overdue, critical,
                sebi: regScores['SEBI'] || 90,
                rbi: regScores['RBI'] || 75,
                mca: regScores['MCA'] || 90,
                dpdp: regScores['DPDP'] || 65,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
