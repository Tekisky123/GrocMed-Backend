import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vendor name is required'],
            trim: true,
            unique: true,
        },
        address: {
            type: String,
            trim: true,
        },
        gstin: {
            type: String,
            trim: true,
            uppercase: true,
        },
        phone: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Vendor', vendorSchema);
