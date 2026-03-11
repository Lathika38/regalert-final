const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    icon: { type: String, default: 'fa-info-circle' },
    iconBg: { type: String, default: 'rgba(59,130,246,0.15)' },
    iconColor: { type: String, default: '#3b82f6' },
    action: { type: String, required: true },
    detail: { type: String },
    sector: { type: String, default: 'FinTech' },
    time: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
