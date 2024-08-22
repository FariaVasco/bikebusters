const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Bike = require('../models/Bike');

/**
 * @swagger
 * /api/invoices/{manufacturer}:
 *   get:
 *     summary: Generate an invoice for a manufacturer
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manufacturer
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the manufacturer
 *     responses:
 *       200:
 *         description: Returns a PDF invoice
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No bikes found for the manufacturer
 *       500:
 *         description: Server error
 */
router.get('/:manufacturer', async (req, res) => {
  try {
    const { manufacturer } = req.params;
    const bikes = await Bike.find({ make: manufacturer, reportStatus: 'resolved' });
    
    if (bikes.length === 0) {
      return res.status(404).json({ message: 'No resolved bikes found for this manufacturer' });
    }

    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${manufacturer}.pdf`);

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Manufacturer: ${manufacturer}`);
    doc.moveDown();
    
    bikes.forEach((bike, index) => {
      doc.fontSize(12).text(`${index + 1}. ${bike.make} ${bike.model} - Serial Number: ${bike.serialNumber}`);
    });

    doc.moveDown();
    const total = bikes.length * 100; // 100€ per bike
    doc.fontSize(14).text(`Total: €${total}`);

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Error generating invoice' });
  }
});

module.exports = router;