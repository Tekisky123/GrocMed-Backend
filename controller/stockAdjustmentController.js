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
            .populate('productId', 'name sku packagingOptions')
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
        let { productId, optionId, date, movementType, quantity, reason } = req.body;

        const product = await Product.findById(productId).session(session);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Auto-correct quantity sign based on movement type
        if ((movementType === 'Outward' || movementType === 'Shrinkage/Damaged') && quantity > 0) {
            quantity = -Math.abs(quantity);
        }

        // 1. Create Adjustment Record
        const adjustment = await StockAdjustment.create([{
            productId,
            optionId,
            date,
            movementType,
            quantity,
            reason
        }], { session });

        // 2. Update Stock
        let unitValue = product.mrp || 0; // Fallback value

        if (optionId) {
            // Update specific packaging option stock
            const optionIndex = product.packagingOptions.findIndex(opt => opt._id.toString() === optionId || opt.id === optionId);
            if (optionIndex === -1) {
                return res.status(400).json({ success: false, message: 'Specific Buying Type not found on product' });
            }
            product.packagingOptions[optionIndex].stock = (product.packagingOptions[optionIndex].stock || 0) + quantity;
            unitValue = product.packagingOptions[optionIndex].salePrice || product.packagingOptions[optionIndex].mrp;
        } else {
            // Update global product stock
            product.stock += quantity;
            unitValue = product.offerPrice || product.mrp;
        }

        await product.save({ session });

        // 3. Post Financial Journal if it's a financial loss (Shrinkage)
        if (movementType === 'Shrinkage/Damaged') {
            const lossValue = Math.abs(quantity) * (unitValue || 0);

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
