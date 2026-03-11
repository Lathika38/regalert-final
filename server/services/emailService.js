const nodemailer = require('nodemailer');

const sendDeadlineEmail = async (toEmail, alertTitle, deadline, penalty) => {
    // If no credentials, just log it instead of erroring
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`✉️ [Mock Email] Reminder sent to ${toEmail}: "${alertTitle}" is due on ${deadline}. (Add Nodemailer credentials in .env to send real emails)`);
        return { success: true, mock: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS.replace(/\s/g, ''), // Remove spaces from app password
            },
        });

        // Verify connection before sending
        await transporter.verify();

        const mailOptions = {
            from: '"RegAlert Notification" <' + process.env.EMAIL_USER + '>',
            to: toEmail,
            subject: `🚨 RegAlert Compliance Alert: ${alertTitle.substring(0, 40)}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">🚨 RegAlert Compliance Alert</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>You have an upcoming regulatory deadline that requires your attention.</p>
            <div style="padding: 15px; border-left: 4px solid #f59e0b; background: #fffbeb; border-radius: 4px; margin: 15px 0;">
              <strong>Regulation Title:</strong> ${alertTitle}<br><br>
              <strong>Deadline:</strong> <span style="color: #d97706;">${deadline || 'Check Dashboard'}</span><br>
              <strong>Potential Penalty:</strong> <span style="color: #ef4444;">${penalty || 'High Risk'}</span>
            </div>
            <p>Please log in to your <strong>RegAlert Dashboard</strong> to review and complete this compliance obligation immediately.</p>
            <p style="color: #6b7280; font-size: 12px;">— RegAlert Automated Compliance System | Sent at ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ [Real Email] Successfully sent to ${toEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        // Return specific error messages for common issues
        if (error.message.includes('Invalid login') || error.message.includes('Username and Password')) {
            return { success: false, message: 'Gmail App Password is invalid. Please generate a new App Password in your Google Account Security settings.' };
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
            return { success: false, message: 'Network error: Could not connect to Gmail servers. Check your internet connection.' };
        }
        return { success: false, message: error.message };
    }
};

module.exports = { sendDeadlineEmail };
