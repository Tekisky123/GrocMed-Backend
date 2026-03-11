import mongoose from 'mongoose';

const gstReturnSchema = new mongoose.Schema(
    {
        returnType: {
            type: String,
            required: [true, 'Return type is required'],
            enum: ['GSTR-1', 'GSTR-3B', 'GSTR-9'],
        },
        period: {
            type: String, // String format like "March-2026"
            required: [true, 'Return period is required'],
        },
        jsonData: {
            type: mongoose.Schema.Types.Mixed,
            required: [true, 'JSON data payload is required'],
            // Mixed type used here because GST JSON payloads have deep nested hierarchies
            // (e.g., b2b, b2cs, hsn summaries) that vary wildly depending on the business context.
        },
        arnNumber: {
            type: String,
            // Will be populated once the user confirms filing generated ARN
        },
        status: {
            type: String,
            enum: ['Pending', 'Filed', 'Error'],
            default: 'Pending',
        },
        filedDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure only one active return per period-type combination
gstReturnSchema.index({ returnType: 1, period: 1 }, { unique: true });

export default mongoose.model('GSTReturn', gstReturnSchema);
