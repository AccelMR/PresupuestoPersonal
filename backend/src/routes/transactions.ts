import { Router } from 'express';
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByAccount,
  getMonthlyTransactions,
  getRecurringTransactions,
  createBulkTransactions,
  getTransactionSummary
} from '../controllers/transactionController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// IMPORTANT: Specific routes MUST come before generic /:id routes!

// Specialized endpoints for financial operations (FIRST)
// GET /api/transactions/summary - Get transaction summary/statistics
router.get('/summary', getTransactionSummary);

// GET /api/transactions/recurring - Get recurring transactions
router.get('/recurring', getRecurringTransactions);

// GET /api/transactions/monthly/:year/:month - Get monthly transactions
router.get('/monthly/:year/:month', getMonthlyTransactions);

// GET /api/transactions/account/:accountId - Get transactions for specific account
router.get('/account/:accountId', getTransactionsByAccount);

// POST /api/transactions/bulk - Create multiple transactions
router.post('/bulk', createBulkTransactions);

// Basic CRUD operations (AFTER specific routes)
// GET /api/transactions - Get all transactions with filters
router.get('/', getAllTransactions);

// POST /api/transactions - Create new transaction
router.post('/', createTransaction);

// GET /api/transactions/:id - Get specific transaction (LAST for GET)
router.get('/:id', getTransactionById);

// PUT /api/transactions/:id - Update transaction
router.put('/:id', updateTransaction);

// DELETE /api/transactions/:id - Delete transaction (with reversal)
router.delete('/:id', deleteTransaction);

export default router;