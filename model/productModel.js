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
      required: [true, 'Packaging type is required'],
      trim: true,
      // Examples: "Box", "Bottle", "Packet", "Bag", "Can", etc.
    },
    perUnitWeightVolume: {
      type: String,
      required: [true, 'Unit weight/volume is required'],
      trim: true,
      // Examples: "500g", "1L", "250ml", "1kg", etc.
    },
    unitsPerUnitType: {
      type: Number,
      required: [true, 'Units per package is required'],
      min: [1, 'Units per package must be at least 1'],
      default: 1,
      // Example: 12 (means 12 pieces per box)
    },
    // Package Pricing
    mrp: {
      type: Number,
      required: [true, 'Package MRP is required'],
      min: [0, 'MRP must be a positive number'],
    },
    offerPrice: {
      type: Number,
      required: [true, 'Package sale price is required'],
      min: [0, 'Offer price must be a positive number'],
    },
    // Single Unit Pricing
    singleUnitPrice: {
      type: Number,
      required: [true, 'Single unit price is required'],
      min: [0, 'Single unit price must be a positive number'],
    },
    // Stock
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock must be a positive number'],
      default: 0,
    },
    // Dates
    manfDate: {
      type: Date,
      required: false,
      // Manufacturing Date
    },
    expiryDate: {
      type: Date,
      required: false,
      // Expiration Date
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
      // Broadcast notification to customers
    },
    isOffer: {
      type: Boolean,
      default: false,
      // Special offer flag
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

// Validation: Ensure offer price doesn't exceed MRP
productSchema.pre('save', async function () {
  if (this.offerPrice > this.mrp) {
    throw new Error('Offer price cannot be greater than MRP');
  }
});


const Product = mongoose.model('Product', productSchema);

export default Product;
