import mongoose from 'mongoose';

const salarySlipSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String, // String ID mapping to arbitrary employee reference for now
            required: [true, 'Employee ID is required'],
            trim: true,
        },
        employeeName: {
            type: String,
            required: [true, 'Employee name is required'],
            trim: true,
        },
        designation: {
            type: String,
            required: true,
        },
        department: {
            type: String,
            required: true,
        },
        monthYear: {
            type: String, // Format: 'mar-2026'
            required: [true, 'Payroll period (monthYear) is required'],
        },
        earnings: {
            basic: { type: Number, required: true, default: 0, min: 0 },
            hra: { type: Number, required: true, default: 0, min: 0 },
            allowances: { type: Number, required: true, default: 0, min: 0 },
            grossPay: { type: Number, required: true, default: 0, min: 0 },
        },
        deductions: {
            tds: { type: Number, required: true, default: 0, min: 0 },
            pf: { type: Number, required: true, default: 0, min: 0 },
            esic: { type: Number, required: true, default: 0, min: 0 },
            totalDeductions: { type: Number, required: true, default: 0, min: 0 },
        },
        netPay: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['Generated', 'Paid'],
            default: 'Generated',
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

// Pre-save hook to ensure math is universally correct
salarySlipSchema.pre('save', function () {
    this.earnings.grossPay = this.earnings.basic + this.earnings.hra + this.earnings.allowances;
    this.deductions.totalDeductions = this.deductions.tds + this.deductions.pf + this.deductions.esic;

    const computedNetPay = this.earnings.grossPay - this.deductions.totalDeductions;

    if (this.netPay !== computedNetPay) {
        this.netPay = computedNetPay; // Auto-corrects if payload was slightly off
    }
});

export default mongoose.model('SalarySlip', salarySlipSchema);
