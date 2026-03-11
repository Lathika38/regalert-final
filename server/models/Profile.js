const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    companyName: { type: String, default: "Arjun's FinTech Pvt Ltd" },
    sector: { type: String, default: 'FinTech / Payments' },
    licence: { type: String, default: 'Payment Aggregator (RBI)' },
    hq: { type: String, default: 'Mumbai, Maharashtra' },
    activeSector: { type: String, default: 'FinTech' },
    alertPrefs: {
        emailAlerts: { type: Boolean, default: true },
        slackAlerts: { type: Boolean, default: true },
        whatsappAlerts: { type: Boolean, default: false },
        deadlineReminders: { type: Boolean, default: true },
        weeklyDigest: { type: Boolean, default: true },
        aiSummary: { type: Boolean, default: true },
    },
    teamMembers: [{
        name: String,
        role: String,
        email: String,
        receives: String,
        active: { type: Boolean, default: true },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
