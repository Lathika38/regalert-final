const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const { generateAISummary } = require('./aiService');
const { feed } = require('../feeds/regulationFeed');

// 1. Process Hackathon Simulated Feed (Perfectly structured MVP simulation)
async function checkForNewRegulations() {
    try {
        console.log('🔄 Checking regulation feeds (Simulated MVP Backend)...');
        
        let addedCount = 0;
        
        for (const item of feed) {
            const existing = await Alert.findOne({ title: item.title });
            if (!existing) {
                // Generate AI Summary using Gemini Prompt
                const aiSummary = await generateAISummary(item.title, item.regulator, item.text);
                
                // Get badge class colors dynamically
                const lowerReg = item.regulator.toLowerCase();
                const bcls = `b-${lowerReg}`;
                
                const newAlert = new Alert({
                    alertId: `live_${lowerReg}_` + Date.now() + Math.floor(Math.random() * 1000),
                    reg: item.regulator,
                    bcls: bcls,
                    title: item.title,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    deadline: 'TBD',
                    urgency: 'HIGH',
                    ucls: 'u-high',
                    penalty: 'High Risk',
                    jurisdiction: 'PAN India',
                    desc: item.text,
                    summary: aiSummary,
                    sector: 'FinTech',
                    isActive: true
                });

                await newAlert.save();
                
                await AuditLog.create({
                    icon: 'fa-globe', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6',
                    action: 'Regulatory Feed Processed',
                    detail: `Processed internal feed: "${item.title.substring(0, 50)}..."`,
                    sector: 'FinTech',
                    time: new Date().toLocaleString('en-IN')
                });
                addedCount++;
            }
        }
        console.log(`[Scheduled Bot] MVP Feed processing complete. ${addedCount} new alerts saved to MongoDB.`);
    } catch (error) {
        console.error('⚠️ [Scheduled Bot] Feed error:', error.message);
    }
}

// Global Export
module.exports = { runAllScrapers: checkForNewRegulations };
