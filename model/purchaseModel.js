import mongoose from 'mongoose';

const purchaseInvoiceSchema = new mongoose.Schema(
    {
        invoiceNo: {
            type: String,
            required: [true, 'Invoice number is required'],
            unique: true,
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'Invoice date is required'],
        },
        supplierName: {
            type: String,
            required: [true, 'Supplier name is required'],
            trim: true,
        },
        gstin: {
            type: String,
            trim: true,
            uppercase: true,
        },
        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                productName: {
                    type: String,
                    required: true,
                },
                invoiceNo: {
                    type: String, // Row level invoice no
                    required: false,
                },
                date: {
                    type: Date, // Row level date
                    required: false,
                },
                sku: {
                    type: String,
                    enum: ['PACK', 'CARTON', 'LOOSE'],
                    default: 'PACK',
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                mrp: {
                    type: Number,
                    required: true,
                    default: 0,
                },
                rate: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                hsn: {
                    type: String,
                    trim: true,
                },
                gstRate: {
                    type: Number,
                    default: 0,
                },
                mfgDate: {
                    type: Date,
                },
                expiryDate: {
                    type: Date,
                },
                taxableAmount: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                total: {
                    type: Number,
                    required: true,
                    default: 0,
                }
            },
        ],
        taxBreakup: {
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            igst: { type: Number, default: 0 },
        },
        taxableTotal: {
            type: Number,
            required: true,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: ['Unpaid', 'Partially Paid', 'Paid'],
            default: 'Unpaid',
        },
        journalEntryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JournalEntry',
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
