import express from 'express';
import { processPayroll, getSalarySlips, getEmployees, createEmployee } from '../controller/payrollController.js';

const router = express.Router();

router.route('/process')
    .post(processPayroll);

router.route('/slips/:monthYear')
    .get(getSalarySlips);

router.route('/employees')
    .get(getEmployees)
    .post(createEmployee);

export default router;
