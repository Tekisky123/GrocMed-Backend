import mongoose from 'mongoose';

const deliverySlotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true, // e.g., "Morning (9 AM - 12 PM)"
        },
        startTime: {
            type: String,
            required: true, // e.g., "09:00"
        },
        endTime: {
            type: String,
            required: true, // e.g., "12:00"
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        displayOrder: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

const DeliverySlot = mongoose.model('DeliverySlot', deliverySlotSchema);

export default DeliverySlot;
