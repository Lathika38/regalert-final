// seed/seed.js — Auto-populates MongoDB with all RegAlert data
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const Obligation = require('../models/Obligation');
const Profile = require('../models/Profile');
const AuditLog = require('../models/AuditLog');

const ALERTS = [
    // ── FinTech ─────────────────────────────────────────────────────────────────
    { alertId: 'f1', reg: 'RBI', bcls: 'b-rbi', title: 'Mandatory TPAP Registration for UPI Payment Apps', date: 'Mar 8, 2026', deadline: 'May 8, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹50L', desc: 'All Third-Party Application Providers (TPAPs) offering UPI payment services must register with the NPCI within 60 days.', summary: 'RBI wants all UPI apps to formally register with NPCI. You must file registration documents within 60 days from March 8, 2026.', sector: 'FinTech' },
    { alertId: 'f2', reg: 'RBI', bcls: 'b-rbi', title: 'Updated KYC Norms for Payment Aggregators & Gateways', date: 'Mar 5, 2026', deadline: 'Mar 26, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹1Cr', desc: 'RBI has revised the KYC requirements for all licensed Payment Aggregators. V-CIP flow must be updated.', summary: 'Your KYC process must be updated to match the new RBI framework. Update your onboarding flow before March 26.', sector: 'FinTech' },
    { alertId: 'f3', reg: 'SEBI', bcls: 'b-sebi', title: 'AIF Category II — Enhanced Quarterly Reporting Format', date: 'Mar 1, 2026', deadline: 'Apr 15, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹5L/day', desc: 'SEBI has updated the quarterly reporting format for AIF Category II funds.', summary: 'If you run an AIF Category II fund, update your quarterly report format before April 15.', sector: 'FinTech' },
    { alertId: 'f4', reg: 'MCA', bcls: 'b-mca', title: 'Annual Return Filing (MGT-7A) — Extended Deadline', date: 'Feb 28, 2026', deadline: 'Mar 31, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹100/day', desc: 'MCA has extended the due date for MGT-7A annual return filing for small companies to March 31, 2026.', summary: 'File your company Annual Return (MGT-7A) by March 31 on the MCA portal.', sector: 'FinTech' },
    { alertId: 'f5', reg: 'RBI', bcls: 'b-rbi', title: 'Master Direction — Prepaid Payment Instruments (PPI) Update', date: 'Feb 20, 2026', deadline: 'May 5, 2026', urgency: 'LOW', ucls: 'u-low', penalty: '₹10L', desc: 'RBI updated the Master Directions for Prepaid Payment Instruments to include stricter merchant onboarding requirements.', summary: 'PPI wallets must update merchant onboarding with stricter verification and add new fraud monitoring dashboards.', sector: 'FinTech' },
    { alertId: 'f6', reg: 'DPDP', bcls: 'b-dpdp', title: 'Digital Personal Data Protection — Consent Manager Rules', date: 'Mar 9, 2026', deadline: 'Apr 23, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹250Cr', desc: 'MCA has published rules under the DPDP Act requiring all data fiduciaries collecting payment data to appoint a registered Consent Manager.', summary: 'You must appoint a Consent Manager, display clear consent banners, and allow users to withdraw consent easily. Max penalty: ₹250 Crore.', sector: 'FinTech' },
    // ── SaaS ────────────────────────────────────────────────────────────────────
    { alertId: 's1', reg: 'DPDP', bcls: 'b-dpdp', title: 'DPDP Act — Consent Manager Appointment Rules', date: 'Mar 9, 2026', deadline: 'Apr 23, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹250Cr', desc: 'All SaaS companies processing personal data of Indian users must appoint a registered Consent Manager within 45 days.', summary: 'Your SaaS product collects user data, so you must appoint a Consent Manager and update consent banners.', sector: 'SaaS' },
    { alertId: 's2', reg: 'MCA', bcls: 'b-mca', title: 'Annual Return MGT-7A Filing', date: 'Feb 28, 2026', deadline: 'Mar 31, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹100/day', desc: 'Annual return filing mandatory for all private limited companies.', summary: 'File your Annual Return on MCA portal by March 31, 2026.', sector: 'SaaS' },
    { alertId: 's3', reg: 'TRAI', bcls: 'b-trai', title: 'Cloud Data Localisation for SaaS Providers', date: 'Feb 15, 2026', deadline: 'Jun 15, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹50L', desc: 'TRAI requires all SaaS providers serving Indian government entities to store data on India-based cloud servers.', summary: 'If you serve any Indian government client, migrate their data to India-based servers by June 15.', sector: 'SaaS' },
    { alertId: 's4', reg: 'SEBI', bcls: 'b-sebi', title: 'Startup Fundraising Disclosure Norms (DRHP amendments)', date: 'Feb 20, 2026', deadline: 'Apr 1, 2026', urgency: 'LOW', ucls: 'u-low', penalty: '₹1L', desc: 'SEBI has updated DRHP disclosure requirements for SaaS startups planning IPO or SME listing.', summary: 'DRHP now requires additional disclosures about data handling, customer concentration.', sector: 'SaaS' },
    // ── NBFC ────────────────────────────────────────────────────────────────────
    { alertId: 'n1', reg: 'RBI', bcls: 'b-rbi', title: 'NBFC-MFI Master Directions — Interest Rate Cap Revised', date: 'Mar 9, 2026', deadline: 'Apr 8, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹1Cr', desc: 'RBI has revised the interest rate cap for NBFC-MFIs. All loan products must be repriced accordingly within 30 days.', summary: 'All your NBFC-MFI loan products must comply with the new interest rate caps. Update your loan management system.', sector: 'NBFC' },
    { alertId: 'n2', reg: 'RBI', bcls: 'b-rbi', title: 'Mandatory Credit Bureau Reporting for NBFCs > ₹100Cr AUM', date: 'Mar 7, 2026', deadline: 'Mar 28, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹25L', desc: 'All NBFCs with AUM above ₹100 Crore must integrate with all four credit bureaus and report monthly.', summary: 'Integrate your loan system with all four credit bureaus immediately. The March 28 deadline is very close.', sector: 'NBFC' },
    { alertId: 'n3', reg: 'SEBI', bcls: 'b-sebi', title: 'NCD Issuance Guidelines — Trustee Obligations Updated', date: 'Mar 2, 2026', deadline: 'Apr 2, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹10L', desc: 'SEBI has amended the NCD guidelines to strengthen trustee oversight.', summary: 'If you issue NCDs, update your debenture trustee agreements and ensure quarterly financial data reporting is automated.', sector: 'NBFC' },
    { alertId: 'n4', reg: 'MCA', bcls: 'b-mca', title: 'Board Composition — Independent Director Requirement', date: 'Feb 25, 2026', deadline: 'May 25, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹1L/day', desc: 'MCA notification requires all NBFCs with net worth above ₹50Cr to have at least one-third independent directors.', summary: 'If your NBFC net worth exceeds ₹50 Crore, appoint independent directors to make up at least 1/3rd of your board.', sector: 'NBFC' },
    // ── EdTech ──────────────────────────────────────────────────────────────────
    { alertId: 'e1', reg: 'DPDP', bcls: 'b-dpdp', title: 'DPDP Act — Student & Minor Data Protection Rules', date: 'Mar 8, 2026', deadline: 'Apr 22, 2026', urgency: 'HIGH', ucls: 'u-high', penalty: '₹200Cr', desc: 'EdTech platforms processing data of minors (under 18) must obtain verified parental consent.', summary: 'Since you serve students, you must get verified parental consent for users under 18 and designate a Data Protection Officer.', sector: 'EdTech' },
    { alertId: 'e2', reg: 'TRAI', bcls: 'b-trai', title: 'OTT Education Platform Content Classification Guidelines', date: 'Mar 1, 2026', deadline: 'May 1, 2026', urgency: 'MED', ucls: 'u-med', penalty: '₹25L', desc: 'All OTT education platforms must classify content by age group and display classification labels per TRAI guidelines.', summary: 'Label all your video courses with age-appropriate classification labels (5+, 12+, 18+). Mandatory per TRAI.', sector: 'EdTech' },
    { alertId: 'e3', reg: 'MCA', bcls: 'b-mca', title: 'FDI Policy Update — EdTech E-Commerce Rules', date: 'Feb 20, 2026', deadline: 'Ongoing', urgency: 'LOW', ucls: 'u-low', penalty: 'FEMA violation', desc: 'DPIIT clarified FDI eligibility for EdTech companies operating under the e-commerce model.', summary: '100% FDI is now permitted for EdTech companies under the automatic route. Update your cap table documentation.', sector: 'EdTech' },
];

