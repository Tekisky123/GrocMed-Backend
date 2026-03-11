import mongoose from 'mongoose';

const accountLedgerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Ledger name is required'],
            unique: true,
            trim: true,
        },
        group: {
            type: String,
            required: [true, 'Ledger group is required'],
            enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
        },
        subGroup: {
            type: String,
            trim: true,
        },
        openingBalance: {
            type: Number,
            default: 0,
        },
        openingBalanceType: {
            type: String,
            enum: ['Dr', 'Cr'],
            default: 'Dr',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('AccountLedger', accountLedgerSchema);
