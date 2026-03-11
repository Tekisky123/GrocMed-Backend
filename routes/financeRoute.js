import express from 'express';
import { 
    getLedgers,
    createLedger,
    createJournalEntry,
    getJournals
 } from '../controller/financeController.js';

// Using the existing 'isAuthenticatedAdmin' or standard auth middleware
// If your project uses a different name for the admin check, we will adjust this later.
// For now, these routes represent the core structure.
const router = express.Router();

// Ledgers (Chart of Accounts)
router.route('/ledgers')
    .get(getLedgers)
    .post(createLedger);

// Journal Entries (Double Entry Bookkeeping Core)
router.route('/journal')
    .get(getJournals)
    .post(createJournalEntry);

export default router;
