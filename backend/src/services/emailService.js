const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
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

const generateInvoicePDF = (manufacturer, bikes) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Add content to PDF
    doc.fontSize(20).text('BikeBusters Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('BikeBusters - Your Trusted Bike Recovery Service', { align: 'center' });
    doc.fontSize(12).text('123 Bike Street, Amsterdam, Netherlands', { align: 'center' });
    doc.moveDown();
    doc.text(`Invoice for: ${manufacturer}`, { align: 'left' });
    doc.moveDown();
    
    // Group bikes by model
    const bikesByModel = bikes.reduce((acc, bike) => {
      if (!acc[bike.model]) acc[bike.model] = [];
      acc[bike.model].push(bike);
      return acc;
    }, {});

    let totalCost = 0;
    
    doc.text('Recovered Bikes:', { underline: true });
    for (const [model, modelBikes] of Object.entries(bikesByModel)) {
      const cost = modelBikes.length * 100;
      totalCost += cost;
      doc.text(`${model}: ${modelBikes.length} bikes - €${cost}`);
      modelBikes.forEach(bike => {
        doc.fontSize(10).text(`  Serial Number: ${bike.serialNumber}`);
      });
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.fontSize(14).text(`Total Cost: €${totalCost}`, { bold: true });

    doc.end();
  });
};

const sendEmail = async (to, subject, bikeDetails, paymentOrInvoiceLink) => {
  console.log('Sending email with the following details:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Bike Details:', JSON.stringify(bikeDetails, null, 2));
  console.log('Payment/Invoice Link:', paymentOrInvoiceLink);

  try {
    let htmlContent;
    let attachments = [];

    if (Array.isArray(bikeDetails.bikes)) {
      // B2B case: Multiple bikes
      const pdfBuffer = await generateInvoicePDF(bikeDetails.manufacturer, bikeDetails.bikes);
      
      htmlContent = `
        <h1>Great news!</h1>
        <p>We've found multiple bikes from your company.</p>
        <p>You can pick them up at: ${bikeDetails.location}</p>
        <p>Please find attached the invoice for the recovered bikes.</p>
        <p>Thank you for using BikeBusters!</p>
      `;

      attachments.push({
        filename: 'invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } else {
      // B2C case: Single bike
      const qrCodeBuffer = await QRCode.toBuffer(paymentOrInvoiceLink);
      
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

      attachments.push({
        filename: 'qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode'
      });
    }

    const mailOptions = {
      from: '"BikeBusters" <your-email@example.com>',
      to: to,
      subject: subject,
      html: htmlContent,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;