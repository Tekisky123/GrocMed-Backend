import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
    {
        // System enforces singleton by storing a default 'config' key
        singletonKey: {
            type: String,
            default: 'config',
            unique: true,
            required: true
        },
        minOrderValue: {
            type: Number,
            default: 1000,
            required: true
        },
        freeDeliveryThreshold: {
            type: Number,
            default: 1500,
            required: true
        },
        deliveryCharge: {
            type: Number,
            default: 30,
            required: true
        },
        maxOrdersPerDay: {
            type: Number,
            default: 50,
            required: true
        },
        maxOrdersPerSlot: {
            type: Number,
            default: 20,
            required: true
        },
        paymentQrUrl: {
            type: String,
            default: null,
        },
        storeTimings: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                isEmergencyClosed: false,
                closureReason: 'Store is temporarily closed for maintenance',
                weeklyHours: {
                    monday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    tuesday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    wednesday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    thursday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    friday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    saturday: { isClosed: false, openTime: '08:00', closeTime: '22:00' },
                    sunday: { isClosed: false, openTime: '08:00', closeTime: '22:00' }
                }
            }
        }
    },
    {
        timestamps: true,
    }
);

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
