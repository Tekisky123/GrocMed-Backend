import mongoose from 'mongoose';

const fixedAssetSchema = new mongoose.Schema(
    {
        assetName: {
            type: String,
            required: [true, 'Asset name is required'],
            trim: true,
        },
        assetClass: {
            type: String,
            required: [true, 'Asset class is required'],
            enum: ['Plant & Machinery', 'Furniture & Fixtures', 'Computers & Peripherals', 'Vehicles', 'Buildings'],
        },
        purchaseDate: {
            type: Date,
            required: [true, 'Purchase date is required'],
        },
        purchaseValue: {
            type: Number,
            required: [true, 'Purchase value is required'],
            min: 0,
        },
        depreciationRate: {
            type: Number,
            required: [true, 'Depreciation rate (percentage) is required'],
            min: 0,
            max: 100,
        },
        accumulatedDepreciation: {
            type: Number,
            default: 0,
            min: 0,
        },
        netBookValue: {
            type: Number,
            required: true,
            default: function () {
                // Returns purchase value by default on creation
                return this.purchaseValue;
            },
            min: 0,
        },
        status: {
            type: String,
            enum: ['Active', 'Sold', 'Disposed'],
            default: 'Active',
        },
        lastDepreciationDate: {
            type: Date,
            // Keeping track of when depreciation was last charged
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to ensure math is universally correct
fixedAssetSchema.pre('save', function () {
    if (this.accumulatedDepreciation > this.purchaseValue) {
        this.invalidate('accumulatedDepreciation', 'Accumulated Depreciation cannot exceed Purchase Value.');
        return;
    }

    const computedNBV = this.purchaseValue - this.accumulatedDepreciation;

    // Auto-correct Net Book Value
    if (this.netBookValue !== computedNBV) {
        this.netBookValue = computedNBV;
    }
});

export default mongoose.model('FixedAsset', fixedAssetSchema);
