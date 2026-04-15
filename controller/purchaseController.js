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
