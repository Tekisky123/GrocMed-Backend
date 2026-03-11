import express from 'express';
import {  getGSTReturns, generateGSTR1Json, markAsFiled  } from '../controller/gstController.js';

const router = express.Router();

router.route('/')
    .get(getGSTReturns);

router.route('/gstr1-json')
    .get(generateGSTR1Json);

router.route('/mark-filed')
    .post(markAsFiled);

export default router;
