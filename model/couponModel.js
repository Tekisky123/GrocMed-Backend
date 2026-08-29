import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [1, 'Discount percentage must be at least 1%'],
      max: [100, 'Discount percentage cannot exceed 100%'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      default: null, // Optional ceiling amount in Rupees
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    usageLimit: {
      type: Number,
      default: 100, // Total redemptions allowed across all users
      min: [1, 'Usage limit must be at least 1'],
    },
    perUserLimit: {
      type: Number,
      default: 1, // Number of times a single user can redeem (1 = only once)
      min: [1, 'Per-user limit must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Customer',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual helper to check if coupon is currently valid
couponSchema.methods.isValid = function (subtotal = 0, userId = null) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (this.validUntil < now) return { valid: false, message: 'Coupon has expired' };
  if (this.validFrom > now) return { valid: false, message: 'Coupon is not valid yet' };
  if (this.usedCount >= this.usageLimit) return { valid: false, message: 'Coupon usage limit has been reached' };
  if (subtotal < this.minOrderAmount) return { valid: false, message: `Minimum order amount of ₹${this.minOrderAmount} required` };

  if (userId && this.usedBy && this.usedBy.length > 0) {
    const userUsages = this.usedBy.filter(
      (u) => u.userId && u.userId.toString() === userId.toString()
    ).length;
    if (userUsages >= this.perUserLimit) {
      return { valid: false, message: `You have already used this coupon (Limit: ${this.perUserLimit} per user)` };
    }
  }

  return { valid: true };
};

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
