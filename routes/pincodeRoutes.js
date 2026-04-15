import express from 'express';
import {
    getAllPincodes,
    getActivePincodes,
    createPincode,
    updatePincode,
    togglePincodeStatus,
    deletePincode,
} from '../controller/pincodeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public route (customer app uses this for the dropdown) ─────────────────────
router.get('/active', getActivePincodes);

// ── Admin protected routes ─────────────────────────────────────────────────────
router.get('/', authenticateToken, getAllPincodes);
router.post('/', authenticateToken, createPincode);
router.put('/:id', authenticateToken, updatePincode);
router.patch('/:id/toggle', authenticateToken, togglePincodeStatus);
router.delete('/:id', authenticateToken, deletePincode);

export default router;
