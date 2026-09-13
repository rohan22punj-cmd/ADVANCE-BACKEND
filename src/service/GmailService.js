require('dotenv').config();
const nodemailer = require('nodemailer');

const hasEmailConfig = Boolean(process.env.EMAIL_USER && process.env.CLIENT_ID);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});

// Function to send email
const sendEmail = async(to, subject, text, html) => {
    if (process.env.NODE_ENV === 'test' || !hasEmailConfig) {
        return;
    }
    try {
        const info = await transporter.sendMail({
            from: `"Ledgerline" <${process.env.EMAIL_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
            html, // html body
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log('Message sent: %s', info.messageId);
        }
    } catch (error) {
        console.error('Error sending email:', error.message);
    }
};
async function sendRegistrationEmail(to, name) {
    const subject = 'Welcome to Our Service!';
    const text = `Hi ${name},\n\nThank you for registering with us! We're excited to have you on board.\n\nBest regards,\nThe Team`;
    const html = `
        <p>Hi ${name},</p>
        <p>Thank you for registering with us! We're excited to have you on board.</p>
        <p>Best regards,<br>The Team</p>
    `;

    await sendEmail(to, subject, text, html);
}
async function sendTransactionEmail(to, name, transactionDetails) {
    const subject = 'Transaction Notification';
    const text = `Hi ${name},\n\nYour transaction has been processed successfully. Here are the details:\n\n${transactionDetails}\n\nBest regards,\nThe Team`;
    const html = `
        <p>Hi ${name},</p>
        <p>Your transaction has been processed successfully. Here are the details:</p>
        <p>${transactionDetails}</p>
        <p>Best regards,<br>The Team</p>
    `;

    await sendEmail(to, subject, text, html);
}
async function failureNotificationEmail(to, name, errorDetails) {
    const subject = 'Transaction Failure Notification';
    const text = `Hi ${name},\n\nWe regret to inform you that your recent transaction could not be processed. Here are the details:\n\n${errorDetails}\n\nPlease contact support for further assistance.\n\nBest regards,\nThe Team`;
    const html = `
        <p>Hi ${name},</p>
        <p>We regret to inform you that your recent transaction could not be processed. Here are the details:</p>
    <p>${errorDetails}</p>
        <p>Please contact support for further assistance.</p>
        <p>Best regards,<br>The Team</p>
    `;
    await sendEmail(to, subject, text, html);
}

// Verify the connection configuration in development only when configured
if (hasEmailConfig && process.env.NODE_ENV !== 'test') {
    transporter.verify((error, success) => {
        if (error) {
            console.warn('Warning: Email server connection failed:', error.message);
        } else {
            console.log('Email server is ready to send messages');
        }
    });
}

module.exports = { sendEmail, sendRegistrationEmail, sendTransactionEmail, failureNotificationEmail };