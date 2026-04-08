import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: [true, 'Date is required'],
            default: Date.now,
        },
        voucherNo: {
            type: String,
            required: [true, 'Voucher number is required'],
            unique: true,
        },
        type: {
            type: String,
            required: [true, 'Voucher type is required'],
            enum: ['Receipt', 'Payment', 'Contra', 'Journal', 'Sales', 'Purchase'],
        },
        narration: {
            type: String,
            required: [true, 'Narration/Description is required'],
            trim: true,
        },
        entries: [
            {
                ledgerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'AccountLedger',
                    required: true,
                },
                debit: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
                credit: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['Draft', 'Posted', 'Cancelled'],
            default: 'Posted',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-validate hook to calculate totalAmount before Mongoose validation checks it
journalEntrySchema.pre('validate', function (next) {
    let totalDebit = 0;
    let totalCredit = 0;

    if (this.entries && this.entries.length > 0) {
        this.entries.forEach(entry => {
            totalDebit += (entry.debit || 0);
            totalCredit += (entry.credit || 0);
        });
    }

    // Rounding to 2 decimal places to avoid floating point issues
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
        return next(new Error(`Total Debits (${totalDebit}) must equal Total Credits (${totalCredit}).`));
    }

    this.totalAmount = totalDebit;
    next();
});

export default mongoose.model('JournalEntry', journalEntrySchema);
