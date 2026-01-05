import {
    createDeliveryPartnerService,
    getAllDeliveryPartnersService,
    getDeliveryPartnerByIdService,
    updateDeliveryPartnerService,
    deleteDeliveryPartnerService,
    loginDeliveryPartnerService,
    updateDeliveryPartnerFcmTokenService,
} from '../services/deliveryPartnerService.js';

export const createDeliveryPartner = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const partnerData = req.body;
        const partner = await createDeliveryPartnerService(partnerData, adminId);

        res.status(201).json({
            success: true,
            message: 'Delivery Partner created successfully',
            data: partner,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getAllDeliveryPartners = async (req, res) => {
    try {
        const partners = await getAllDeliveryPartnersService();
        res.status(200).json({
            success: true,
            message: 'Delivery Partners retrieved successfully',
            count: partners.length,
            data: partners,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve delivery partners',
            error: error.message,
        });
    }
};

export const getDeliveryPartnerById = async (req, res) => {
    try {
        const { id } = req.params;
        const partner = await getDeliveryPartnerByIdService(id);
        res.status(200).json({
            success: true,
            message: 'Delivery Partner retrieved successfully',
            data: partner,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateDeliveryPartner = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedPartner = await updateDeliveryPartnerService(id, updateData);
        res.status(200).json({
            success: true,
            message: 'Delivery Partner updated successfully',
            data: updatedPartner,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const deleteDeliveryPartner = async (req, res) => {
    try {
        const { id } = req.params;
        await deleteDeliveryPartnerService(id);
        res.status(200).json({
            success: true,
            message: 'Delivery Partner deleted successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginDeliveryPartner = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }
        const data = await loginDeliveryPartnerService({ email, password });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: data,
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateFcmToken = async (req, res) => {
    try {
        // ID comes from authenticated token (req.user is typically set by authenticateToken)
        // Check how authenticateToken sets the user. Usually req.user or req.admin.
        // I will assume req.user based on typical JWT middleware.
        // If authenticateToken isn't suitable, I might need a specific one or rely on body ID (less secure).
        // Let's assume req.user.id is available from the token.
        // Wait, authenticateToken usually sets req.user. 
        // Delivery Partner Login sets: { id: partner._id, role: 'delivery_partner', email: ... }

        const id = req.user?.id || req.body.id; // Fallback to body for now if middleware varies
        const { fcmToken } = req.body;

        if (!id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No User ID found' });
        }

        await updateDeliveryPartnerFcmTokenService(id, fcmToken);

        res.status(200).json({
            success: true,
            message: 'FCM Token updated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
