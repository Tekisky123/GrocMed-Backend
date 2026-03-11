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
        const { invoiceNo, date, supplierName, gstin, items, taxBreakup, taxableTotal, totalAmount, status } = req.body;

        // 1. Create Purchase Invoice
        const invoice = await PurchaseInvoice.create([{
            invoiceNo,
            date,
            supplierName,
            gstin,
            items,
            taxBreakup,
            taxableTotal,
            totalAmount,
            status
        }], { session });

        // 2. Automatically Update Inventory Stock for each item
        for (const item of items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        // 3. Automatically Create Journal Entry
        // Debit: Purchase A/C (Taxable Amount)
        // Debit: CGST/SGST/IGST A/C (Tax Amounts)
        // Credit: Supplier A/C (Total Amount)

        // Find default ledgers (assuming these names exist or user creates them)
        const purchaseLedger = await AccountLedger.findOne({ name: 'Purchases Account' }).session(session);
        const supplierLedger = await AccountLedger.findOne({ name: supplierName }) ||
            await AccountLedger.create([{ name: supplierName, group: 'Liability', subGroup: 'Sundry Creditors' }], { session });

        const journalEntries = [
            { ledgerId: purchaseLedger ? purchaseLedger._id : supplierLedger[0]._id, debit: taxableTotal, credit: 0 },
            { ledgerId: supplierLedger[0] ? supplierLedger[0]._id : supplierLedger._id, debit: 0, credit: totalAmount }
        ];

        // Add tax ledgers if applicable (Simplified logic for now)
        // In a full prod system, we would explicitly look up 'Input CGST' ledgers.

        const journal = await JournalEntry.create([{
            date,
            voucherNo: `PUR/${invoiceNo}`,
            type: 'Purchase',
            narration: `Purchase from ${supplierName} - Inv no. ${invoiceNo}`,
            entries: journalEntries,
            totalAmount
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
