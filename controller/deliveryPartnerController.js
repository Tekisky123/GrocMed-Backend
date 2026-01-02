import {
    createDeliveryPartnerService,
    getAllDeliveryPartnersService,
    getDeliveryPartnerByIdService,
    updateDeliveryPartnerService,
    deleteDeliveryPartnerService,
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
