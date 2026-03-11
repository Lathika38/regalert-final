const mongoose = require('mongoose');

const ObligationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    sub: { type: String },
    reg: { type: String, required: true },
    bcls: { type: String },
    dl: { type: String, required: true },   // deadline string
    dcls: { type: String, default: 'dl-yellow' },
    status: { type: String, enum: ['Pending', 'Done', 'Overdue'], default: 'Pending' },
    scls: { type: String, default: 'p-pending' },
    owner: { type: String, default: 'CEO' },
    priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
    sector: { type: String, enum: ['FinTech', 'SaaS', 'NBFC', 'EdTech'], required: true },
    notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Obligation', ObligationSchema);
