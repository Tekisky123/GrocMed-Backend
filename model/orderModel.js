import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    name: String, // Snapshot of product name
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: { // Snapshot of price at time of order
        type: Number,
        required: true,
    },
    image: String, // Snapshot of main image
    gstRate: { // Snapshot of GST rate at order time
        type: Number,
        default: 0
    },
    hsnCode: String // Snapshot of HSN code at order time
});

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryPartner',
        },
        items: [orderItemSchema],
        shippingAddress: {
            street: String,
            city: String,
            state: String,
            zip: String,
            addressType: String
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        deliveryCharge: {
            type: Number,
            default: 0,
        },
        taxAmount: {
            type: Number,
            default: 0,
        },
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        paymentMethod: {
            type: String,
            enum: ['COD', 'Online'], // Cash on Delivery or Online
            default: 'COD',
        },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Paid', 'Failed'],
            default: 'Pending',
        },
        refundStatus: {
            type: String,
            enum: ['None', 'Pending', 'Completed', 'Failed'],
            default: 'None',
        },
        orderStatus: {
            type: String,
            enum: ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
            default: 'Placed',
        },
        trackingHistory: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                description: String
            }
        ],
        codCollectionDetails: {
            method: { type: String, enum: ['Cash', 'Online', 'None'], default: 'None' },
            collectedAt: { type: Date }
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
