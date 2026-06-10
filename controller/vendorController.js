import Vendor from '../model/vendorModel.js';

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private/Admin
export const getVendors = async (req, res, next) => {
    try {
        const vendors = await Vendor.find().sort({ name: 1 });
        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a vendor
// @route   POST /api/admin/vendors
// @access  Private/Admin
export const createVendor = async (req, res, next) => {
    try {
        const { name, address, gstin, phone } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vendor name is required'
            });
        }

        // Case-insensitive name uniqueness validation
        const existingVendor = await Vendor.findOne({
            name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
        });
        
        if (existingVendor) {
            return res.status(400).json({
                success: false,
                message: 'A vendor with this name already exists'
            });
        }

        const vendor = await Vendor.create({
            name: name.trim(),
            address,
            gstin,
            phone
        });

        res.status(201).json({
            success: true,
            message: 'Vendor created successfully',
            data: vendor
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a vendor
// @route   PUT /api/admin/vendors/:id
// @access  Private/Admin
export const updateVendor = async (req, res, next) => {
    try {
        const { name, address, gstin, phone } = req.body;

        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        if (name && name.trim()) {
            // Case-insensitive name uniqueness check excluding current vendor
            const existingVendor = await Vendor.findOne({
                name: { $regex: new RegExp("^" + name.trim() + "$", "i") },
                _id: { $ne: req.params.id }
            });

            if (existingVendor) {
                return res.status(400).json({
                    success: false,
                    message: 'A vendor with this name already exists'
                });
            }
            vendor.name = name.trim();
        }

        if (address !== undefined) vendor.address = address;
        if (gstin !== undefined) vendor.gstin = gstin;
        if (phone !== undefined) vendor.phone = phone;

        const updatedVendor = await vendor.save();

        res.status(200).json({
            success: true,
            message: 'Vendor updated successfully',
            data: updatedVendor
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a vendor
// @route   DELETE /api/admin/vendors/:id
// @access  Private/Admin
export const deleteVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found'
            });
        }

        await Vendor.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Vendor deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
