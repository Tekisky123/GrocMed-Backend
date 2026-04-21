import {  getPurchases, createPurchase, updatePurchaseStatus  } from '../controller/purchaseController.js';

const router = express.Router();

router.route('/')
    .get(getPurchases)
    .post(createPurchase);

router.route('/:id/status')
    .patch(updatePurchaseStatus);

export default router;
