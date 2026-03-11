import express from 'express';
import {  getPurchases, createPurchase  } from '../controller/purchaseController.js';

const router = express.Router();

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

export default router;
