import { Router } from 'express';
import {
  setupRecurringTransaction,
  getDueRecurringTransactions,
  processDueRecurringTransactions,
  getRecurringForecast,
  updateRecurringTransaction,
  cancelRecurringTransaction
} from '../controllers/recurringController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to ALL routes
router.use(requireAuth);

// POST /api/recurring/setup - Set up new recurring transaction
router.post('/setup', setupRecurringTransaction);

// GET /api/recurring/due - Get transactions due for processing
router.get('/due', getDueRecurringTransactions);

// POST /api/recurring/process - Process due recurring transactions
router.post('/process', processDueRecurringTransactions);

// GET /api/recurring/forecast - Get forecast of upcoming transactions
router.get('/forecast', getRecurringForecast);

// PUT /api/recurring/:id - Update recurring transaction
router.put('/:id', updateRecurringTransaction);

// DELETE /api/recurring/:id - Cancel recurring transaction
router.delete('/:id', cancelRecurringTransaction);

export default router;