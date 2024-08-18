const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generatePaymentLink = (bikeId) => {
  return `http://localhost:5001/pay/${bikeId}`;
};

const sendEmail = async (to, subject, bikeDetails, paymentLink) => {
  try {
    // Generate QR code as a Buffer
    const qrCodeBuffer = await QRCode.toBuffer(paymentLink);
    
    const htmlContent = `
      <h1>Great news!</h1>
      <p>We've found your bike (${bikeDetails.make} ${bikeDetails.model}).</p>
      <p>You can pick it up at: ${bikeDetails.location}</p>
      <p>To complete the process, please make a payment using the link below:</p>
      <a href="${paymentLink}">Make Payment</a>
      <p>Or scan this QR code:</p>
      <img src="cid:qrcode" alt="Payment QR Code" />
      <p>Thank you for using BikeBusters!</p>
    `;

    const info = await transporter.sendMail({
      from: '"BikeBusters" <your-email@example.com>',
      to: to,
      subject: subject,
      html: htmlContent,
      attachments: [{
        filename: 'qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode'
      }]
    });

    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;