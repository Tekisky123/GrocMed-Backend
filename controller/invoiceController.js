import PDFDocument from 'pdfkit';
import Order from '../model/orderModel.js';

export const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('customer');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const doc = new PDFDocument({ margin: 50 });

        // HTTP Headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order._id.toString().slice(-6)}.pdf`);

        doc.pipe(res);

        // --- Branding ---
        doc.fillColor('#F8800E')
           .fontSize(28)
           .text('GrocMed', 50, 50, { continued: true })
           .fillColor('#333')
           .fontSize(14)
           .text(' Pvt Ltd', { baseline: 'bottom' });

        doc.fillColor('#333')
           .fontSize(20)
           .text('TAX INVOICE', 400, 50, { align: 'right' });

        doc.moveDown(2);

        // --- Info Section ---
        const startY = doc.y;
        
        // Sold By
        doc.fillColor('#F8800E').fontSize(10).text('SOLD BY / SELLER', 50, startY);
        doc.fillColor('#000').fontSize(12).text('GrocMed Private Limited', 50, startY + 15);
        doc.fillColor('#666').fontSize(9).text('16-2-705/1/1, Old Malakpet,\nHyderabad, Telangana 500036\nGSTIN: 36AAACZ8867B1Z1\nFSSAI: 10020064002537', 50, startY + 32);

        // Bill To
        let shippingAddr = {};
        try {
            shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
        } catch(e) {
            shippingAddr = order.shippingAddress || {};
        }
        
        const addressStr = `${shippingAddr.street || ''}, ${shippingAddr.city || ''}, ${shippingAddr.state || ''} - ${shippingAddr.zip || ''}`;

        doc.fillColor('#F8800E').fontSize(10).text('BILL TO / SHIPPING TO', 350, startY);
        doc.fillColor('#000').fontSize(12).text(order.customer?.name || 'Customer', 350, startY + 15);
        doc.fillColor('#666').fontSize(9).text(`${addressStr}\nPhone: ${order.customer?.phone || 'N/A'}\nPayment: ${order.paymentMethod?.toUpperCase()}`, 350, startY + 32);

        doc.moveDown(5);

        // --- Table Header ---
        const tableTop = doc.y + 40;
        doc.rect(50, tableTop, 500, 20).fill('#f8f8f8').stroke('#ddd');
        doc.fillColor('#333').fontSize(9).text('#', 60, tableTop + 6);
        doc.text('Product Description', 100, tableTop + 6);
        doc.text('Qty', 350, tableTop + 6);
        doc.text('Unit Price', 400, tableTop + 6);
        doc.text('Total', 500, tableTop + 6);

        // --- Table Rows ---
        let rowY = tableTop + 20;
        order.items.forEach((item, i) => {
            doc.fillColor('#000').fontSize(9);
            doc.text(i + 1, 60, rowY + 6);
            doc.text(item.name || 'Product', 100, rowY + 6);
            doc.text(item.quantity, 350, rowY + 6);
            doc.text(`Rs. ${item.price.toFixed(2)}`, 400, rowY + 6);
            doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 500, rowY + 6);
            
            doc.moveTo(50, rowY + 20).lineTo(550, rowY + 20).stroke('#eee');
            rowY += 20;
        });

        // --- Totals ---
        doc.moveDown(2);
        const totalY = doc.y + 10;
        doc.fillColor('#F8800E').fontSize(12).text('Grand Total:', 400, totalY);
        doc.fillColor('#000').fontSize(14).text(`Rs. ${order.totalAmount.toLocaleString()}`, 500, totalY);

        // --- Footer ---
        doc.moveDown(4);
        doc.fillColor('#aaa').fontSize(8).text('Thank you for shopping with GrocMed!', { align: 'center' });
        doc.text('This is a computer generated invoice and does not require a signature.', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};
