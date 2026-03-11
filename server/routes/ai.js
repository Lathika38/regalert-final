// routes/ai.js — AI summary generation endpoint
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const { generateAISummary, generateNewRegulationAlert } = require('../services/aiService');
const { runAllScrapers } = require('../services/scraperService');

// POST /api/ai/scrape-now — Manually trigger the live RBI/SEBI web scrapers
router.post('/scrape-now', async (req, res) => {
    try {
        await runAllScrapers();
        res.json({ success: true, message: 'Live data scraped successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/ai/summary — Generate AI summary for any regulation text
// Body: { title, reg, desc }
router.post('/summary', async (req, res) => {
    try {
        const { title, reg, desc } = req.body;
        if (!title || !desc) return res.status(400).json({ success: false, message: 'title and desc required' });
        const summary = await generateAISummary(title, reg || 'RBI', desc);
        res.json({ success: true, summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/ai/generate-alert — Auto-generate a new regulation alert
// Body: { sector }
router.post('/generate-alert', async (req, res) => {
    try {
        const { sector } = req.body;
        const alertData = await generateNewRegulationAlert(sector || 'FinTech');

        // Check for duplicates by title
        const exists = await Alert.findOne({ title: alertData.title });
        if (exists) {
            return res.json({ success: false, message: 'Similar alert already exists', data: exists });
        }

        const saved = await Alert.create(alertData);
        await AuditLog.create({
            icon: 'fa-robot', iconBg: 'rgba(139,92,246,0.15)', iconColor: '#8b5cf6',
            action: 'AI Alert Generated',
            detail: `New regulation auto-detected: "${alertData.title.substring(0, 60)}"`,
            sector: alertData.sector,
            time: new Date().toLocaleString('en-IN')
        });
        res.json({ success: true, message: 'New regulation alert created!', data: saved });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/ai/status — Check if AI is active
router.get('/status', async (req, res) => {
    const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
    res.json({
        success: true,
        mode: hasKey ? 'gemini-ai' : 'smart-template',
        geminiActive: hasKey,
        message: hasKey ? '🤖 Gemini AI active — real summaries enabled' : '📋 Template mode — add GEMINI_API_KEY to .env for real AI'
    });
});

module.exports = router;
