import StockAdjustment from '../model/stockAdjustmentModel.js';
import Product from '../model/productModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import AccountLedger from '../model/accountLedgerModel.js';
import mongoose from 'mongoose';

// @desc    Get all stock adjustments
// @route   GET /api/admin/inventory/adjustments
// @access  Private/Admin
export const getAdjustments = async (req, res, next) => {
    try {
        const adjustments = await StockAdjustment.find()
            .populate('productId', 'name sku currentPrice')
            .sort('-date -createdAt');

        res.status(200).json({
            success: true,
            count: adjustments.length,
            data: adjustments,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a stock adjustment (Inward/Outward/Shrinkage)
// @route   POST /api/admin/inventory/adjust
// @access  Private/Admin
export const createAdjustment = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let { productId, date, movementType, quantity, reason } = req.body;

        const product = await Product.findById(productId).session(session);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Auto-correct quantity sign based on movement type
        // The model pre-save hook also handles this, but we do it here to know the exact delta for stock update
        if ((movementType === 'Outward' || movementType === 'Shrinkage/Damaged') && quantity > 0) {
            quantity = -Math.abs(quantity);
        }

        // 1. Create Adjustment Record
        const adjustment = await StockAdjustment.create([{
            productId,
            date,
            movementType,
            quantity,
            reason
        }], { session });

        // 2. Update Physical Product Stock
        product.stock += quantity;
        await product.save({ session });

        // 3. Post Financial Journal if it's a financial loss (Shrinkage)
        if (movementType === 'Shrinkage/Damaged') {
            const lossValue = Math.abs(quantity) * product.currentPrice; // Simplified valuation using current retail price (should typically be cost price)

            const inventoryLedger = await AccountLedger.findOne({ name: 'Inventory Asset' }).session(session);
            const lossLedger = await AccountLedger.findOne({ name: 'Inventory Loss/Shrinkage' }).session(session);

            if (inventoryLedger && lossLedger) {
                const journal = await JournalEntry.create([{
                    date,
                    voucherNo: `ADJ/${Date.now().toString().slice(-6)}`,
                    type: 'Journal',
                    narration: `Stock Adjustment (Shrinkage): ${product.name} - ${reason}`,
                    entries: [
                        { ledgerId: lossLedger._id, debit: lossValue, credit: 0 },
                        { ledgerId: inventoryLedger._id, debit: 0, credit: lossValue }
                    ],
                    totalAmount: lossValue
                }], { session });

                adjustment[0].journalEntryId = journal[0]._id;
                await adjustment[0].save({ session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: `Stock adjusted successfully. New Stock: ${product.stock}`,
            data: adjustment[0],
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};
