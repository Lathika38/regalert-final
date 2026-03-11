// ────────────────────────────────────────────────────────────────────────────
//  RegAlert Backend — server.js
//  Node.js + Express + MongoDB + Gemini AI
//  Auto-seeds DB, auto-generates regulations via AI every 2 hours
// ────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');

const Alert = require('./models/Alert');
const Obligation = require('./models/Obligation');
const AuditLog = require('./models/AuditLog');
const { generateNewRegulationAlert, generateAISummary } = require('./services/aiService');
const { sendDeadlineEmail } = require('./services/emailService');
const { runAllScrapers } = require('./services/scraperService');

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// Serve landing page by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'landing.html'));
});

// ── DATABASE ──────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/regalert';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB connected:', MONGODB_URI);
        await autoSeedIfEmpty();
        startCronJobs();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        // Start server anyway so the frontend is still accessible
        console.log('⚠️  Starting without DB — some features may be limited.');
        startCronJobs();
    });

// ── AUTO-SEED on first run ────────────────────────────────────────────────────
async function autoSeedIfEmpty() {
    try {
        const count = await Alert.countDocuments();
        console.log(`📊 Database ready: ${count} alerts found`);
        if (count === 0) {
            console.log('📦 Database is empty — auto-seeding...');
            const { seedDatabase } = require('./seed/seed');
            if (seedDatabase) await seedDatabase();
        }
        await checkAndSeedProfiles();
    } catch (e) {
        console.log('⚠️ Seed check skipped:', e.message);
    }
}

async function checkAndSeedProfiles() {
    try {
        const Profile = require('./models/Profile');
        const count = await Profile.countDocuments();
        if (count === 0) {
            await Profile.create({
                businessName: "Arjun's FinTech", sector: 'FinTech',
                location: 'Mumbai', teamSize: '11-50', complianceScore: 87
            });
        }
    } catch (e) { /* ok */ }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/obligations', require('./routes/obligations'));
app.use('/api/audit-log', require('./routes/auditlog'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/profile', require('./routes/profile'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0', ai: process.env.GEMINI_API_KEY ? 'Gemini LIVE' : 'Template', db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Serve dashboard for any unknown routes (SPA fallback)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── SERVER START ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       RegAlert Backend API v2.0 — RUNNING ✅         ║');
    console.log(`║  App    : http://localhost:${PORT}                    ║`);
    console.log(`║  API    : http://localhost:${PORT}/api/health         ║`);
    console.log(`║  AI     : 🤖 ${process.env.GEMINI_API_KEY ? 'Gemini LIVE' : 'Template Mode'}                         ║`);
    console.log('╚══════════════════════════════════════════════════════╝\n');
});

// ── CRON JOBS ─────────────────────────────────────────────────────────────────
function startCronJobs() {
    console.log('⏰ CRON JOBS ACTIVE:');
    console.log('   Every 15 min  → Regulatory feed sync check');
    console.log('   Every 2 hours → AI auto-generates new regulation alerts');
    console.log('   Every 24 hours→ AI summarizes missing summaries');
    console.log('   Every day 8 AM→ Email reminders for deadlines via Nodemailer');
    console.log(`   AI Mode: 🤖 ${process.env.GEMINI_API_KEY ? 'Gemini AI (LIVE)' : 'Template Mode'}`);

    // Every 15 minutes: Run Web Scrapers
    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log(`\n🔄 [CRON 15m] Live Regulatory Web Scraper Triggered @ ${new Date().toLocaleTimeString()}`);
            await runAllScrapers();
        } catch (e) { console.error('[CRON] Scraper error:', e.message); }
    });

    // Every 2 hours: AI generates new regulation alerts
    cron.schedule('0 */2 * * *', async () => {
        try {
            console.log('\n🤖 [CRON 2h] AI Auto-generating new regulation alert...');
            if (mongoose.connection.readyState === 1) {
                await generateNewRegulationAlert();
            }
        } catch (e) { console.error('[CRON] AI generate error:', e.message); }
    });

    // Every 24 hours: Summarize alerts missing AI summaries
    cron.schedule('0 0 * * *', async () => {
        try {
            if (mongoose.connection.readyState !== 1) return;
            const alerts = await Alert.find({ summary: { $in: [null, '', undefined] } }).limit(10);
            for (const alert of alerts) {
                const summary = await generateAISummary(alert.title, alert.reg, alert.desc);
                await Alert.findByIdAndUpdate(alert._id, { summary });
            }
        } catch (e) { console.error('[CRON] Summarize error:', e.message); }
    });

    // Every day at 8 AM: Send deadline email reminders
    cron.schedule('0 8 * * *', async () => {
        try {
            if (mongoose.connection.readyState !== 1) return;
            const soon = new Date(); soon.setDate(soon.getDate() + 7);
            const obligations = await Obligation.find({ status: { $ne: 'done' } }).limit(5);
            for (const obl of obligations) {
                if (process.env.EMAIL_USER) {
                    await sendDeadlineEmail(process.env.EMAIL_USER, obl.title, obl.dueDate, 'High Risk');
                }
            }
        } catch (e) { console.error('[CRON] Email error:', e.message); }
    });
}
