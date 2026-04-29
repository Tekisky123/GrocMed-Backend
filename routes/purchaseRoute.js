import express from 'express';
import {  getPurchases, createPurchase, updatePurchaseStatus, updatePurchase, deletePurchase  } from '../controller/purchaseController.js';

const router = express.Router();

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.route('/:id')
    .put(updatePurchase)
    .delete(deletePurchase);

router.route('/:id/status')
    .patch(updatePurchaseStatus);

export default router;
