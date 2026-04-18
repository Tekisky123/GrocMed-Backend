import SalarySlip from '../model/payrollModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import AccountLedger from '../model/accountLedgerModel.js';
import Employee from '../model/employeeModel.js';
import mongoose from 'mongoose';

// @desc    Process payroll for the month (Mock implementation generating slips via REST)
// @route   POST /api/admin/payroll/process
// @access  Private/Admin
export const processPayroll = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { slips, monthYear } = req.body;
        // Array of employee data coming from frontend state

        const savedSlips = await SalarySlip.insertMany(slips, { session });

        // Calculate Totals for the massive month-end Journal Entry
        let totalGross = 0, totalPF = 0, totalESIC = 0, totalTDS = 0, totalNet = 0;

        savedSlips.forEach(slip => {
            totalGross += slip.earnings.grossPay;
            totalPF += slip.deductions.pf;
            totalESIC += slip.deductions.esic;
            totalTDS += slip.deductions.tds;
            totalNet += slip.netPay;
        });

        // Generate the Journal Entry
        // Safety: Look for ledgers. If missing, create them.
        const requiredLedgers = [
            { name: 'Salary Expense', group: 'Expense' },
            { name: 'Salary Payable', group: 'Liability' },
            { name: 'TDS Payable', group: 'Liability' },
            { name: 'PF Payable', group: 'Liability' },
            { name: 'ESIC Payable', group: 'Liability' }
        ];

        const ledgerMap = {};
        for (const l of requiredLedgers) {
            let ledger = await AccountLedger.findOne({ name: l.name }).session(session);
            if (!ledger) {
                [ledger] = await AccountLedger.create([{
                    name: l.name,
                    group: l.group,
                    openingBalance: 0,
                    openingBalanceType: l.group === 'Expense' ? 'Dr' : 'Cr'
                }], { session });
            }
            ledgerMap[l.name] = ledger;
        }

        const journal = await JournalEntry.create([{
            date: new Date(),
            voucherNo: `PRL/${monthYear.replace('-', '').toUpperCase()}`,
            type: 'Journal',
            narration: `Payroll booked for ${monthYear}`,
            entries: [
                { ledgerId: ledgerMap['Salary Expense']._id, debit: totalGross, credit: 0 },
                { ledgerId: ledgerMap['TDS Payable']._id, debit: 0, credit: totalTDS },
                { ledgerId: ledgerMap['PF Payable']._id, debit: 0, credit: totalPF },
                { ledgerId: ledgerMap['ESIC Payable']._id, debit: 0, credit: totalESIC },
                { ledgerId: ledgerMap['Salary Payable']._id, debit: 0, credit: totalNet },
            ],
            totalAmount: totalGross
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: `Payroll processed successfully for ${monthYear}`,
            data: savedSlips,
            journalId: journal[0]._id
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// @desc    Get processed slips
// @route   GET /api/admin/payroll/slips/:monthYear
// @access  Private/Admin
export const getSalarySlips = async (req, res, next) => {
    try {
        const slips = await SalarySlip.find({ monthYear: req.params.monthYear });

        res.status(200).json({
            success: true,
            count: slips.length,
            data: slips,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all employees
// @route   GET /api/admin/payroll/employees
// @access  Private/Admin
export const getEmployees = async (req, res, next) => {
    try {
        const employees = await Employee.find({ status: 'Active' });
        res.status(200).json({ success: true, count: employees.length, data: employees });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new employee
// @route   POST /api/admin/payroll/employees
// @access  Private/Admin
export const createEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.create(req.body);
        res.status(201).json({ success: true, message: 'Employee added successfully', data: employee });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Employee ID already exists.' });
        next(error);
    }
};
