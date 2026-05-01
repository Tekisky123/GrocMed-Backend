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
        }
    },
    {
        timestamps: true,
    }
);

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
