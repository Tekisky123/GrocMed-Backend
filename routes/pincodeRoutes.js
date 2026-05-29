import express from 'express';
import {
    getAllPincodes,
    getActivePincodes,
    createPincode,
    updatePincode,
    togglePincodeStatus,
    deletePincode,
} from '../controller/pincodeController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public route (customer app uses this for the dropdown) ─────────────────────
router.get('/active', getActivePincodes);

// ── Admin protected routes (Super Admin only) ──────────────────────────────────
router.get('/', authenticateToken, isSuperAdmin, getAllPincodes);
router.post('/', authenticateToken, isSuperAdmin, createPincode);
router.put('/:id', authenticateToken, isSuperAdmin, updatePincode);
router.patch('/:id/toggle', authenticateToken, isSuperAdmin, togglePincodeStatus);
router.delete('/:id', authenticateToken, isSuperAdmin, deletePincode);

export default router;
