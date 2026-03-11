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
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                rate: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                taxableAmount: {
                    type: Number,
                    required: true,
                    min: 0,
                },
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
