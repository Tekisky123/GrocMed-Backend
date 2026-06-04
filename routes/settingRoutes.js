import express from 'express';
import { getSettings, updateSettings, uploadPaymentQr, deletePaymentQr } from '../controller/settingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Publicly available to query constraints instantly
router.get('/', getSettings);

// Protected update route (Admin only)
router.put('/', authenticateToken, updateSettings);

// Payment QR upload/delete (multer handles multipart/form-data)
router.post('/payment-qr', authenticateToken, upload.single('image'), uploadPaymentQr);
router.delete('/payment-qr', authenticateToken, deletePaymentQr);

export default router;
