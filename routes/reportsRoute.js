import express from 'express';
import {  getTrialBalance, getProfitAndLoss, getBalanceSheet, getCashFlow  } from '../controller/reportsController.js';

const router = express.Router();

router.route('/trial-balance')
    .get(getTrialBalance);

router.route('/pnl')
    .get(getProfitAndLoss);

router.route('/balance-sheet')
    .get(getBalanceSheet);

router.route('/cash-flow')
    .get(getCashFlow);

export default router;
