import PDFDocument from 'pdfkit';
import Order from '../model/orderModel.js';

export const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('customer');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // HTTP Headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order._id.toString().slice(-6)}.pdf`);

        doc.pipe(res);

        // --- Layout Helpers ---
        const pageWidth = 595.28;
        const leftMargin = 30;
        const rightMargin = 30;
        const contentWidth = pageWidth - leftMargin - rightMargin;

        // --- Header Section ---
        try {
            const logoUrl = 'https://grocmed.com/assets/logo-removebg-preview-DM8hPqCZ.png';
            const response = await fetch(logoUrl);
            const arrayBuffer = await response.arrayBuffer();
            const logoBuffer = Buffer.from(arrayBuffer);
            
            // Add Logo
            doc.image(logoBuffer, 30, 30, { height: 40 });
            
            // Brand Name next to logo
            doc.fillColor('#F8800E')
               .fontSize(24)
               .font('Helvetica-Bold')
               .text('GrocMed', 80, 42);
        } catch (logoError) {
            console.error('Error adding logo to PDF:', logoError);
            // Fallback to text if logo fails
            doc.fillColor('#F8800E')
               .fontSize(24)
               .font('Helvetica-Bold')
               .text('GrocMed', 30, 40);
        }

        doc.fillColor('#333')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('TAX INVOICE', 350, 40, { align: 'right' });

        doc.moveDown(0.2);
        doc.strokeColor('#F8800E').lineWidth(2).moveTo(30, 75).lineTo(pageWidth - 30, 75).stroke();

        // --- Parties Information ---
        const partiesY = 90;
        
        // Seller Information
        doc.fillColor('#F8800E').fontSize(9).font('Helvetica-Bold').text('SOLD BY / SELLER', 30, partiesY);
        doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text('Apky Dark Stores Private Limited', 30, partiesY + 12);
        doc.fillColor('#444').fontSize(8).font('Helvetica').text(
            '16-11-1/41-45 saleem nagar,\nMalakpet Colony Hyderabad.\nTelangana 500036\nGSTIN: 36ABECA5204C1Z9\nEmail: contact@apkydarkstores.com',
            30, partiesY + 26, { width: 180, lineGap: 2 }
        );

        // Document Details (Center-ish)
        const docDetailsX = 230;
        doc.fillColor('#F8800E').fontSize(9).font('Helvetica-Bold').text('INVOICE DETAILS', docDetailsX, partiesY);
        doc.fillColor('#444').fontSize(8).font('Helvetica');
        doc.text(`Invoice No: GM-${order._id.toString().slice(-8).toUpperCase()}`, docDetailsX, partiesY + 15);
        doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, docDetailsX, partiesY + 27);
        doc.text(`Order ID: #${order._id.toString().toUpperCase()}`, docDetailsX, partiesY + 39);
        doc.text(`Place of Supply: Telangana (36)`, docDetailsX, partiesY + 51);

        // Buyer Information
        let shippingAddr = {};
        try {
            shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : order.shippingAddress;
        } catch(e) {
            shippingAddr = order.shippingAddress || {};
        }
        const addressStr = `${shippingAddr.street || ''}, ${shippingAddr.city || ''}, ${shippingAddr.state || ''} - ${shippingAddr.zip || ''}`;

        doc.fillColor('#F8800E').fontSize(9).font('Helvetica-Bold').text('BILL TO / SHIPPING TO', 400, partiesY);
        doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(order.customer?.name || 'Customer', 400, partiesY + 12);
        doc.fillColor('#444').fontSize(8).font('Helvetica').text(
            `${addressStr}\nPhone: ${order.customer?.phone || 'N/A'}\nGSTIN: ${order.customer?.gstNumber || 'Unregistered'}`,
            400, partiesY + 26, { width: 165, lineGap: 2 }
        );

        // --- Table Section ---
        const tableTop = 180;
        
        // Columns configuration
        const col_idx = { x: 30, w: 20 };
        const col_desc = { x: 50, w: 230 };
        const col_hsn = { x: 280, w: 45 };
        const col_qty = { x: 325, w: 30 };
        const col_price = { x: 355, w: 60 };
        const col_gst = { x: 415, w: 40 };
        const col_total = { x: 455, w: 110 };

        // Draw Header Box
        doc.rect(30, tableTop, contentWidth, 20).fill('#F2F2F2').stroke('#333');
        doc.fillColor('#333').fontSize(8).font('Helvetica-Bold');
        
        doc.text('SN', col_idx.x, tableTop + 6, { width: col_idx.w, align: 'center' });
        doc.text('Description of Goods', col_desc.x + 5, tableTop + 6);
        doc.text('HSN', col_hsn.x, tableTop + 6, { width: col_hsn.w, align: 'center' });
        doc.text('Qty', col_qty.x, tableTop + 6, { width: col_qty.w, align: 'center' });
        doc.text('Unit Price', col_price.x, tableTop + 6, { width: col_price.w, align: 'right' });
        doc.text('GST %', col_gst.x, tableTop + 6, { width: col_gst.w, align: 'center' });
        doc.text('Amount (INR)', col_total.x, tableTop + 6, { width: col_total.w - 5, align: 'right' });

        // Table Rows
        let rowY = tableTop + 20;
        doc.font('Helvetica').fontSize(8);
        
        order.items.forEach((item, i) => {
            const itemTotal = item.price * item.quantity;
            const rowHeight = 25;

            // Page Break Check
            if (rowY > 750) {
                doc.addPage();
                rowY = 40;
            }

            // Row vertical lines and bottom line
            doc.lineWidth(0.5).strokeColor('#333');
            doc.lineJoin('miter')
               .rect(30, rowY, contentWidth, rowHeight)
               .stroke();

            // Vertical Dividers
            [col_desc.x, col_hsn.x, col_qty.x, col_price.x, col_gst.x, col_total.x].forEach(x => {
                doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
            });

            doc.fillColor('#000');
            doc.text(i + 1, col_idx.x, rowY + 8, { width: col_idx.w, align: 'center' });
            doc.text(item.name || 'Product', col_desc.x + 5, rowY + 8, { width: col_desc.w - 10, height: rowHeight - 5, ellipsis: true });
            doc.text(item.hsnCode || 'N/A', col_hsn.x, rowY + 8, { width: col_hsn.w, align: 'center' });
            doc.text(item.quantity, col_qty.x, rowY + 8, { width: col_qty.w, align: 'center' });
            doc.text(item.price.toFixed(2), col_price.x, rowY + 8, { width: col_price.w - 5, align: 'right' });
            doc.text(`${item.gstRate || 0}%`, col_gst.x, rowY + 8, { width: col_gst.w, align: 'center' });
            doc.text(itemTotal.toFixed(2), col_total.x, rowY + 8, { width: col_total.w - 5, align: 'right' });
            
            rowY += rowHeight;
        });

        // --- Calculation Summary ---
        const summaryY = rowY + 10;
        const summaryX = 350;
        const valX = 480;

        doc.fontSize(9).font('Helvetica');
        
        // Helper for summary rows
        const addSummaryRow = (label, value, y, isBold = false) => {
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
            doc.text(label, summaryX, y, { width: 120, align: 'right' });
            doc.text(value, valX, y, { width: 85, align: 'right' });
        };

        let currentY = summaryY;
        const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        addSummaryRow('Subtotal (Taxable Value):', `Rs. ${subtotal.toFixed(2)}`, currentY);
        
        currentY += 15;
        addSummaryRow('IGST Amount:', `Rs. ${(order.igstAmount || 0).toFixed(2)}`, currentY);
        
        currentY += 15;
        addSummaryRow('CGST Amount:', `Rs. ${(order.cgstAmount || 0).toFixed(2)}`, currentY);
        
        currentY += 15;
        addSummaryRow('SGST Amount:', `Rs. ${(order.sgstAmount || 0).toFixed(2)}`, currentY);

        currentY += 15;
        addSummaryRow('Delivery Charge:', `Rs. ${(order.deliveryCharge || 0).toFixed(2)}`, currentY);

        currentY += 20;
        doc.rect(summaryX + 30, currentY - 5, pageWidth - (summaryX + 30) - rightMargin, 25).fill('#F8800E');
        doc.fillColor('#fff');
        addSummaryRow('GRAND TOTAL:', `Rs. ${order.totalAmount.toLocaleString()}`, currentY + 3, true);

        // --- Bottom Section ---
        const bottomY = Math.max(currentY + 50, 650);
        
        // Terms
        doc.fillColor('#333').fontSize(8).font('Helvetica-Bold').text('TERMS AND CONDITIONS:', 30, bottomY);
        doc.font('Helvetica').fontSize(7).text(
            '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within due date.\n3. All disputes are subject to Hyderabad Jurisdiction only.\n4. This is a computer generated invoice and requires no signature.',
            30, bottomY + 12, { width: 300, lineGap: 2 }
        );

        // Signature Placeholder
        doc.rect(380, bottomY, 185, 80).stroke('#333');
        doc.fontSize(8).font('Helvetica-Bold').text('For Apky Dark Stores Pvt Ltd', 380, bottomY + 5, { width: 185, align: 'center' });
        doc.fontSize(7).font('Helvetica').text('Authorized Signatory', 380, bottomY + 65, { width: 185, align: 'center' });

        // --- Footer Footer ---
        doc.fontSize(7).fillColor('#888').text('Registered Office: 16-11-1/41-45 saleem nagar, Malakpet Colony Hyderabad, Telangana 500036', 30, 810, { align: 'center', width: contentWidth });

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};
