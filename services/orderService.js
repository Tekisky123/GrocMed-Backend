import Order from '../model/orderModel.js';
import Cart from '../model/cartModel.js';
import Product from '../model/productModel.js';
import Setting from '../model/settingModel.js';
import DeliverySlot from '../model/deliverySlotModel.js';
import { sendPushNotification } from '../utils/notificationService.js';
import { sendWhatsAppMessage } from '../utils/whatsappService.js';
import { sysLog } from '../utils/logger.js';
import AdminNotification from '../model/adminNotificationModel.js';
import AccountLedger from '../model/accountLedgerModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import moment from 'moment';

export const createOrderService = async (customerId, orderData) => {
    const { shippingAddress, paymentMethod, deliveryDate, deliverySlot } = orderData;

    // Validate delivery date and slot capacity
    if (deliveryDate && deliverySlot) {
        const targetDate = moment.utc(deliveryDate).startOf('day');
        const start = targetDate.toDate();
        const end = moment.utc(targetDate).endOf('day').toDate();

        // Check if slot has already passed for today (IST time)
        const currentIST = moment().utcOffset("+05:30");
        const todayISTStr = currentIST.format('YYYY-MM-DD');
        const targetDateStr = moment.utc(deliveryDate).format('YYYY-MM-DD');

        if (targetDateStr === todayISTStr) {
            const slotModel = await DeliverySlot.findOne({ name: deliverySlot });
            if (slotModel) {
                const currentTimeStr = currentIST.format('HH:mm');
                if (slotModel.startTime <= currentTimeStr) {
                    throw new Error(`The delivery slot "${deliverySlot}" has already passed for today.`);
                }
            }
        }

        const settings = await Setting.findOne({ singletonKey: 'config' });
        const maxOrders = settings?.maxOrdersPerDay || 50;
        const maxOrdersPerSlot = settings?.maxOrdersPerSlot || 20;

        // Count total orders for the day
        const totalOrders = await Order.countDocuments({
            deliveryDate: { $gte: start, $lte: end },
            orderStatus: { $ne: 'Cancelled' }
        });

        if (totalOrders >= maxOrders) {
            throw new Error('Delivery is fully booked for the selected date.');
        }

        // Count orders for this specific slot
        const slotOrders = await Order.countDocuments({
            deliveryDate: { $gte: start, $lte: end },
            deliverySlot: deliverySlot,
            orderStatus: { $ne: 'Cancelled' }
        });

        if (slotOrders >= maxOrdersPerSlot) {
            throw new Error(`The delivery slot "${deliverySlot}" is fully booked for this date.`);
        }
    }

    // Get customer's cart
    const cart = await Cart.findOne({ customer: customerId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
    }

    const subtotal = cart.totalAmount || 0;
    const settings = await Setting.findOne({ singletonKey: 'config' }) || { 
        minOrderValue: 0, 
        freeDeliveryThreshold: 1000, 
        deliveryCharge: 50 
    };

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
            
            let updatedProduct;
            if (item.packagingOptionId) {
                // Atomic check & deduct from specific packaging option
                updatedProduct = await Product.findOneAndUpdate(
                    { 
                        _id: item.product._id, 
                        'packagingOptions._id': item.packagingOptionId,
                        'packagingOptions.stock': { $gte: item.quantity } 
                    },
                    { $inc: { 'packagingOptions.$.stock': -item.quantity } },
                    { new: true }
                );
            } else {
                // Fallback to legacy root stock field
                updatedProduct = await Product.findOneAndUpdate(
                    { _id: item.product._id, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
            }

            if (!updatedProduct) {
                const prodCheck = await Product.findById(item.product._id);
                if (!prodCheck) throw new Error(`Product not found`);
                
                let availableStock = 0;
                if (item.packagingOptionId) {
                    const opt = prodCheck.packagingOptions.id(item.packagingOptionId);
                    availableStock = opt ? opt.stock : 0;
                } else {
                    availableStock = prodCheck.stock || 0;
                }
                
                throw new Error(`Insufficient stock for ${prodCheck.name}${item.packagingLabel ? ' ' + item.packagingLabel : ''}. Available: ${availableStock}, Requested: ${item.quantity}`);
            }

            lockedProducts.push({
                productId: updatedProduct._id,
                packagingOptionId: item.packagingOptionId,
                quantity: item.quantity
            });
        }
    } catch (error) {
        // Rollback any successfully locked stock
        for (const lock of lockedProducts) {
            if (lock.packagingOptionId) {
                await Product.findOneAndUpdate(
                    { _id: lock.productId, 'packagingOptions._id': lock.packagingOptionId },
                    { $inc: { 'packagingOptions.$.stock': lock.quantity } }
                );
            } else {
                await Product.findByIdAndUpdate(lock.productId, { $inc: { stock: lock.quantity } });
            }
        }
        throw new Error(error.message);
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

    const deliveryCharge = subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge;
    const finalTotalAmount = subtotal + deliveryCharge;

    let finalAddress = {
        street: '',
        city: '',
        state: '',
        zip: '',
        addressType: 'Home'
    };

    if (shippingAddress) {
        let addrObj = shippingAddress;
        if (typeof shippingAddress === 'string') {
            try {
                addrObj = JSON.parse(shippingAddress);
            } catch (e) {
                addrObj = { street: shippingAddress };
            }
        }
        
        finalAddress = {
            street: addrObj.streetAddress || addrObj.street || '',
            city: addrObj.city || '',
            state: addrObj.state || '',
            zip: addrObj.postalCode || addrObj.zip || '',
            addressType: addrObj.type || addrObj.addressType || ''
        };
    }

    const order = new Order({
        customer: customerId,
        items: orderItems,
        shippingAddress: finalAddress,
        paymentMethod,
        totalAmount: finalTotalAmount,
        deliveryCharge,
        taxAmount: parseFloat(totalTaxAmount.toFixed(2)),
        cgstAmount: parseFloat(totalCgst.toFixed(2)),
        sgstAmount: parseFloat(totalSgst.toFixed(2)),
        igstAmount: parseFloat(totalIgst.toFixed(2)),
        deliveryDate,
        deliverySlot,
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

    // Trigger WhatsApp Confirmation Notification
    try {
        const campaignName = process.env.AISENSY_CAMPAIGN_ORDER_CONFIRMED || 'order_confirmed';
        Order.findById(order._id)
            .populate('customer', 'name phone')
            .then(populatedOrder => {
                if (populatedOrder && populatedOrder.customer && populatedOrder.customer.phone) {
                    const orderIdShort = populatedOrder._id.toString().slice(-8).toUpperCase();
                    const totalFormatted = `₹${populatedOrder.totalAmount}`;
                    const deliveryDetails = `${new Date(populatedOrder.deliveryDate).toLocaleDateString()} (${populatedOrder.deliverySlot})`;
                    
                    sendWhatsAppMessage(
                        populatedOrder.customer.phone,
                        populatedOrder.customer.name,
                        campaignName,
                        [populatedOrder.customer.name, orderIdShort, totalFormatted, deliveryDetails]
                    ).catch(err => console.error('Failed to send Order Confirmation WhatsApp:', err));
                }
            })
            .catch(err => console.error('Failed to populate customer for WhatsApp Confirmation:', err));
    } catch (e) {
        console.error('Failed to initialize WhatsApp Confirmation flow:', e);
    }

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
        .populate('customer', 'name phone email shopName')
        .populate('deliveryPartner', 'name phone email')
        .sort({ createdAt: -1 });
    return orders;
};

export const getOrderByIdForAdminService = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('customer', 'name phone email shopName')
        .populate('deliveryPartner', 'name phone email');
    if (!order) {
        throw new Error('Order not found');
    }
    return order;
};

export const updateOrderStatusService = async (orderId, status, deliveryPartnerId = null, codMethod = null, paymentScreenshot = null, cancellationReason = null, cashAmount = null, onlineAmount = null) => {
    const validStatuses = ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
    }

    const order = await Order.findById(orderId).populate('customer', 'name fcmToken');
    if (!order) {
        throw new Error('Order not found');
    }

    const previousStatus = order.orderStatus;
    const previousDeliveryPartnerId = order.deliveryPartner;
    const isNewPartnerAssigned = deliveryPartnerId && (!previousDeliveryPartnerId || previousDeliveryPartnerId.toString() !== deliveryPartnerId.toString());
    
    // Post-Delivery Cancellation Block
    if (status === 'Cancelled' && previousStatus === 'Delivered') {
        throw new Error("A Delivered order cannot be cancelled. Initiate the 'Returned' workflow instead.");
    }

    order.orderStatus = status;
    if (deliveryPartnerId) {
        order.deliveryPartner = deliveryPartnerId;
    }
    order.trackingHistory.push({
        status: status,
        description: deliveryPartnerId 
            ? `Order status updated to ${status} and assigned to delivery partner.` 
            : `Order status updated to ${status}`,
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

    // COD Collection Logic
    if (status === 'Delivered' && order.paymentMethod === 'COD') {
        if (!codMethod) {
            throw new Error('Payment collection method (Cash/Online/Split) is required for COD orders mark as Delivered.');
        }
        order.codCollectionDetails = {
            method: codMethod,
            cashAmount: codMethod === 'Split' ? (Number(cashAmount) || 0) : 0,
            onlineAmount: codMethod === 'Split' ? (Number(onlineAmount) || 0) : 0,
            collectedAt: new Date(),
            paymentScreenshot: paymentScreenshot
        };
        order.paymentStatus = 'Paid';
        sysLog('FINANCE', `COD Payment collected via ${codMethod} for Order [${orderId}]. Status set to Paid.`);
    }

    // Cancellation Reason Tracking
    if (status === 'Cancelled' || status === 'Returned') {
        order.cancellationReason = cancellationReason || 'Customer Cancelled';
    }

    // Helper to find or create accounting ledgers dynamically
    const findOrCreateLedger = async (name, group, subGroup) => {
        let ledger = await AccountLedger.findOne({ name });
        if (!ledger) {
            ledger = await AccountLedger.create({ name, group, subGroup });
        }
        return ledger;
    };

    // Sales Journal Entry when order transitions to Delivered
    if (status === 'Delivered' && !order.journalEntryId) {
        try {
            const salesLedger = await findOrCreateLedger('Sales Account', 'Revenue', 'Direct Revenues');
            
            const totalAmount = order.totalAmount;
            const cgst = order.cgstAmount || 0;
            const sgst = order.sgstAmount || 0;
            const igst = order.igstAmount || 0;
            const taxTotal = cgst + sgst + igst;
            const taxableTotal = totalAmount - taxTotal;

            const journalEntries = [
                { ledgerId: salesLedger._id, debit: 0, credit: taxableTotal }
            ];

            if (order.paymentMethod === 'COD' && codMethod === 'Split') {
                const cashLedger = await findOrCreateLedger('Cash A/C', 'Asset', 'Cash-in-hand');
                const bankLedger = await findOrCreateLedger('Bank Account', 'Asset', 'Bank Accounts');
                
                const splitCashAmount = Number(cashAmount) || 0;
                const splitOnlineAmount = Number(onlineAmount) || 0;

                journalEntries.push({ ledgerId: cashLedger._id, debit: splitCashAmount, credit: 0 });
                journalEntries.push({ ledgerId: bankLedger._id, debit: splitOnlineAmount, credit: 0 });
            } else {
                let paymentLedgerName = 'Bank Account';
                if (order.paymentMethod === 'COD' && codMethod === 'Cash') {
                    paymentLedgerName = 'Cash A/C';
                }
                const paymentLedger = await findOrCreateLedger(paymentLedgerName, 'Asset', paymentLedgerName === 'Cash A/C' ? 'Cash-in-hand' : 'Bank Accounts');
                journalEntries.push({ ledgerId: paymentLedger._id, debit: totalAmount, credit: 0 });
            }

            if (cgst > 0) {
                const cgstLedger = await findOrCreateLedger('Output CGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: cgstLedger._id, debit: 0, credit: cgst });
            }
            if (sgst > 0) {
                const sgstLedger = await findOrCreateLedger('Output SGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: sgstLedger._id, debit: 0, credit: sgst });
            }
            if (igst > 0) {
                const igstLedger = await findOrCreateLedger('Output IGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: igstLedger._id, debit: 0, credit: igst });
            }

            const shortId = order._id.toString().slice(-8).toUpperCase();
            const journal = await JournalEntry.create({
                date: new Date(),
                voucherNo: `SAL/${shortId}`,
                type: 'Sales',
                narration: `Sales invoice for Order #${shortId} - Customer: ${order.customer?.name || 'Customer'}`,
                entries: journalEntries,
                totalAmount: totalAmount
            });

            order.journalEntryId = journal._id;
            sysLog('FINANCE', `Posted Sales Journal Entry SAL/${shortId} for Order [${orderId}].`);
        } catch (err) {
            console.error('Failed to post Sales Journal Entry:', err);
        }
    }

    // Sales Return (Credit Note) Journal Entry when order is Cancelled or Returned
    const wasSaleRecorded = previousStatus === 'Delivered' || order.paymentStatus === 'Paid' || order.journalEntryId;
    if ((status === 'Cancelled' || status === 'Returned') && wasSaleRecorded && !order.returnJournalEntryId) {
        try {
            const salesReturnLedger = await findOrCreateLedger('Sales Return Account', 'Revenue', 'Direct Revenues');
            
            const totalAmount = order.totalAmount;
            const cgst = order.cgstAmount || 0;
            const sgst = order.sgstAmount || 0;
            const igst = order.igstAmount || 0;
            const taxTotal = cgst + sgst + igst;
            const taxableTotal = totalAmount - taxTotal;

            const journalEntries = [
                { ledgerId: salesReturnLedger._id, debit: taxableTotal, credit: 0 }
            ];

            if (order.paymentMethod === 'COD' && (order.codCollectionDetails?.method === 'Split' || codMethod === 'Split')) {
                const cashLedger = await findOrCreateLedger('Cash A/C', 'Asset', 'Cash-in-hand');
                const bankLedger = await findOrCreateLedger('Bank Account', 'Asset', 'Bank Accounts');
                
                const splitCashAmount = order.codCollectionDetails?.cashAmount || 0;
                const splitOnlineAmount = order.codCollectionDetails?.onlineAmount || 0;

                journalEntries.push({ ledgerId: cashLedger._id, debit: 0, credit: splitCashAmount });
                journalEntries.push({ ledgerId: bankLedger._id, debit: 0, credit: splitOnlineAmount });
            } else {
                let paymentLedgerName = 'Bank Account';
                if (order.paymentMethod === 'COD' && (order.codCollectionDetails?.method === 'Cash' || codMethod === 'Cash')) {
                    paymentLedgerName = 'Cash A/C';
                }
                const paymentLedger = await findOrCreateLedger(paymentLedgerName, 'Asset', paymentLedgerName === 'Cash A/C' ? 'Cash-in-hand' : 'Bank Accounts');
                journalEntries.push({ ledgerId: paymentLedger._id, debit: 0, credit: totalAmount });
            }

            if (cgst > 0) {
                const cgstLedger = await findOrCreateLedger('Output CGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: cgstLedger._id, debit: cgst, credit: 0 });
            }
            if (sgst > 0) {
                const sgstLedger = await findOrCreateLedger('Output SGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: sgstLedger._id, debit: sgst, credit: 0 });
            }
            if (igst > 0) {
                const igstLedger = await findOrCreateLedger('Output IGST', 'Liability', 'Duties & Taxes');
                journalEntries.push({ ledgerId: igstLedger._id, debit: igst, credit: 0 });
            }

            const shortId = order._id.toString().slice(-8).toUpperCase();
            const reason = order.cancellationReason || 'Customer Cancelled';
            const journal = await JournalEntry.create({
                date: new Date(),
                voucherNo: `CN/${shortId}`,
                type: 'Sales',
                narration: `Sales Return (Credit Note) for Order #${shortId} - Reason: ${reason}`,
                entries: journalEntries,
                totalAmount: totalAmount
            });

            order.returnJournalEntryId = journal._id;
            
            // Refund the customer payment
            if (order.paymentStatus === 'Paid') {
                order.paymentStatus = 'Refunded';
                order.refundStatus = 'Pending';
            }
            
            sysLog('FINANCE', `Posted Sales Return (Credit Note) CN/${shortId} for Order [${orderId}].`);
        } catch (err) {
            console.error('Failed to post Sales Return (Credit Note) Journal Entry:', err);
        }
    }

    await order.save();

    // Re-populate for comprehensive return
    const updatedOrder = await Order.findById(orderId)
        .populate('customer', 'name phone email fcmToken shopName')
        .populate('deliveryPartner', 'name phone email fcmToken');

    // Send Push & Save In-App Notification to Customer
    if (updatedOrder.customer) {
        const customerTitle = 'Order Update';
        const customerBody = `Your order #${updatedOrder._id.toString().slice(-6)} is now ${status}`;

        // Trigger WhatsApp Order Status Change Notification
        const allowedWhatsAppStatuses = ['Placed', 'Out for Delivery', 'Delivered'];
        if (allowedWhatsAppStatuses.includes(status)) {
            try {
                const statusCampaign = process.env.AISENSY_CAMPAIGN_ORDER_STATUS_CHANGED || 'order_status_changed';
                if (updatedOrder.customer.phone) {
                    const orderIdShort = updatedOrder._id.toString().slice(-8).toUpperCase();
                    sendWhatsAppMessage(
                        updatedOrder.customer.phone,
                        updatedOrder.customer.name,
                        statusCampaign,
                        [updatedOrder.customer.name, orderIdShort, status]
                    ).catch(err => console.error('Failed to send Order Status Change WhatsApp:', err));
                }
            } catch (e) {
                console.error('Failed to initialize WhatsApp Status Change flow:', e);
            }
        }
        
        if (updatedOrder.customer.fcmToken) {
            try {
                await sendPushNotification(updatedOrder.customer.fcmToken, customerTitle, customerBody, { type: 'ORDER_UPDATE', orderId: orderId.toString() });
            } catch (err) {
                console.error('Failed to send customer push notification:', err);
            }
        }

        try {
            await AdminNotification.create({
                title: customerTitle,
                message: customerBody,
                targetAudience: 'specific',
                recipientType: 'Customer',
                recipientId: updatedOrder.customer._id,
                status: 'sent',
                sentAt: new Date()
            });
        } catch (err) {
            console.error('Failed to create customer in-app notification:', err);
        }
    }

    // Send Push & Save In-App Notification to Delivery Partner (if assigned)
    if (updatedOrder.deliveryPartner) {
        let partnerTitle = 'New Task Update';
        let partnerBody = `Order #${updatedOrder._id.toString().slice(-6)}: Status changed to ${status}`;
        let notificationType = 'PARTNER_ORDER_UPDATE';

        if (isNewPartnerAssigned) {
            partnerTitle = 'New Order Assigned';
            partnerBody = `You have been assigned order #${updatedOrder._id.toString().slice(-6)}. Status: ${status}`;
            notificationType = 'PARTNER_ORDER_ASSIGNED';
        }

        if (updatedOrder.deliveryPartner.fcmToken) {
            try {
                await sendPushNotification(updatedOrder.deliveryPartner.fcmToken, partnerTitle, partnerBody, { type: notificationType, orderId: orderId.toString() });
            } catch (err) {
                console.error('Failed to send partner push notification:', err);
            }
        }

        try {
            await AdminNotification.create({
                title: partnerTitle,
                message: partnerBody,
                targetAudience: 'specific',
                recipientType: 'DeliveryPartner',
                recipientId: updatedOrder.deliveryPartner._id,
                status: 'sent',
                sentAt: new Date()
            });
        } catch (err) {
            console.error('Failed to create partner in-app notification:', err);
        }
    }

    return updatedOrder;
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
        .populate('customer', 'name phone email shopName')
        .populate('deliveryPartner', 'name phone email')
        .sort({ createdAt: -1 });

    return orders;
};
