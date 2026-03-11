import express from 'express';
import {  getAdjustments, createAdjustment  } from '../controller/stockAdjustmentController.js';

const router = express.Router();

router.route('/adjustments')
    .get(getAdjustments);

router.route('/adjust')
    .post(createAdjustment);

export default router;
