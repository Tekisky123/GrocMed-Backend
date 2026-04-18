import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    employeeName: {
        type: String,
        required: true,
        trim: true,
    },
    designation: {
        type: String,
        required: true,
        trim: true,
    },
    department: {
        type: String,
        required: true,
        trim: true,
    },
    basicSalary: {
        type: Number,
        required: true,
        min: 0,
    },
    hra: {
        type: Number,
        required: true,
        min: 0,
    },
    otherAllowances: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    deductions: {
        tds: { type: Number, default: 0, min: 0 },
        pf: { type: Number, default: 0, min: 0 },
        esic: { type: Number, default: 0, min: 0 },
    },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Terminated'],
        default: 'Active',
    }
}, { timestamps: true });

// Pre-save to calculate gross/net isn't strictly needed for the master record
// because the master record just defines the structure. The slip calculates actuals.

export default mongoose.model('Employee', employeeSchema);
