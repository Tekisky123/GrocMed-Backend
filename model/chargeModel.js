import mongoose from 'mongoose';

const chargeSchema = new mongoose.Schema({
    chargeId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    lender: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    createdDate: {
        type: Date,
        required: true,
    },
    rocId: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Satisfied'],
        default: 'Active',
    }
}, { timestamps: true });

const Charge = mongoose.model('Charge', chargeSchema);
export default Charge;
