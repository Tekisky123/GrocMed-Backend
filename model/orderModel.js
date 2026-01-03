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
    image: String // Snapshot of main image
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
            type: String
        },
        totalAmount: {
            type: Number,
            required: true,
        },
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
        orderStatus: {
            type: String,
            enum: ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
            default: 'Placed',
        },
        trackingHistory: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                description: String
            }
        ],
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
