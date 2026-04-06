import Order from '../model/orderModel.js';
import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';
import { sendPushNotification } from '../utils/notificationService.js';
import { sysLog } from '../utils/logger.js';

export const createOrderService = async (customerId, orderData) => {
    const { shippingAddress, paymentMethod } = orderData;

    // Get customer's cart
    const cart = await Cart.findOne({ customer: customerId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
    }

    // Setup business home state
    const BUSINESS_HOME_STATE = process.env.STORE_STATE || 'TS';
    let isInterState = false;
    if (shippingAddress && shippingAddress.state) {
        isInterState = shippingAddress.state.trim().toUpperCase() !== BUSINESS_HOME_STATE.trim().toUpperCase();
    }

    // Try to atomically lock stock for all items
    const lockedProducts = [];
    try {
        for (const item of cart.items) {
            if (!item.product) throw new Error('Product in cart not found');
            
            // Atomic check & deduct natively inside MongoDB bypassing Read/Write race gaps
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.product._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                // If update failed, query once to give user a clean error reason
                const prodCheck = await Product.findById(item.product._id);
                if (!prodCheck) throw new Error(`Product not found (ID: ${item.product._id})`);
                throw new Error(`Insufficient stock for ${prodCheck.name}. Available: ${prodCheck.stock}, Requested: ${item.quantity}`);
            }

            lockedProducts.push({
                productId: updatedProduct._id,
                quantity: item.quantity
            });
        }
    } catch (error) {
        // Rollback any successfully locked stock to preserve integrity before aborting
        for (const lock of lockedProducts) {
            await Product.findByIdAndUpdate(lock.productId, { $inc: { stock: lock.quantity } });
        }
        throw new Error(error.message); // Stop execution entirely
    }

    let totalTaxAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    // Create order items snapshot
    const orderItems = cart.items.map((item) => {
        const gstRate = item.product.gstRate || 0;
        const itemTotal = item.price * item.quantity;
        const taxable = itemTotal / (1 + (gstRate / 100));
        const tax = itemTotal - taxable;
        
        totalTaxAmount += tax;
        if (isInterState) {
            totalIgst += tax;
        } else {
            totalCgst += tax / 2;
            totalSgst += tax / 2;
        }

        return {
            product: item.product._id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.price, // Price at time of adding to cart (or could refresh here)
            image: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
            gstRate: gstRate,
            hsnCode: item.product.hsnCode || ''
        };
    });

    const totalAmount = cart.totalAmount;

    const order = new Order({
        customer: customerId,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        totalAmount,
        taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
        cgstAmount: parseFloat(totalCgst.toFixed(2)),
        sgstAmount: parseFloat(totalSgst.toFixed(2)),
        igstAmount: parseFloat(totalIgst.toFixed(2)),
        orderStatus: 'Placed',
        trackingHistory: [
            {
                status: 'Placed',
                description: 'Order placed successfully',
                timestamp: new Date(),
            },
        ],
    });

    await order.save();

    // Stock deduction was already handled atomically above

    // Clear cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return order;
};

export const getMyOrdersService = async (customerId) => {
    const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });
    return orders;
};

export const getOrderByIdService = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer: customerId });
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

export const trackOrderService = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer: customerId }).select('trackingHistory orderStatus');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

// Admin Services

export const getAllOrdersService = async () => {
    const orders = await Order.find({})
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 });
    return orders;
};

export const getOrderByIdForAdminService = async (orderId) => {
    const order = await Order.findById(orderId).populate('customer', 'name phone email');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

export const updateOrderStatusService = async (orderId, status) => {
    const validStatuses = ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
    }

    const order = await Order.findById(orderId).populate('customer', 'name fcmToken');
    if (!order) {
        throw new Error('Order not found');
    }

    const previousStatus = order.orderStatus;
    
    // Post-Delivery Cancellation Block
    if (status === 'Cancelled' && previousStatus === 'Delivered') {
        throw new Error("A Delivered order cannot be cancelled. Initiate the 'Returned' workflow instead.");
    }

    order.orderStatus = status;
    order.trackingHistory.push({
        status: status,
        description: `Order status updated to ${status}`,
        timestamp: new Date(),
    });

    // Cancellation & Return Hook (Inventory Replenishment)
    const isReversingStock = (status === 'Cancelled' || status === 'Returned');
    const wasAlreadyReversed = (previousStatus === 'Cancelled' || previousStatus === 'Returned');
    
    if (isReversingStock && !wasAlreadyReversed) {
        const rollbackPromises = order.items.map(item => {
            return Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        });
        await Promise.all(rollbackPromises);
        sysLog('INVENTORY', `Stock reversed back into shelf for Order [${orderId}]. Status: ${status}`);
    }

    // Payment-Order Synchronization
    if (isReversingStock && order.paymentMethod === 'Online' && order.paymentStatus === 'Paid') {
        order.refundStatus = 'Pending';
        sysLog('FINANCE', `Payment internally reversed to Pending Refund structurally for Order [${orderId}].`);
    }

    await order.save();

    // Send Push Notification
    if (order.customer && order.customer.fcmToken) {
        console.log(`Sending notification to Customer: ${order.customer._id} | Token: ${order.customer.fcmToken}`);
        const title = 'Order Update';
        const body = `Your order #${order._id.toString().slice(-6)} is now ${status}`;
        await sendPushNotification(order.customer.fcmToken, title, body, { type: 'ORDER_UPDATE', orderId: orderId.toString() });
    } else {
        console.log(`No FCM Token found for Customer: ${order.customer?._id}`);
    }

    return order;
};

export const searchOrdersService = async (query) => {
    // Search by Order ID (exact) or Customer Name/Phone (partial)
    // First, find customers matching name/phone
    const customers = await Customer.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
        ]
    }).select('_id');

    const customerIds = customers.map(c => c._id);

    const searchCriteria = {
        $or: [
            { customer: { $in: customerIds } },
        ]
    };

    // If query is valid ObjectId, add it to search
    if (query.match(/^[0-9a-fA-F]{24}$/)) {
        searchCriteria.$or.push({ _id: query });
    }

    const orders = await Order.find(searchCriteria)
        .populate('customer', 'name phone email')
        .sort({ createdAt: -1 });

    return orders;
};
