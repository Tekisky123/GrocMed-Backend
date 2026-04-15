import mongoose from 'mongoose';

const pincodeSchema = new mongoose.Schema(
    {
        pincode: {
            type: String,
            required: [true, 'Pincode is required'],
            unique: true,
            trim: true,
            match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
        },
        area: {
            type: String,
            trim: true,
            default: '',
        },
        city: {
            type: String,
            trim: true,
            default: '',
        },
        state: {
            type: String,
            trim: true,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deliveryNote: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { timestamps: true }
);

export default mongoose.model('Pincode', pincodeSchema);