const OBLIGATIONS = [
    // ── FinTech ─────────────────────────────────────────────────────────────────
    { title: 'TPAP Registration with NPCI', sub: 'RBI Circular — Mar 2026', reg: 'RBI', bcls: 'b-rbi', dl: 'May 8, 2026', dcls: 'dl-red', status: 'Pending', scls: 'p-pending', owner: 'CEO', priority: 'High', sector: 'FinTech' },
    { title: 'KYC Policy Document Revision', sub: 'PA/PG Updated Guidelines', reg: 'RBI', bcls: 'b-rbi', dl: 'Mar 26, 2026', dcls: 'dl-red', status: 'Overdue', scls: 'p-overdue', owner: 'Legal', priority: 'Critical', sector: 'FinTech' },
    { title: 'DPDP Consent Manager Appointment', sub: 'DPDP Act 2023', reg: 'DPDP', bcls: 'b-dpdp', dl: 'Apr 23, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CTO', priority: 'High', sector: 'FinTech' },
    { title: 'AIF Q4 Quarterly Report — SEBI Portal', sub: 'SEBI AIF Circular', reg: 'SEBI', bcls: 'b-sebi', dl: 'Apr 15, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CFO', priority: 'Medium', sector: 'FinTech' },
    { title: 'Annual Return MGT-7A Filing', sub: 'Companies Act 2013', reg: 'MCA', bcls: 'b-mca', dl: 'Mar 31, 2026', dcls: 'dl-red', status: 'Pending', scls: 'p-pending', owner: 'CS', priority: 'High', sector: 'FinTech' },
    { title: 'PPI Merchant Onboarding Update', sub: 'RBI Master Direction — PPI', reg: 'RBI', bcls: 'b-rbi', dl: 'May 5, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'Tech', priority: 'Medium', sector: 'FinTech' },
    { title: 'Board Resolution — New Compliance Updates', sub: 'Monthly compliance meeting', reg: 'MCA', bcls: 'b-mca', dl: 'Mar 15, 2026', dcls: 'dl-green', status: 'Done', scls: 'p-done', owner: 'Board', priority: 'Low', sector: 'FinTech' },
    { title: 'Internal Data Audit Q1', sub: 'DPDP & RBI requirement', reg: 'DPDP', bcls: 'b-dpdp', dl: 'Feb 28, 2026', dcls: 'dl-green', status: 'Done', scls: 'p-done', owner: 'CTO', priority: 'Medium', sector: 'FinTech' },
    // ── SaaS ────────────────────────────────────────────────────────────────────
    { title: 'Appoint Consent Manager (DPDP)', sub: 'DPDP Act 2023', reg: 'DPDP', bcls: 'b-dpdp', dl: 'Apr 23, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CTO', priority: 'High', sector: 'SaaS' },
    { title: 'Update Privacy Policy for DPDP Compliance', sub: 'DPDP Rules 2026', reg: 'MCA', bcls: 'b-mca', dl: 'Mar 31, 2026', dcls: 'dl-red', status: 'Overdue', scls: 'p-overdue', owner: 'Legal', priority: 'Critical', sector: 'SaaS' },
    { title: 'Annual Return MGT-7A Filing', sub: 'Companies Act', reg: 'MCA', bcls: 'b-mca', dl: 'Mar 31, 2026', dcls: 'dl-red', status: 'Pending', scls: 'p-pending', owner: 'CS', priority: 'High', sector: 'SaaS' },
    { title: 'Data Localisation: Govt Client Servers', sub: 'TRAI guidelines', reg: 'TRAI', bcls: 'b-trai', dl: 'Jun 15, 2026', dcls: 'dl-green', status: 'Pending', scls: 'p-pending', owner: 'CTO', priority: 'Medium', sector: 'SaaS' },
    // ── NBFC ────────────────────────────────────────────────────────────────────
    { title: 'Update Interest Rate Cap in LMS', sub: 'RBI MFI Master Directions', reg: 'RBI', bcls: 'b-rbi', dl: 'Apr 8, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'Tech', priority: 'High', sector: 'NBFC' },
    { title: 'Credit Bureau Integration (All 4)', sub: 'RBI Circular — Mar 2026', reg: 'RBI', bcls: 'b-rbi', dl: 'Mar 28, 2026', dcls: 'dl-red', status: 'Overdue', scls: 'p-overdue', owner: 'CTO', priority: 'Critical', sector: 'NBFC' },
    { title: 'Debenture Trustee Quarterly Report', sub: 'SEBI NCD Circular', reg: 'SEBI', bcls: 'b-sebi', dl: 'Apr 2, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CFO', priority: 'Medium', sector: 'NBFC' },
    { title: 'Board Reconstitution — Ind. Director', sub: 'MCA Notification', reg: 'MCA', bcls: 'b-mca', dl: 'May 25, 2026', dcls: 'dl-green', status: 'Done', scls: 'p-done', owner: 'CEO', priority: 'Medium', sector: 'NBFC' },
    // ── EdTech ──────────────────────────────────────────────────────────────────
    { title: 'Implement Parental Consent Flow (Minors)', sub: 'DPDP Act — Minor Data Rules', reg: 'DPDP', bcls: 'b-dpdp', dl: 'Apr 22, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CTO', priority: 'High', sector: 'EdTech' },
    { title: 'Designate Data Protection Officer (DPO)', sub: 'DPDP Act 2023', reg: 'DPDP', bcls: 'b-dpdp', dl: 'Apr 22, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'CEO', priority: 'High', sector: 'EdTech' },
    { title: 'Content Classification Labels on Videos', sub: 'TRAI OTT Guidelines', reg: 'TRAI', bcls: 'b-trai', dl: 'May 1, 2026', dcls: 'dl-yellow', status: 'Pending', scls: 'p-pending', owner: 'Tech', priority: 'Medium', sector: 'EdTech' },
    { title: 'Annual Return MGT-7A Filing', sub: 'Companies Act', reg: 'MCA', bcls: 'b-mca', dl: 'Mar 31, 2026', dcls: 'dl-green', status: 'Done', scls: 'p-done', owner: 'CS', priority: 'Medium', sector: 'EdTech' },
];

const AUDIT_SEED = [
    { icon: 'fa-check-circle', iconBg: 'rgba(16,185,129,0.15)', iconColor: '#10b981', action: 'Obligation Completed', detail: 'KYC Policy v2 approved and uploaded — Legal Team', sector: 'FinTech', time: 'Today 11:42 AM' },
    { icon: 'fa-bell', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6', action: 'New Alert Detected', detail: 'RBI circular on TPAP registration — auto-matched to FinTech profile', sector: 'FinTech', time: 'Today 9:15 AM' },
    { icon: 'fa-user-plus', iconBg: 'rgba(99,102,241,0.15)', iconColor: '#6366f1', action: 'Team Member Notified', detail: 'CFO notified about MGT-7A filing deadline', sector: 'FinTech', time: 'Yesterday 4:30 PM' },
    { icon: 'fa-file-export', iconBg: 'rgba(245,158,11,0.15)', iconColor: '#f59e0b', action: 'Report Exported', detail: 'Q1 2026 Compliance Report exported by Arjun K', sector: 'FinTech', time: 'Yesterday 2:10 PM' },
    { icon: 'fa-shield-alt', iconBg: 'rgba(239,68,68,0.15)', iconColor: '#ef4444', action: 'Risk Level Changed', detail: 'Penalty exposure increased to ₹3.1Cr after 2 new critical alerts', sector: 'FinTech', time: 'Mar 9, 2026' },
    { icon: 'fa-cog', iconBg: 'rgba(34,211,238,0.15)', iconColor: '#22d3ee', action: 'Profile Updated', detail: 'Business sector updated from "Payments" to "FinTech / Payments"', sector: 'FinTech', time: 'Mar 8, 2026' },
];

const DEFAULT_PROFILE = {
    companyName: "Arjun's FinTech Pvt Ltd",
    sector: 'FinTech / Payments',
    licence: 'Payment Aggregator (RBI)',
    hq: 'Mumbai, Maharashtra',
    activeSector: 'FinTech',
    teamMembers: [
        { name: 'Arjun Kumar', role: 'CEO', email: 'arjun@fintech.com', receives: 'Strategic & High-impact alerts', active: true },
        { name: 'Priya Sharma', role: 'Legal Counsel', email: 'priya@fintech.com', receives: 'All RBI, SEBI, MCA alerts', active: true },
        { name: 'Raj Mehta', role: 'CFO', email: 'raj@fintech.com', receives: 'Filing deadlines, GST, MCA', active: true },
        { name: 'Ankit T.', role: 'CTO', email: 'ankit@fintech.com', receives: 'DPDP, tech policy, API mandates', active: true },
        { name: 'Kavya N.', role: 'Company Secretary', email: 'kavya@fintech.com', receives: 'MCA filings, board resolutions', active: true },
    ]
};

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB:', process.env.MONGODB_URI);

        // Clear existing
        await Alert.deleteMany({});
        await Obligation.deleteMany({});
        await AuditLog.deleteMany({});
        await Profile.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Insert fresh data
        await Alert.insertMany(ALERTS);
        console.log(`✅ Inserted ${ALERTS.length} alerts`);

        await Obligation.insertMany(OBLIGATIONS);
        console.log(`✅ Inserted ${OBLIGATIONS.length} obligations`);

        await AuditLog.insertMany(AUDIT_SEED);
        console.log(`✅ Inserted ${AUDIT_SEED.length} audit log entries`);

        await Profile.create(DEFAULT_PROFILE);
        console.log('✅ Created default business profile');

        console.log('\n🎉 DATABASE SEEDED SUCCESSFULLY!');
        console.log('   Run: node server.js  to start the backend');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
