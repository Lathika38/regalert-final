const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    alertId: { type: String, required: true, unique: true },
    reg: { type: String, required: true },    // RBI, SEBI, MCA, TRAI, DPDP
    bcls: { type: String },                    // CSS badge class
    title: { type: String, required: true },
    date: { type: String },                    // Published date
    deadline: { type: String },
    urgency: { type: String, enum: ['HIGH', 'MED', 'LOW'], default: 'MED' },
    ucls: { type: String },
    penalty: { type: String },
    jurisdiction: { type: String, default: 'PAN India' },
    desc: { type: String },
    summary: { type: String },
    sector: { type: String, enum: ['FinTech', 'SaaS', 'NBFC', 'EdTech', 'All'], default: 'All' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
