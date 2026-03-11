// services/aiService.js
// Gemini AI integration for RegAlert
// - Generates real AI summaries for regulations
// - Auto-generates new realistic regulations (when API key provided)
// - Falls back to smart template-based generation if no API key

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

let genAI = null;
let geminiReady = false;

// Try to init Gemini if API key exists
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiReady = true;
        console.log('✅ Gemini AI initialized');
    } catch (e) {
        console.warn('⚠️  Gemini init failed:', e.message);
    }
} else {
    console.log('ℹ️  No Gemini API key — using smart template generator');
}

// ── GENERATE AI SUMMARY FOR A REGULATION ─────────────────────────────────────
async function generateAISummary(title, regulator, desc) {
    if (geminiReady && genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `You are a compliance advisor for Indian startups. Explain this regulation in exactly 2 clear, simple sentences that a non-lawyer CEO can understand. Focus on: what changed, and what the startup must DO.

Regulator: ${regulator}
Title: ${title}
Details: ${desc}

Write only the 2-sentence summary. No bullet points. No headings.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            console.log('[Gemini] ✅ AI summary generated for:', title.substring(0, 40));
            return text;
        } catch (e) {
            console.warn('[Gemini] Summary failed:', e.message, '— using template');
        }
    }
    // Smart template fallback
    return generateTemplateSummary(title, regulator, desc);
}

// ── GENERATE NEW REGULATION ALERT WITH AI ────────────────────────────────────
async function generateNewRegulationAlert(sector) {
    if (geminiReady && genAI) {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `Generate a realistic Indian regulatory compliance alert for a ${sector} startup in India. 
Return ONLY valid JSON (no markdown, no code blocks) with exactly these fields:
{
  "reg": "RBI" or "SEBI" or "MCA" or "TRAI" or "DPDP",
  "title": "realistic regulation title (max 80 chars)",
  "date": "Mar ${10 + Math.floor(Math.random() * 5)}, 2026",
  "deadline": "deadline in format like Apr 15, 2026",
  "urgency": "HIGH" or "MED" or "LOW",
  "penalty": "penalty amount like ₹25L or ₹1Cr",
  "desc": "2-sentence description of the regulation",
  "summary": "2-sentence plain English summary for a CEO on what changed and what to do",
  "jurisdiction": "PAN India",
  "sector": "${sector}"
}`;

            const result = await model.generateContent(prompt);
            let text = result.response.text().trim();
            // Strip markdown code blocks if present
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const alert = JSON.parse(text);
            alert.alertId = 'ai_' + Date.now();
            alert.bcls = { RBI: 'b-rbi', SEBI: 'b-sebi', MCA: 'b-mca', TRAI: 'b-trai', DPDP: 'b-dpdp' }[alert.reg] || 'b-rbi';
            alert.ucls = { HIGH: 'u-high', MED: 'u-med', LOW: 'u-low' }[alert.urgency] || 'u-med';
            alert.isActive = true;
            console.log('[Gemini] ✅ New regulation generated:', alert.title.substring(0, 50));
            return alert;
        } catch (e) {
            console.warn('[Gemini] Alert generation failed:', e.message, '— using template');
        }
    }
    // Template fallback
    return generateTemplateAlert(sector);
}

// ── TEMPLATE-BASED GENERATOR (no API key needed) ─────────────────────────────
const TEMPLATES = {
    FinTech: [
        { reg: 'RBI', title: 'Updated Fraud Risk Management Framework for Payment Aggregators', desc: 'RBI has issued revised guidelines for fraud risk monitoring in payment aggregator systems, mandating real-time transaction monitoring and quarterly fraud audits.', summary: 'All payment aggregators must implement a live fraud monitoring dashboard and submit quarterly audit reports to RBI starting next quarter.' },
        { reg: 'SEBI', title: 'AIF Category III — Updated Stress Testing Requirements', desc: 'SEBI has mandated all Alternative Investment Funds under Category III to conduct bi-annual stress testing and submit results to SEBI within 15 days.', summary: 'If you run a Category III AIF, schedule bi-annual stress tests on your portfolio immediately and submit results to SEBI portal.' },
        { reg: 'DPDP', title: 'Payment Data Localisation Rule — Revised Storage Standards', desc: 'MeitY has updated DPDP Act rules requiring all payment companies to store transaction data exclusively on India-based servers with specific encryption standards.', summary: 'All payment data must be stored in India-based servers with AES-256 encryption. Review your cloud provider data residency settings immediately.' },
        { reg: 'MCA', title: 'Revised Director KYC (DIR-3 KYC) Annual Filing Requirements', desc: 'MCA has mandated all directors of private limited companies to complete DIR-3 KYC on MCA21 portal by April 30, 2026, or face deactivation of DIN.', summary: 'Every director must complete DIR-3 KYC on the MCA21 portal before April 30. Failure will freeze your Director Identification Number.' },
        { reg: 'RBI', title: 'Mandatory Aadhaar-Based Authentication for Recurring Payments', desc: 'RBI has issued guidelines requiring all recurring payment mandates above ₹15,000 to use Aadhaar-based e-mandate authentication from May 2026.', summary: 'Update your recurring payment flow to include Aadhaar authentication for mandates above ₹15,000 before May 2026.' },
    ],
    SaaS: [
        { reg: 'DPDP', title: 'SaaS Data Processor Agreement Norms — DPDP Rule 8', desc: 'DPDP Act Rule 8 requires all SaaS companies acting as data processors to execute formal Data Processing Agreements (DPAs) with all enterprise clients within 60 days.', summary: 'Execute signed Data Processing Agreements (DPAs) with all your enterprise clients within 60 days. Use the standard MeitY DPA template.' },
        { reg: 'MCA', title: 'Software Companies — Mandatory Demat of Shares (MCA Rule)', desc: 'MCA has mandated all private limited technology companies with net worth above ₹10 Crore to dematerialize all shares on NSDL or CDSL by June 2026.', summary: 'If your SaaS company net worth exceeds ₹10 Crore, convert all physical share certificates to Demat form by June 2026.' },
        { reg: 'TRAI', title: 'Cloud Services Transparency Report — New TRAI Requirement', desc: 'TRAI has mandated all cloud and SaaS service providers serving Indian customers to publish annually a transparency report on data access requests by government agencies.', summary: 'Publish an annual Transparency Report on your website documenting all government data access requests. Required by TRAI now.' },
    ],
    NBFC: [
        { reg: 'RBI', title: 'NBFC Liquidity Coverage Ratio (LCR) Framework — Phase 2', desc: 'RBI has released Phase 2 of the Liquidity Coverage Ratio framework requiring all deposit-taking NBFCs with asset size above ₹500 crore to maintain a minimum 70% LCR.', summary: 'Your NBFC must maintain a 70% LCR immediately. Update your treasury management system and report monthly to RBI.' },
        { reg: 'SEBI', title: 'NBFC Bond Market Disclosure Norms — Enhanced Requirements', desc: 'SEBI has updated disclosure requirements for NBFCs that issue bonds in the public market, mandating quarterly borrower-level NPA disclosures.', summary: 'If you issue public bonds, start quarterly NPA disclosures broken down by borrower category on the SEBI SCORES portal.' },
    ],
    EdTech: [
        { reg: 'DPDP', title: 'Verified Parental Consent System — EdTech Implementation', desc: 'MeitY has published detailed technical standards for verified parental consent systems for digital platforms serving users below 18 years, including OTP-based parent verification.', summary: 'Implement OTP-based parental verification during signup for all users below 18 years. Store consent logs for 3 years as required.' },
        { reg: 'MCA', title: 'EdTech FDI Compliance — FCRA Registration Requirement', desc: 'DPIIT has clarified that EdTech companies receiving FDI must register under FCRA if they have any government school partnerships or content collaborations.', summary: 'If your EdTech company receives foreign investment AND partners with government schools, file FCRA registration within 30 days.' },
    ]
};

function generateTemplateAlert(sector) {
    const templates = TEMPLATES[sector] || TEMPLATES['FinTech'];
    const t = templates[Math.floor(Math.random() * templates.length)];
    const deadlines = ['Apr 15, 2026', 'Apr 30, 2026', 'May 8, 2026', 'May 15, 2026', 'May 31, 2026', 'Jun 15, 2026'];
    const penalties = ['₹25L', '₹50L', '₹1Cr', '₹5L/day', '₹100/day', '₹250Cr', '₹10L'];
    const urgencies = ['HIGH', 'MED', 'MED', 'LOW'];

    const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
    return {
        alertId: 'tpl_' + Date.now(),
        reg: t.reg,
        bcls: { RBI: 'b-rbi', SEBI: 'b-sebi', MCA: 'b-mca', TRAI: 'b-trai', DPDP: 'b-dpdp' }[t.reg],
        title: t.title,
        date: `Mar ${10 + Math.floor(Math.random() * 5)}, 2026`,
        deadline: deadlines[Math.floor(Math.random() * deadlines.length)],
        urgency: urgency,
        ucls: { HIGH: 'u-high', MED: 'u-med', LOW: 'u-low' }[urgency],
        penalty: penalties[Math.floor(Math.random() * penalties.length)],
        jurisdiction: 'PAN India',
        desc: t.desc,
        summary: t.summary,
        sector: sector,
        isActive: true,
    };
}

function generateTemplateSummary(title, regulator, desc) {
    return `${regulator} requires immediate action on "${title.substring(0, 60)}". Review the circular and assign responsibility to your Legal or Compliance team with a firm deadline this week.`;
}

module.exports = { generateAISummary, generateNewRegulationAlert };
