import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Product brand is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    // Packaging Information
    unitType: {
      type: String,
      required: false,
      trim: true,
    },
    perUnitWeightVolume: {
      type: String,
      required: false,
      trim: true,
    },
    unitsPerUnitType: {
      type: Number,
      required: false,
      min: [1, 'Units per package must be at least 1'],
      default: 1,
    },
    // Package Pricing (legacy — kept for backward compat)
    mrp: {
      type: Number,
      required: false,
      min: [0, 'MRP must be a positive number'],
      default: 0,
    },
    offerPrice: {
      type: Number,
      required: false,
      min: [0, 'Offer price must be a positive number'],
      default: 0,
    },
    singleUnitPrice: {
      type: Number,
      required: false,
      min: [0, 'Single unit price must be a positive number'],
      default: 0,
    },
    // ─── Multi-Packaging Options ───────────────────────────────────────────────
    // Example: [
    //   { label: "Carton (24 packs)", unitsPerPack: 24, mrp: 480, salePrice: 420, minQty: 1 },
    //   { label: "Strip of 15 pieces", unitsPerPack: 15, mrp: 120, salePrice: 105, minQty: 2 }
    // ]
    packagingOptions: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        unitsPerPack: {
          type: Number,
          required: true,
          min: [1, 'Units per pack must be at least 1'],
          default: 1,
        },
        mrp: {
          type: Number,
          required: true,
          min: [0, 'MRP must be positive'],
        },
        salePrice: {
          type: Number,
          required: true,
          min: [0, 'Sale price must be positive'],
        },
        minQty: {
          type: Number,
          required: false,
          min: [1, 'Minimum quantity must be at least 1'],
          default: 1,
        },
        stock: {
          type: Number,
          required: false,
          min: [0, 'Stock must be positive'],
          default: 0,
        },
      },
    ],
    // Stock
    stock: {
      type: Number,
      min: [0, 'Stock must be a positive number'],
      default: 0,
    },
    // Minimum Order Quantity (global fallback)
    minimumQuantity: {
      type: Number,
      required: false,
      min: [1, 'Minimum quantity must be at least 1'],
      default: 1,
    },
    // Accounting & Taxation
    hsnCode: {
      type: String,
      required: false,
      trim: true,
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 0,
    },
    // Dates
    manfDate: {
      type: Date,
      required: false,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
    // Images
    images: {
      type: [String],
      default: [],
    },
    // Flags
    notifyCustomers: {
      type: Boolean,
      default: false,
    },
    isOffer: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
