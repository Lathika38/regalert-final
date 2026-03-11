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
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: '"RegAlert Notification" <' + process.env.EMAIL_USER + '>',
            to: toEmail,
            subject: `🚨 Compliance Deadline Alert: ${alertTitle.substring(0, 30)}...`,
            html: `
        <h2>Compliance Deadline Approaching</h2>
        <p>You have an upcoming regulatory deadline.</p>
        <div style="padding: 15px; border-left: 4px solid #f59e0b; background: #fffbeb;">
          <strong>Title:</strong> ${alertTitle}<br>
          <strong>Deadline:</strong> <span style="color: #d97706;">${deadline}</span><br>
          <strong>Potential Penalty:</strong> <span style="color: #ef4444;">${penalty}</span>
        </div>
        <p>Please log in to your RegAlert dashboard to complete this obligation.</p>
        <p>- RegAlert System</p>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ [Real Email] Sent to ${toEmail}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { sendDeadlineEmail };
