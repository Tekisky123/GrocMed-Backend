import AccountLedger from '../model/accountLedgerModel.js';
import JournalEntry from '../model/journalEntryModel.js';
import mongoose from 'mongoose';

// Helper function to build the trail balance pipeline
const getTrialBalancePipeline = (startDate, endDate) => {
    return [
        {
            $match: {
                date: { $gte: new Date(startDate), $lte: new Date(endDate) },
                status: 'Posted'
            }
        },
        { $unwind: "$entries" },
        {
            $group: {
                _id: "$entries.ledgerId",
                totalDebit: { $sum: "$entries.debit" },
                totalCredit: { $sum: "$entries.credit" }
            }
        },
        {
            $lookup: {
                from: "accountledgers", // Mongoose collection name is lowercase plural
                localField: "_id",
                foreignField: "_id",
                as: "ledgerDetails"
            }
        },
        { $unwind: "$ledgerDetails" },
        {
            $project: {
                _id: 1,
                name: "$ledgerDetails.name",
                group: "$ledgerDetails.group",
                subGroup: "$ledgerDetails.subGroup",
                totalDebit: 1,
                totalCredit: 1,
                netBalance: { $subtract: ["$totalDebit", "$totalCredit"] }
            }
        }
    ];
};

// @desc    Generate Trial Balance
// @route   GET /api/admin/reports/trial-balance
// @access  Private/Admin
export const getTrialBalance = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Please provide startDate and endDate' });

        const pipeline = getTrialBalancePipeline(startDate, endDate);
        const trialBalance = await JournalEntry.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: trialBalance,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Profit & Loss Statement (P&L)
// @route   GET /api/admin/reports/pnl
// @access  Private/Admin
export const getProfitAndLoss = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Please provide startDate and endDate' });

        const pipeline = getTrialBalancePipeline(startDate, endDate);
        const trialBalance = await JournalEntry.aggregate(pipeline);

        // Filter for P&L items (Revenue and Expense)
        let totalRevenue = 0;
        let totalExpense = 0;
        const revenueItems = [];
        const expenseItems = [];

        trialBalance.forEach(item => {
            if (item.group === 'Revenue') {
                const balance = Math.abs(item.netBalance); // Revenue usually has Cr balance (negative netBalance in our math)
                revenueItems.push({ ...item, balance });
                totalRevenue += balance;
            } else if (item.group === 'Expense') {
                const balance = Math.abs(item.netBalance); // Expense usually has Dr balance
                expenseItems.push({ ...item, balance });
                totalExpense += balance;
            }
        });

        const netProfit = totalRevenue - totalExpense;

        res.status(200).json({
            success: true,
            data: {
                revenue: revenueItems,
                expenses: expenseItems,
                totals: { totalRevenue, totalExpense, netProfit }
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Balance Sheet
// @route   GET /api/admin/reports/balance-sheet
// @access  Private/Admin
export const getBalanceSheet = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Please provide startDate and endDate' });

        const pipeline = getTrialBalancePipeline(startDate, endDate);
        const trialBalance = await JournalEntry.aggregate(pipeline);

        let totalAssets = 0;
        let totalLiabilitiesAndEquity = 0;
        const assetItems = [];
        const liabilityItems = [];
        const equityItems = [];
        let pnlNetProfit = 0;

        trialBalance.forEach(item => {
            if (item.group === 'Asset') {
                assetItems.push(item);
                totalAssets += item.netBalance;
            } else if (item.group === 'Liability') {
                liabilityItems.push(item);
                totalLiabilitiesAndEquity += Math.abs(item.netBalance);
            } else if (item.group === 'Equity') {
                equityItems.push(item);
                totalLiabilitiesAndEquity += Math.abs(item.netBalance);
            } else if (item.group === 'Revenue') {
                pnlNetProfit += Math.abs(item.netBalance);
            } else if (item.group === 'Expense') {
                pnlNetProfit -= Math.abs(item.netBalance);
            }
        });

        // Add Net Profit to Equity/Liabilities side to balance the sheet
        totalLiabilitiesAndEquity += pnlNetProfit;

        res.status(200).json({
            success: true,
            data: {
                assets: assetItems,
                liabilities: liabilityItems,
                equity: equityItems,
                currentYearProfit: pnlNetProfit,
                totals: {
                    assets: totalAssets,
                    liabilitiesAndEquity: totalLiabilitiesAndEquity
                }
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Cash Flow Statement (Simplified Indirect/Direct approximation)
// @route   GET /api/admin/reports/cash-flow
// @access  Private/Admin
export const getCashFlow = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Please provide startDate and endDate' });

        const pipeline = getTrialBalancePipeline(startDate, endDate);
        const trialBalance = await JournalEntry.aggregate(pipeline);

        let netProfit = 0;
        let operatingCashFlow = 0;
        let investingCashFlow = 0;
        let financingCashFlow = 0;

        trialBalance.forEach(item => {
            // Calculate Net Profit
            if (item.group === 'Revenue') netProfit += Math.abs(item.netBalance);
            if (item.group === 'Expense') netProfit -= Math.abs(item.netBalance);

            // Simple heuristics for Cash Flow
            // Operating: Net Profit + Depreciation (Assuming SubGroup contains 'Depreciation')
            if (item.subGroup && item.subGroup.toLowerCase().includes('depreciation')) {
                operatingCashFlow += Math.abs(item.netBalance); // Add back non-cash expense
            }

            // Investing: Fixed Assets
            if (item.group === 'Asset' && item.subGroup && item.subGroup.toLowerCase().includes('fixed')) {
                investingCashFlow -= item.netBalance; // Increase in asset = outflow
            }

            // Financing: Equity & Long Term Liability
            if (item.group === 'Equity' || (item.group === 'Liability' && item.subGroup && item.subGroup.toLowerCase().includes('long'))) {
                financingCashFlow += item.netBalance; // Increase in equity/liability = inflow
            }
        });

        // Simplified Operating Cash Flow starts with Net Profit
        operatingCashFlow += netProfit;

        res.status(200).json({
            success: true,
            data: {
                operatingActivities: operatingCashFlow,
                investingActivities: investingCashFlow,
                financingActivities: financingCashFlow,
                netCashFlow: operatingCashFlow + investingCashFlow + financingCashFlow
            },
        });
    } catch (error) {
        next(error);
    }
};
