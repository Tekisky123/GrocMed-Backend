import express from 'express';
import { getSettings, updateSettings } from '../controller/settingController.js';

const router = express.Router();

// Publicly available to query constraints instantly
router.get('/', getSettings);

// Normally protected by admin auth overlay. We use default endpoints like other controllers.
router.put('/', updateSettings);

export default router;
