import express from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../controller/vendorController.js';

const router = express.Router();

router.route('/')
    .get(getVendors)
    .post(createVendor);

router.route('/:id')
    .put(updateVendor)
    .delete(deleteVendor);

export default router;
