import mongoose from 'mongoose';

const passwordResetOtpSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['customer', 'delivery_partner'],
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        sendCount: {
            type: Number,
            default: 1,
            min: 1,
            max: 2,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        resetToken: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 900 }, // Documents auto-expire 15 mins after expiresAt
        },
    },
    {
        timestamps: true,
    }
);

// Compound index on phone and role for quick lookups
passwordResetOtpSchema.index({ phone: 1, role: 1 });

const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

export default PasswordResetOtp;
