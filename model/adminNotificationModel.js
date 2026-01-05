import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Notification title is required'],
            trim: true,
        },
        message: {
            type: String,
            required: [true, 'Notification message is required'],
            trim: true,
        },
        targetAudience: {
            type: String,
            enum: ['all', 'customers', 'delivery_partners'],
            required: true,
        },
        status: {
            type: String,
            enum: ['sending', 'sent', 'failed'],
            default: 'sending',
        },
        metrics: {
            totalTarget: {
                type: Number,
                default: 0,
            },
            delivered: {
                type: Number,
                default: 0,
            },
            failed: {
                type: Number,
                default: 0,
            },
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            // required: true, // Optional: make required if auth is strictly enforced and user is always attached
        },
    },
    {
        timestamps: true,
    }
);

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;
