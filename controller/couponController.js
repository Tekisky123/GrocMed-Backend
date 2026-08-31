import Coupon from '../model/couponModel.js';

// Create a new coupon (Admin)
export const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      discountAmount,
      minOrderAmount,
      validFrom,
      validUntil,
      usageLimit,
      perUserLimit,
      isActive,
    } = req.body;

    if (!code || !discountAmount || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code, discount amount, and expiration date are required',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    const existingCoupon = await Coupon.findOne({ code: cleanCode });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: `Coupon code "${cleanCode}" already exists`,
      });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      discountAmount: Number(discountAmount),
      minOrderAmount: Number(minOrderAmount || 0),
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      usageLimit: Number(usageLimit || 100),
      perUserLimit: Number(perUserLimit || 1),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Get all coupons (Admin)
export const getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });

    const now = new Date();
    const formattedCoupons = coupons.map((c) => {
      const isExpired = c.validUntil < now;
      const isDepleted = c.usedCount >= c.usageLimit;
      let status = 'Active';
      if (!c.isActive) status = 'Inactive';
      else if (isExpired) status = 'Expired';
      else if (isDepleted) status = 'Depleted';

      return {
        ...c.toObject(),
        status,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedCoupons,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle active status (Admin)
export const toggleCouponStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} is now ${coupon.isActive ? 'Active' : 'Inactive'}`,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

// Delete coupon (Admin)
export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Apply/Validate Coupon (Customer)
export const applyCoupon = async (req, res, next) => {
  try {
    const { code, cartSubtotal } = req.body;
    const userId = req.customer?._id || req.customer?.id || req.user?._id || req.user?.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code',
      });
    }

    const validation = coupon.isValid(Number(cartSubtotal || 0), userId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Calculate discount amount (flat rupee discount, capped at subtotal)
    let discountAmount = Math.min(Number(cartSubtotal), coupon.discountAmount);

    res.status(200).json({
      success: true,
      message: `₹${discountAmount} discount applied!`,
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discountAmount,
        finalTotal: Math.max(0, Number(cartSubtotal) - discountAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get available active coupons for public customer display
export const getAvailableCoupons = async (req, res, next) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).select('code discountAmount minOrderAmount validUntil perUserLimit');

    res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};
