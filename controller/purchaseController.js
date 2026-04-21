import PurchaseInvoice from '../model/purchaseModel.js';
import Product from '../model/productModel.js'; // Important for stock updates
import JournalEntry from '../model/journalEntryModel.js';
import AccountLedger from '../model/accountLedgerModel.js';
import mongoose from 'mongoose';

// @desc    Get all purchase invoices
// @route   GET /api/admin/purchases
// @access  Private/Admin
export const getPurchases = async (req, res, next) => {
    try {
        const invoices = await PurchaseInvoice.find()
            .populate('items.productId', 'name sku')
            .sort('-date -createdAt');

        res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new purchase invoice & update stock & post journal
// @route   POST /api/admin/purchases
// @access  Private/Admin
export const createPurchase = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { invoiceNo, date, supplierName, gstin, items, status } = req.body;

        // Calculate totals from items correctly
        const taxableTotal = items.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        
        // Calculate tax breakup from items
        const taxBreakup = { cgst: 0, sgst: 0, igst: 0 };
        items.forEach(item => {
            const tax = (Number(item.total) || 0) - (Number(item.taxableAmount) || 0);
            // Default to CGST/SGST split if not specified (standard for local purchases)
            taxBreakup.cgst += tax / 2;
            taxBreakup.sgst += tax / 2;
        });

        // 1. Create Purchase Invoice with all fields
        const invoice = await PurchaseInvoice.create([{
            invoiceNo,
            date,
            supplierName,
            gstin: gstin || 'URD',
            items,
            taxBreakup,
            taxableTotal,
            totalAmount,
            status: status || 'Unpaid'
        }], { session });

        // 2. Automatically Update Inventory Stock for each item
        for (const item of items) {
            if (item.productId) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { 
                        $inc: { stock: item.quantity },
                        $set: { 
                            hsnCode: item.hsn, 
                            mrp: item.mrp,
                            manfDate: item.mfgDate,
                            expiryDate: item.expiryDate
                        }
                    },
                    { session }
                );
            }
        }

        // 3. Automatically Create Journal Entry
        // Debit: Purchase A/C (Taxable Amount)
        // Debit: CGST/SGST/IGST A/C (Tax Amounts)
        // Credit: Supplier A/C (Total Amount)

        // Find default ledgers (assuming these names exist or user creates them)
        const purchaseLedger = await AccountLedger.findOne({ name: 'Purchases Account' }).session(session) || 
            await AccountLedger.create([{ name: 'Purchases Account', group: 'Expense', subGroup: 'Direct Expenses' }], { session }).then(res => res[0]);

        const findOrCreateLedger = async (name, group, subGroup) => {
            let ledger = await AccountLedger.findOne({ name }).session(session);
            if (!ledger) {
                const created = await AccountLedger.create([{ name, group, subGroup }], { session });
                ledger = created[0];
            }
            return ledger;
        };

        const supplierLedger = await findOrCreateLedger(supplierName, 'Liability', 'Sundry Creditors');

        const journalEntries = [
            { ledgerId: purchaseLedger._id, debit: taxableTotal, credit: 0 },
            { ledgerId: supplierLedger._id, debit: 0, credit: totalAmount }
        ];

        // Add tax ledgers based on breakup
        if (taxBreakup) {
            if (taxBreakup.cgst > 0) {
                const cgstLedger = await findOrCreateLedger('Input CGST', 'Asset', 'Duties & Taxes');
                journalEntries.push({ ledgerId: cgstLedger._id, debit: taxBreakup.cgst, credit: 0 });
            }
            if (taxBreakup.sgst > 0) {
                const sgstLedger = await findOrCreateLedger('Input SGST', 'Asset', 'Duties & Taxes');
                journalEntries.push({ ledgerId: sgstLedger._id, debit: taxBreakup.sgst, credit: 0 });
            }
            if (taxBreakup.igst > 0) {
                const igstLedger = await findOrCreateLedger('Input IGST', 'Asset', 'Duties & Taxes');
                journalEntries.push({ ledgerId: igstLedger._id, debit: taxBreakup.igst, credit: 0 });
            }
        }

        const journal = await JournalEntry.create([{
            date,
            voucherNo: `PUR/${invoiceNo}`,
            type: 'Purchase',
            narration: `Purchase from ${supplierName} - Inv no. ${invoiceNo}`,
            entries: journalEntries,
            totalAmount: totalAmount // Total amount remains the Credit side sum
        }], { session });

        // Associate journal to invoice
        invoice[0].journalEntryId = journal[0]._id;
        await invoice[0].save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Purchase recorded, stock updated, and journal posted successfully',
            data: invoice[0],
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// @desc    Update purchase status
// @route   PATCH /api/admin/purchases/:id/status
// @access  Private/Admin
export const updatePurchaseStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        
        if (!['Unpaid', 'Partially Paid', 'Paid'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Unpaid, Partially Paid, or Paid'
            });
        }

        const invoice = await PurchaseInvoice.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Purchase invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        next(error);
    }
};
