import mongoose from 'mongoose';

const shareholderSchema = new mongoose.Schema(
    {
        folioNo: {
            type: String,
            required: [true, 'Folio number is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Shareholder name is required'],
            trim: true,
        },
        pan: {
            type: String,
            required: [true, 'PAN is required'],
            unique: true,
            uppercase: true,
            trim: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please fill a valid PAN Number'],
        },
        sharesHeld: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        dateOfJoining: {
            type: Date,
            required: true,
            default: Date.now,
        },
        contactNumber: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
        },
        status: {
            type: String,
            enum: ['Active', 'Transferred'],
            default: 'Active',
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Shareholder', shareholderSchema);
