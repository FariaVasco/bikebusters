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

const sendEmail = async (to, subject, bikeDetails, paymentOrInvoiceLink) => {
  console.log('Sending email with the following details:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Bike Details:', JSON.stringify(bikeDetails, null, 2));
  console.log('Payment/Invoice Link:', paymentOrInvoiceLink);
  
  try {
    // Generate QR code as a Buffer
    const qrCodeBuffer = await QRCode.toBuffer(paymentOrInvoiceLink);
    
    let htmlContent;
    
    if (Array.isArray(bikeDetails.bikes)) {
      // Multiple bikes case
      let bikesHtml = '';
      for (const bike of bikeDetails.bikes) {
        bikesHtml += `
          <li>
            <strong>${bike.make} ${bike.model}</strong> - Serial Number: ${bike.serialNumber}
          </li>
        `;
      }

      htmlContent = `
        <h1>Great news!</h1>
        <p>We've found multiple bikes from your company.</p>
        <ul>
          ${bikesHtml}
        </ul>
        <p>You can pick them up at: ${bikeDetails.location}</p>
        <p>To complete the process, please view the invoice using the link below:</p>
        <a href="${paymentOrInvoiceLink}">View Invoice</a>
        <p>Or scan this QR code:</p>
        <img src="cid:qrcode" alt="Invoice QR Code" />
        <p>Thank you for using BikeBusters!</p>
      `;
    } else {
      // Single bike case
      htmlContent = `
        <h1>Great news!</h1>
        <p>We've found your bike (${bikeDetails.make} ${bikeDetails.model}).</p>
        <p>You can pick it up at: ${bikeDetails.location}</p>
        <p>To complete the process, please make a payment using the link below:</p>
        <a href="${paymentOrInvoiceLink}">Make Payment</a>
        <p>Or scan this QR code:</p>
        <img src="cid:qrcode" alt="Payment QR Code" />
        <p>Thank you for using BikeBusters!</p>
      `;
    }

    const info = await transporter.sendMail({
      from: '"BikeBusters" <fariavasco96@gmail.com>',
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