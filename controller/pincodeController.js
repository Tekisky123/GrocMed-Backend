import Pincode from '../model/pincodeModel.js';

// ─── Admin: Get all pincodes (with pagination & search) ───────────────────────
export const getAllPincodes = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 50, activeOnly } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { pincode: { $regex: search, $options: 'i' } },
                { area: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
            ];
        }
        if (activeOnly === 'true') {
            query.isActive = true;
        }

        const total = await Pincode.countDocuments(query);
        const pincodes = await Pincode.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        return res.status(200).json({
            success: true,
            data: pincodes,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Public: Get active pincodes only (for customer dropdown) ─────────────────
export const getActivePincodes = async (req, res) => {
    try {
        const pincodes = await Pincode.find({ isActive: true })
            .select('pincode area city state deliveryNote')
            .sort({ city: 1, pincode: 1 });

        return res.status(200).json({ success: true, data: pincodes });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Create a single pincode ────────────────────────────────────────────
export const createPincode = async (req, res) => {
    try {
        const { pincode, area, city, state, isActive, deliveryNote } = req.body;

        const exists = await Pincode.findOne({ pincode });
        if (exists) {
            return res.status(409).json({ success: false, message: `Pincode ${pincode} already exists` });
        }

        const newPincode = await Pincode.create({ pincode, area, city, state, isActive, deliveryNote });
        return res.status(201).json({ success: true, data: newPincode, message: 'Pincode added successfully' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ─── Admin: Update a pincode ───────────────────────────────────────────────────
export const updatePincode = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Pincode.findByIdAndUpdate(id, req.body, { new: true, runValidators: false });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }
        return res.status(200).json({ success: true, data: updated, message: 'Pincode updated successfully' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ─── Admin: Toggle active status ──────────────────────────────────────────────
export const togglePincodeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const pincode = await Pincode.findById(id);
        if (!pincode) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }

        const updated = await Pincode.findByIdAndUpdate(
            id,
            { isActive: !pincode.isActive },
            { new: true, runValidators: false }
        );

        return res.status(200).json({
            success: true,
            data: updated,
            message: `Pincode ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


// ─── Admin: Delete a pincode ───────────────────────────────────────────────────
export const deletePincode = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Pincode.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Pincode not found' });
        }
        return res.status(200).json({ success: true, message: 'Pincode deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
