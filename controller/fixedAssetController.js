import FixedAsset from '../model/fixedAssetModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import AccountLedger from '../model/accountLedgerModel.js';
import mongoose from 'mongoose';

// @desc    Get all assets
// @route   GET /api/admin/assets
// @access  Private/Admin
export const getAssets = async (req, res, next) => {
    try {
        const assets = await FixedAsset.find().sort('-purchaseDate');

        // Automatic Math Aggregation for UI 
        const totalValue = assets.reduce((a, as) => a + as.purchaseValue, 0);
        const netValue = assets.reduce((a, as) => a + as.netBookValue, 0);

        res.status(200).json({
            success: true,
            count: assets.length,
            summary: { totalValue, netValue },
            data: assets,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a fixed asset
// @route   POST /api/admin/assets
// @access  Private/Admin
export const createAsset = async (req, res, next) => {
    try {
        const asset = await FixedAsset.create(req.body);

        // Assume purchasing an asset from bank (simple version)
        // Financial logic flow ideally handles supplier credit first

        res.status(201).json({
            success: true,
            message: 'Asset recorded successfully',
            data: asset,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Run Annual Depreciation
// @route   POST /api/admin/assets/depreciate
// @access  Private/Admin
export const runDepreciation = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Fetch all active assets
        const assets = await FixedAsset.find({ status: 'Active' }).session(session);
        let totalDepreciationThisYear = 0;

        for (const asset of assets) {
            // Simplified Math: Straight line percentage on written down value
            // Requires days checking in real life.
            const depreciationAmount = (asset.netBookValue * (asset.depreciationRate / 100));

            asset.accumulatedDepreciation += depreciationAmount;

            // The pre-save hook on the model will automatically recompute the netBookValue
            await asset.save({ session });

            totalDepreciationThisYear += depreciationAmount;
        }

        // 2. Pass Journal Entry for total Depreciation
        if (totalDepreciationThisYear > 0) {
            const depExpenseLeadger = await AccountLedger.findOne({ name: 'Depreciation Expense' }).session(session);
            const accumDepLedger = await AccountLedger.findOne({ name: 'Accumulated Depreciation' }).session(session);

            await JournalEntry.create([{
                date: new Date(),
                voucherNo: `DEP/${new Date().getFullYear()}`,
                type: 'Journal',
                narration: 'Annual Depreciation Charge',
                entries: [
                    { ledgerId: depExpenseLeadger._id, debit: totalDepreciationThisYear, credit: 0 },
                    { ledgerId: accumDepLedger._id, debit: 0, credit: totalDepreciationThisYear }
                ],
                totalAmount: totalDepreciationThisYear
            }], { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: `Depreciation run successfully. Total charged: ₹${totalDepreciationThisYear}`,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};
