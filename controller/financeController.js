import AccountLedger from '../model/accountLedgerModel.js';
import JournalEntry from '../model/journalEntryModel.js';

// @desc    Get all active ledgers grouped
// @route   GET /api/admin/finance/ledgers
// @access  Private/Admin
export const getLedgers = async (req, res, next) => {
    try {
        const ledgers = await AccountLedger.find({ isActive: true }).sort('name');

        // Group ledgers by their primary group for easy frontend dropdown mapping
        const grouped = ledgers.reduce((acc, ledger) => {
            if (!acc[ledger.group]) acc[ledger.group] = [];
            acc[ledger.group].push(ledger);
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: grouped,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new ledger
// @route   POST /api/admin/finance/ledgers
// @access  Private/Admin
export const createLedger = async (req, res, next) => {
    try {
        const { name, group, subGroup, openingBalance, openingBalanceType } = req.body;

        const ledger = await AccountLedger.create({
            name,
            group,
            subGroup,
            openingBalance,
            openingBalanceType
        });

        res.status(201).json({
            success: true,
            message: 'Ledger created successfully',
            data: ledger,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new Journal / Cash / Bank Voucher
// @route   POST /api/admin/finance/journal
// @access  Private/Admin
export const createJournalEntry = async (req, res, next) => {
    try {
        const { date, voucherNo, type, narration, entries } = req.body;

        // Basic validation array check
        if (!entries || entries.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'A journal entry must contain at least 2 ledgers (one debit, one credit)',
            });
        }

        // Create the entry (The pre-save hook in the model will validate Dr == Cr mathematical rule)
        const journal = await JournalEntry.create({
            date,
            voucherNo,
            type,
            narration,
            entries
        });

        res.status(201).json({
            success: true,
            message: `${type} Voucher created successfully`,
            data: journal,
        });
    } catch (error) {
        // Handle Mongoose validation errors specifically
        if (error.name === 'ValidationError' || error.message.includes('Total Debits')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// @desc    Get all journal entries (with pagination)
// @route   GET /api/admin/finance/journal
// @access  Private/Admin
export const getJournals = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const startIndex = (page - 1) * limit;

        const journals = await JournalEntry.find()
            .populate('entries.ledgerId', 'name group')
            .sort('-date -createdAt')
            .skip(startIndex)
            .limit(limit);

        const total = await JournalEntry.countDocuments();

        res.status(200).json({
            success: true,
            count: journals.length,
            pagination: { page, limit, total },
            data: journals,
        });
    } catch (error) {
        next(error);
    }
};
