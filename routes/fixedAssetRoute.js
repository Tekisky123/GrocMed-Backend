import express from 'express';
import {  getAssets, createAsset, runDepreciation  } from '../controller/fixedAssetController.js';

const router = express.Router();

router.route('/')
    .get(getAssets)
    .post(createAsset);

router.route('/depreciate')
    .post(runDepreciation);

export default router;
