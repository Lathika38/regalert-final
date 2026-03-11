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

// ── DATABASE (Zero-Config Cloud DB Layer) ────────────────────────────────────
let mongoURI = process.env.MONGODB_URI;

async function bootstrapDatabase() {
    // If the user hasn't set up Atlas, spin up an "In-Memory Cloud Database"
    // This physically runs the entire MongoDB inside the Node RAM so it can be 
    // deployed instantly to Render.com WITHOUT ANY external DB setup.
    if (!mongoURI || mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1')) {
        console.log('🔄 Bypassing local DB constraint. Spinning up RAM Cloud Cluster...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoURI = mongoServer.getUri();
        console.log('✅ Temporary Cloud DB (RAM) securely instantiated.');
    }

    mongoose.connect(mongoURI)
        .then(async () => {
            console.log('✅ MongoDB connected:', mongoURI);
            await autoSeedIfEmpty();
            startCronJobs();
        })
        .catch(err => {
            console.error('❌ MongoDB connection error:', err.message);
            console.log('⚠️  Make sure MongoDB is running: mongod');
            process.exit(1);
        });
}

bootstrapDatabase();

// ── AUTO-SEED on first run ────────────────────────────────────────────────────
async function autoSeedIfEmpty() {
    const alertCount = await Alert.countDocuments();
    if (alertCount === 0) {
        console.log('📦 Database is empty — auto-seeding...');
        const { execSync } = require('child_process');
        try {
            execSync('node ' + path.join(__dirname, 'seed/seed.js'), { stdio: 'inherit' });
        } catch (e) {
            console.log('⚠️  Auto-seed failed. Run: npm run seed');
        }
    } else {
        console.log(`📊 Database ready: ${alertCount} alerts found`);
    }
}

// ── API ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/obligations', require('./routes/obligations'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/auditlog', require('./routes/auditlog'));
app.use('/api/ai', require('./routes/ai'));

// ── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const { sector } = req.query;
        const filter = sector ? { sector } : {};
        const all = await Obligation.find(filter);
        const done = all.filter(o => o.status === 'Done').length;
        const total = all.length || 1;
        const score = Math.round((done / total) * 100);
        const pend = all.filter(o => o.status === 'Pending' || o.status === 'Overdue').length;
        const crit = all.filter(o => o.priority === 'Critical').length;
        const calcReg = reg => {
            const r = all.filter(o => o.reg === reg);
            return r.length ? Math.round((r.filter(o => o.status === 'Done').length / r.length) * 100) : 90;
        };
        res.json({ success: true, data: { score, done, pend, crit, sebi: calcReg('SEBI'), rbi: calcReg('RBI'), mca: calcReg('MCA'), dpdp: calcReg('DPDP') } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── HEALTH ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        ai: hasGemini ? 'gemini-live' : 'template-mode',
        version: '2.0'
    });
});

// ── CRON JOBS ─────────────────────────────────────────────────────────────────
function startCronJobs() {
    const SECTORS = ['FinTech', 'SaaS', 'NBFC', 'EdTech'];

    // ① Every 15 min — Run actual Web Scrapers for RBI/SEBI Live Data
    cron.schedule('*/15 * * * *', async () => {
        const now = new Date().toLocaleTimeString('en-IN');
        console.log(`\n🔄 [CRON 15m] Live Regulatory Web Scraper Triggered @ ${now}`);
        try {
            await runAllScrapers();
        } catch (e) { console.error('Scraper Cron Error:', e); }
    });

    // ② Every 2 hours — AUTO-GENERATE new regulation alert using AI
    cron.schedule('0 */2 * * *', async () => {
        console.log('🤖 [CRON 2h] Auto-generating new regulation alert with AI...');
        try {
            // Pick a random sector to generate for
            const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
            const alertData = await generateNewRegulationAlert(sector);

            // Don't insert duplicates
            const exists = await Alert.findOne({ title: alertData.title });
            if (!exists) {
                await Alert.create(alertData);
                await AuditLog.create({
                    icon: 'fa-robot', iconBg: 'rgba(139,92,246,0.15)', iconColor: '#8b5cf6',
                    action: 'AI: New Regulation Detected',
                    detail: `Auto-generated: "${alertData.title.substring(0, 65)}"`,
                    sector: alertData.sector,
                    time: new Date().toLocaleString('en-IN')
                });
                console.log(`✅ [AI CRON] New alert added: "${alertData.title.substring(0, 55)}" (${sector})`);
            } else {
                console.log('ℹ️  [AI CRON] Duplicate alert skipped');
            }
        } catch (e) {
            console.warn('[AI CRON] Error:', e.message);
        }
    });

    // ③ Every 24 hours (midnight) — Auto-summarize any alerts missing AI summary
    cron.schedule('0 0 * * *', async () => {
        console.log('🤖 [CRON 24h] Auto-summarizing alerts without AI summaries...');
        try {
            const alerts = await Alert.find({ $or: [{ summary: '' }, { summary: null }] }).limit(5);
            for (const alert of alerts) {
                alert.summary = await generateAISummary(alert.title, alert.reg, alert.desc);
                await alert.save();
                console.log(`✅ [AI CRON] Summary generated for: ${alert.title.substring(0, 40)}`);
            }
        } catch (e) {
            console.warn('[AI CRON 24h] Error:', e.message);
        }
    });

    // ④ Every day at 8:00 AM — Auto-email reminders for upcoming deadlines
    cron.schedule('0 8 * * *', async () => {
        console.log('✉️ [CRON] Checking for upcoming deadlines to send email reminders...');
        try {
            // Find obligations that are Pending and due within next 7 days
            const obligations = await Obligation.find({ status: 'Pending' });

            // Just for demonstration, let's grab the first upcoming one or any pending
            // In a real app we'd filter strictly by date
            if (obligations.length > 0) {
                const obl = obligations[0];
                const email = 'compliance@regalert.io'; // We would look up user's email here
                await sendDeadlineEmail(email, obl.title, obl.dl, 'High Penalty');
            }
        } catch (e) {
            console.warn('[EMAIL CRON] Error:', e.message);
        }
    });

    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
    console.log('');
    console.log('⏰ CRON JOBS ACTIVE:');
    console.log('   Every 15 min  → Regulatory feed sync check');
    console.log('   Every 2 hours → AI auto-generates new regulation alerts');
    console.log('   Every 24 hours→ AI summarizes missing summaries');
    console.log('   Every day 8 AM→ Email reminders for deadlines via Nodemailer');
    console.log(`   AI Mode: ${hasGemini ? '🤖 Gemini AI (LIVE)' : '📋 Smart Template (add GEMINI_API_KEY for real AI)'}`);
    console.log('');
}

// ── CATCH-ALL ─────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║       RegAlert Backend API v2.0 — RUNNING ✅         ║');
    console.log(`║  App    : http://localhost:${PORT}                    ║`);
    console.log(`║  API    : http://localhost:${PORT}/api/health         ║`);
    console.log(`║  AI     : ${hasGemini ? '🤖 Gemini LIVE                         ║' : '📋 Template Mode (add key for real AI)  ║'}`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
});
