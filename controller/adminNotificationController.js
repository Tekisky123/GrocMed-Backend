import { sendPushNotification } from '../utils/notificationService.js';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';
import AdminNotification from '../model/adminNotificationModel.js';

export const sendNotification = async (req, res, next) => {
    try {
        const { title, message, target, audience } = req.body;
        // Audience selection: 'all', 'customers', 'delivery_partners'
        const targetGroup = target || audience || 'customers';
        const adminId = req.user?.id || req.admin?._id; // Handle different auth middleware structures

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and Message are required'
            });
        }

        // 1. Create Notification Record
        const notificationRecord = await AdminNotification.create({
            title,
            message,
            targetAudience: targetGroup,
            status: 'sending',
            metrics: { totalTarget: 0, delivered: 0, failed: 0 },
            createdBy: adminId
        });

        // 2. Fetch Recipients
        let recipients = [];
        if (targetGroup === 'customers' || targetGroup === 'all') {
            const customers = await Customer.find({
                fcmToken: { $exists: true, $ne: null },
                isActive: true
            }).select('fcmToken');
            recipients = [...recipients, ...customers];
        }

        if (targetGroup === 'delivery_partners' || targetGroup === 'all') {
            const partners = await DeliveryPartner.find({
                fcmToken: { $exists: true, $ne: null },
                accountStatus: 'Approved'
            }).select('fcmToken');
            recipients = [...recipients, ...partners];
        }

        // 3. Send Notifications
        let successCount = 0;
        let failureCount = 0;
        const totalTarget = recipients.length;

        console.log(`Sending Admin Notification "${title}" to ${totalTarget} users (${targetGroup})`);
        console.log(`Recipients found: ${recipients.length}`);
        if (recipients.length > 0) console.log(`Sample Token: ${recipients[0].fcmToken.substring(0, 10)}...`);

        // Send in background (pseudo) or await if critical. 
        // For better UX, we await to give accurate initial stats, but for scale, queue is better.
        // We stick to await for simplicity and data integrity in this version.
        const promises = recipients.map(user => {
            if (user.fcmToken) {
                return sendPushNotification(user.fcmToken, title, message, { type: 'admin_broadcast' })
                    .then(async (res) => {
                        console.log(`Result for ${user.fcmToken.substring(0, 10)}... :`, res);

                        if (res && (res.success || res.status === 'ok')) {
                            successCount++;
                        } else {
                            failureCount++;
                            // Handle Invalid Token Cleanup
                            if (res && res.error) {
                                const errorCode = res.error.code;
                                if (errorCode === 'messaging/invalid-argument' ||
                                    errorCode === 'messaging/registration-token-not-registered' ||
                                    errorCode === 'messaging/invalid-registration-token') {

                                    console.log(`Removing invalid token for user ${user._id}`);

                                    // Try to update both models since we don't know the type for sure in this array
                                    // Optimization: Check if 'role' exists or try both. 
                                    // Given we merged them into 'recipients', we can try updating both collections.
                                    // Or safer: just set fcmToken to null.

                                    try {
                                        await Customer.updateOne({ _id: user._id }, { fcmToken: null });
                                        await DeliveryPartner.updateOne({ _id: user._id }, { fcmToken: null });
                                    } catch (cleanupErr) {
                                        console.error('Failed to cleanup invalid token:', cleanupErr);
                                    }
                                }
                            }
                        }
                    })
                    .catch(err => {
                        console.error('Failed to send frame:', err);
                        failureCount++;
                    });
            } else {
                failureCount++;
                return Promise.resolve();
            }
        });

        await Promise.allSettled(promises);

        // 4. Update Record
        notificationRecord.status = 'sent';
        notificationRecord.metrics = {
            totalTarget,
            delivered: successCount,
            failed: failureCount
        };
        await notificationRecord.save();

        res.status(200).json({
            success: true,
            message: `Notification sent successfully to ${successCount} devices`,
            data: notificationRecord
        });

    } catch (error) {
        next(error);
    }
};

export const getAllNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await AdminNotification.find()
            .sort({ sentAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('createdBy', 'name email'); // Optional: populate sender info if needed

        const total = await AdminNotification.countDocuments();

        res.status(200).json({
            success: true,
            count: notifications.length,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: notifications
        });
    } catch (error) {
        next(error);
    }
};

export const getNotificationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await AdminNotification.findById(id).populate('createdBy', 'name email');

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        next(error);
    }
};
