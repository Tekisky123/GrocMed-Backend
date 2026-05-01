import express from 'express';
import { 
    getAllSlots, 
    createSlot, 
    updateSlot, 
    deleteSlot, 
    checkAvailability 
} from '../controller/deliverySlotController.js';
import { authenticateToken as protect, authorizeRoles as authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Customer
router.get('/availability', checkAvailability);

// Admin only
router.get('/', protect, authorize('admin'), getAllSlots);
router.post('/', protect, authorize('admin'), createSlot);
router.put('/:id', protect, authorize('admin'), updateSlot);
router.delete('/:id', protect, authorize('admin'), deleteSlot);

export default router;
