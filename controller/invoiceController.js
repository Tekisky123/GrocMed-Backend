import PDFDocument from 'pdfkit';
import Order from '../model/orderModel.js';
import Customer from '../model/customerModel.js';
import Product from '../model/productModel.js';

export const downloadInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer')
            .populate('items.product', 'name unit unitType perUnitWeightVolume packagingOptions');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const doc = new PDFDocument({ margins: { top: 25, bottom: 10, left: 30, right: 30 }, size: 'A4', bufferPages: true });

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
            doc.image(logoBuffer, 30, 24, { height: 32 });
            
            // Brand Name next to logo
            doc.fillColor('#F8800E')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text('GrocMed', 74, 31);
        } catch (logoError) {
            console.error('Error adding logo to PDF:', logoError);
            // Fallback to text if logo fails
            doc.fillColor('#F8800E')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text('GrocMed', 30, 28);
        }

        doc.fillColor('#333')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('TAX INVOICE', 350, 30, { align: 'right' });

        doc.strokeColor('#F8800E').lineWidth(2).moveTo(30, 60).lineTo(pageWidth - 30, 60).stroke();

        // --- Parties Information ---
        const partiesY = 68;
        
        // Seller Information
        doc.fillColor('#F8800E').fontSize(8.5).font('Helvetica-Bold').text('SOLD BY / SELLER', 30, partiesY);
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text('Apky Dark Stores Private Limited', 30, partiesY + 11);
        doc.fillColor('#444').fontSize(7.5).font('Helvetica').text(
            '16-11-1/41-42 Saleem Nagar,\nMalakpet Colony, Hyderabad,\nTelangana - 500036\nGSTIN: 36ABECA5204C1Z9\nEmail: info@grocmed.com',
            30, partiesY + 23, { width: 180, lineGap: 1.5 }
        );

        // Document Details (Center-ish)
        const docDetailsX = 230;
        doc.fillColor('#F8800E').fontSize(8.5).font('Helvetica-Bold').text('INVOICE DETAILS', docDetailsX, partiesY);
        doc.fillColor('#444').fontSize(7.5).font('Helvetica');
        doc.text(`Invoice No: GM-${order._id.toString().slice(-8).toUpperCase()}`, docDetailsX, partiesY + 13);
        doc.text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, docDetailsX, partiesY + 24);
        doc.text(`Order ID: #${order._id.toString().toUpperCase()}`, docDetailsX, partiesY + 35);
        doc.text(`Place of Supply: Telangana (36)`, docDetailsX, partiesY + 46);

        // Buyer Information
        let shippingAddr = {};
        try {
            shippingAddr = typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress) : (order.shippingAddress || {});
        } catch(e) {
            shippingAddr = order.shippingAddress || {};
        }

        let city = (shippingAddr.city || '').trim();
        if (!city || city.toLowerCase().includes('default')) {
            city = 'Hyderabad';
        }
        let state = (shippingAddr.state || '').trim();
        if (!state || state.toLowerCase().includes('default')) {
            state = 'Telangana';
        }

        let street = (shippingAddr.street || '').trim();
        street = street
            .replace(/,\s*default\s*city/gi, '')
            .replace(/default\s*city/gi, '')
            .replace(/,\s*default\s*state/gi, '')
            .replace(/default\s*state/gi, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/,\s*,/g, ',')
            .replace(/^[,\s]+|[,\s]+$/g, '');

        const addrParts = [];
        if (street) addrParts.push(street);
        if (city && !street.toLowerCase().includes(city.toLowerCase())) {
            addrParts.push(city);
        }
        if (state && !street.toLowerCase().includes(state.toLowerCase())) {
            addrParts.push(state);
        }
        let addressStr = addrParts.join(', ');
        if (shippingAddr.zip) {
            addressStr += ` - ${shippingAddr.zip}`;
        }

        doc.fillColor('#F8800E').fontSize(8.5).font('Helvetica-Bold').text('BILL TO / SHIPPING TO', 390, partiesY);

        const hasShopName = !!(order.customer?.shopName && order.customer.shopName.trim());
        const primaryBusinessTitle = hasShopName ? order.customer.shopName.trim() : (order.customer?.name || 'Customer');

        // Prominent Shop Name (or Customer Name if shop name not set)
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text(primaryBusinessTitle, 390, partiesY + 11);

        // Contact person, Address, and Business Credentials
        let buyerDetailsText = '';
        if (hasShopName && order.customer?.name) {
            buyerDetailsText += `Customer: ${order.customer.name}\n`;
        }
        buyerDetailsText += `${addressStr}\nPhone: ${order.customer?.phone || 'N/A'}\nGSTIN: ${order.customer?.gstNumber || order.customer?.licenseNumber || 'Unregistered'}`;

        doc.fillColor('#444').fontSize(7.5).font('Helvetica').text(
            buyerDetailsText,
            390, partiesY + 23, { width: 175, lineGap: 1.5 }
        );

        // --- Table Section ---
        const col_idx = { x: 30, w: 25 };
        const col_desc = { x: 55, w: 215 };
        const col_hsn = { x: 270, w: 45 };
        const col_qty = { x: 315, w: 75 };
        const col_price = { x: 390, w: 55 };
        const col_gst = { x: 445, w: 35 };
        const col_total = { x: 480, w: 85 };

        const drawTableHeader = (y) => {
            doc.rect(30, y, contentWidth, 18).fill('#F2F2F2').stroke('#333');
            doc.fillColor('#333').fontSize(8).font('Helvetica-Bold');
            doc.text('SN', col_idx.x, y + 5, { width: col_idx.w, align: 'center' });
            doc.text('Description of Goods', col_desc.x + 4, y + 5);
            doc.text('HSN', col_hsn.x, y + 5, { width: col_hsn.w, align: 'center' });
            doc.text('Qty / Units', col_qty.x, y + 5, { width: col_qty.w, align: 'center' });
            doc.text('Unit Price', col_price.x, y + 5, { width: col_price.w - 4, align: 'right' });
            doc.text('GST %', col_gst.x, y + 5, { width: col_gst.w, align: 'center' });
            doc.text('Amount (INR)', col_total.x, y + 5, { width: col_total.w - 4, align: 'right' });
        };

        const tableTop = 138;
        drawTableHeader(tableTop);

        // Table Rows
        let rowY = tableTop + 18;
        
        order.items.forEach((item, i) => {
            const itemTotal = item.price * item.quantity;

            const matchingOpt = item.product?.packagingOptions?.find(
                opt => String(opt._id) === String(item.packagingOptionId) || opt.id === item.packagingOptionId
            ) || item.product?.packagingOptions?.find(
                opt => item.packagingLabel && opt.label.toLowerCase() === item.packagingLabel.toLowerCase()
            );
            const unitsPerPack = item.unitsPerPack || matchingOpt?.unitsPerPack || item.product?.unitsPerUnitType || item.product?.unitsPerPack || 1;
            const packDetail = item.packagingLabel || matchingOpt?.label || item.unit || item.product?.unitType || '';
            const weightVolume = item.product?.perUnitWeightVolume || '';

            let unitTypeName = '';
            const lowerLabel = packDetail.toLowerCase();
            if (lowerLabel.includes('box')) unitTypeName = 'Box';
            else if (lowerLabel.includes('strip')) unitTypeName = 'Strip';
            else if (lowerLabel.includes('carton')) unitTypeName = 'Carton';
            else if (lowerLabel.includes('jar')) unitTypeName = 'Jar';
            else if (lowerLabel.includes('bottle')) unitTypeName = 'Bottle';
            else if (lowerLabel.includes('pack')) unitTypeName = 'Pack';
            else unitTypeName = item.product?.unitType || 'Pack';
            const pluralUnit = item.quantity === 1 ? unitTypeName : `${unitTypeName}s`;

            const totalItems = item.quantity * unitsPerPack;
            const hasMultiPack = unitsPerPack > 1;

            let packSubtext = packDetail ? `Pkg: ${packDetail}` : '';
            if (weightVolume && weightVolume !== packDetail) {
                packSubtext += packSubtext ? ` (${weightVolume})` : `Net Wt: ${weightVolume}`;
            }
            if (hasMultiPack) {
                packSubtext += packSubtext ? ` • Total: ${totalItems} pcs (${item.quantity} ${pluralUnit} × ${unitsPerPack})` : `Total: ${totalItems} pcs`;
            }

            const rowHeight = packSubtext ? 24 : 20;

            // Page Break Check
            if (rowY + rowHeight > 740) {
                doc.addPage();
                drawTableHeader(25);
                rowY = 43;
            }

            // Draw row box and vertical dividers
            doc.lineWidth(0.5).strokeColor('#ccc');
            doc.lineJoin('miter')
               .rect(30, rowY, contentWidth, rowHeight)
               .stroke();

            [col_desc.x, col_hsn.x, col_qty.x, col_price.x, col_gst.x, col_total.x].forEach(x => {
                doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
            });

            const textY = rowY + (packSubtext ? 3 : 5);

            // 1. SN
            doc.fillColor('#000').font('Helvetica').fontSize(8);
            doc.text(i + 1, col_idx.x, textY + 2, { width: col_idx.w, align: 'center' });

            // 2. Description of Goods
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#111');
            doc.text(item.name || 'Product', col_desc.x + 4, textY, { width: col_desc.w - 8, height: 10, ellipsis: true });

            if (packSubtext) {
                doc.font('Helvetica').fontSize(6.8).fillColor('#555');
                doc.text(packSubtext, col_desc.x + 4, textY + 10, { width: col_desc.w - 8, height: 9, ellipsis: true });
            }

            // 3. HSN
            doc.font('Helvetica').fontSize(7.5).fillColor('#333');
            doc.text(item.hsnCode || 'N/A', col_hsn.x, textY + 2, { width: col_hsn.w, align: 'center' });

            // 4. Quantity Column
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
            doc.text(`${item.quantity} ${pluralUnit}`, col_qty.x, textY + (hasMultiPack ? 0 : 2), { width: col_qty.w, align: 'center' });
            if (hasMultiPack) {
                doc.font('Helvetica').fontSize(6.8).fillColor('#065f46');
                doc.text(`(${totalItems} items)`, col_qty.x, textY + 9, { width: col_qty.w, align: 'center' });
            }

            // 5. Unit Price
            doc.font('Helvetica').fontSize(8).fillColor('#000');
            doc.text(item.price.toFixed(2), col_price.x, textY + 2, { width: col_price.w - 4, align: 'right' });

            // 6. GST %
            doc.text(`${item.gstRate || 0}%`, col_gst.x, textY + 2, { width: col_gst.w, align: 'center' });

            // 7. Total Amount
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
            doc.text(itemTotal.toFixed(2), col_total.x, textY + 2, { width: col_total.w - 4, align: 'right' });
            
            rowY += rowHeight;
        });

        // Determine if supply is Intra-State (Telangana) or Inter-State
        const sState = state.toLowerCase();
        const sCity = city.toLowerCase();
        const isIntraState = 
            sState === 'telangana' || 
            sState === 'ts' || 
            sState === 'tg' || 
            sState === '36' || 
            sState.includes('telangana') || 
            sCity.includes('hyderabad') || 
            !sState || 
            sState.includes('default');

        const isInterState = !isIntraState;

        // Calculate items total, taxable value, and tax amounts
        let grossSubtotal = 0;
        let calculatedTaxable = 0;
        let calculatedTax = 0;

        order.items.forEach((item) => {
            const itemTotal = item.price * item.quantity;
            grossSubtotal += itemTotal;
            const gstRate = item.gstRate || 0;
            const itemTaxable = itemTotal / (1 + (gstRate / 100));
            calculatedTaxable += itemTaxable;
            calculatedTax += (itemTotal - itemTaxable);
        });

        // Use stored tax if available and matches, else calculated
        let effectiveTax = calculatedTax;
        const storedTax = (order.taxAmount && order.taxAmount > 0)
            ? order.taxAmount
            : ((order.cgstAmount || 0) + (order.sgstAmount || 0) + (order.igstAmount || 0));

        if (storedTax > 0) {
            effectiveTax = storedTax;
        }

        const taxableValue = Math.max(0, grossSubtotal - effectiveTax);

        let displayCgst = 0;
        let displaySgst = 0;
        let displayIgst = 0;

        if (isIntraState) {
            // Intra-state (Telangana): 50% CGST and 50% SGST (e.g., 5% -> 2.5% CGST + 2.5% SGST)
            displayCgst = effectiveTax / 2;
            displaySgst = effectiveTax / 2;
            displayIgst = 0;
        } else {
            // Inter-state: 100% IGST
            displayCgst = 0;
            displaySgst = 0;
            displayIgst = effectiveTax;
        }

        // Check if summary and terms fit on the current page
        if (rowY + 145 > 770) {
            doc.addPage();
            rowY = 25;
        }

        // --- Calculation Summary ---
        const summaryY = rowY + 8;
        const summaryX = 350;
        const valX = 480;

        // Helper for summary rows
        const addSummaryRow = (label, value, y, isBold = false) => {
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor('#000');
            doc.text(label, summaryX, y, { width: 120, align: 'right' });
            doc.text(value, valX, y, { width: 85, align: 'right' });
        };

        let currentY = summaryY;
        addSummaryRow('Subtotal (Taxable Value):', `Rs. ${taxableValue.toFixed(2)}`, currentY);
        
        currentY += 13;
        addSummaryRow('CGST Amount:', `Rs. ${displayCgst.toFixed(2)}`, currentY);
        
        currentY += 13;
        addSummaryRow('SGST Amount:', `Rs. ${displaySgst.toFixed(2)}`, currentY);

        currentY += 13;
        addSummaryRow('IGST Amount:', `Rs. ${displayIgst.toFixed(2)}`, currentY);

        currentY += 13;
        addSummaryRow('Delivery Charge:', `Rs. ${(order.deliveryCharge || 0).toFixed(2)}`, currentY);

        currentY += 16;
        doc.rect(summaryX + 30, currentY - 3, pageWidth - (summaryX + 30) - rightMargin, 20).fill('#F8800E');
        doc.fillColor('#fff');
        addSummaryRow('GRAND TOTAL:', `Rs. ${order.totalAmount.toLocaleString()}`, currentY + 3, true);

        // --- Bottom Section: Terms & Signature ---
        const bottomY = Math.min(Math.max(currentY + 18, 665), 735);
        
        // Terms
        doc.fillColor('#333').fontSize(8).font('Helvetica-Bold').text('TERMS AND CONDITIONS:', 30, bottomY);
        doc.font('Helvetica').fontSize(6.5).fillColor('#555').text(
            '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within due date.\n3. All disputes are subject to Hyderabad Jurisdiction only.\n4. This is a computer generated invoice and requires no signature.',
            30, bottomY + 12, { width: 320, lineGap: 1.5 }
        );

        // Signature Placeholder
        doc.rect(380, bottomY, 185, 55).stroke('#ccc');
        doc.fillColor('#333').fontSize(7.5).font('Helvetica-Bold').text('For Apky Dark Stores Pvt Ltd', 380, bottomY + 5, { width: 185, align: 'center' });
        doc.fontSize(7).font('Helvetica').text('Authorized Signatory', 380, bottomY + 42, { width: 185, align: 'center' });

        // --- Clean Footer on Every Page ---
        const totalPdfPages = doc.bufferedPageRange().count;
        for (let p = 0; p < totalPdfPages; p++) {
            doc.switchToPage(p);
            const pageText = totalPdfPages > 1 ? `  |  Page ${p + 1} of ${totalPdfPages}` : '';
            doc.fontSize(7).fillColor('#888').text(
                `Registered Office: 16-11-1/41-42 Saleem Nagar, Malakpet Colony, Hyderabad, Telangana - 500036${pageText}`,
                30,
                805,
                { align: 'center', width: contentWidth, lineBreak: false }
            );
        }

        doc.end();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};
