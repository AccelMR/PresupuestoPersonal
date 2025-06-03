import { Router } from 'express';
import {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount,
  getCreditStatus,
  getCreditPaymentCalculation  // New import
} from '../controllers/accountController';
import { requireAuth } from '../middleware/auth'; 

const router = Router();

router.use(requireAuth);

// GET /api/accounts - Get all active accounts
router.get('/', getAllAccounts);

// GET /api/accounts/:id - Get specific account
router.get('/:id', getAccountById);

// POST /api/accounts - Create new account
router.post('/', createAccount);

// PUT /api/accounts/:id - Update account
router.put('/:id', updateAccount);

// PUT /api/accounts/:id/balance - Update account balance
router.put('/:id/balance', updateAccountBalance);

// DELETE /api/accounts/:id - Soft delete account
router.delete('/:id', deleteAccount);

// GET /api/accounts/:id/credit-status - Get credit status
router.get('/:id/credit-status', getCreditStatus);

// NEW: GET /api/accounts/:id/payment-calculation - Get payment calculations for credit cards
router.get('/:id/payment-calculation', getCreditPaymentCalculation);

export default router;