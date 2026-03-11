import express from 'express';
import {
    getShareholders, createShareholder, transferShares,
    getDirectors, createDirector,
    getCharges, createCharge
} from '../controller/statutoryController.js';

const router = express.Router();

router.route('/members')
    .get(getShareholders)
    .post(createShareholder);

router.route('/transfer')
    .post(transferShares);

router.route('/directors')
    .get(getDirectors)
    .post(createDirector);

router.route('/charges')
    .get(getCharges)
    .post(createCharge);

export default router;
