import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product ID is required'],
        },
        date: {
            type: Date,
            required: [true, 'Adjustment date is required'],
            default: Date.now,
        },
        movementType: {
            type: String,
            required: [true, 'Movement type is required'],
            enum: ['Inward', 'Outward', 'Shrinkage/Damaged'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
        },
        reason: {
            type: String,
            required: [true, 'Reason for adjustment is required'],
            trim: true,
        },
        journalEntryId: {
            // Only populated if adjustment causes financial impact (like shrinkage expense)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JournalEntry',
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save validation: Ensure 'quantity' aligns with 'movementType'
stockAdjustmentSchema.pre('save', function (next) {
    if (this.movementType === 'Inward' && this.quantity <= 0) {
        return next(new Error('Inward movement quantity must be positive.'));
    }
    if ((this.movementType === 'Outward' || this.movementType === 'Shrinkage/Damaged') && this.quantity >= 0) {
        // Force it to be negative if they accidentally submitted a positive number for outward
        this.quantity = -Math.abs(this.quantity);
    }
    next();
});

export default mongoose.model('StockAdjustment', stockAdjustmentSchema);
