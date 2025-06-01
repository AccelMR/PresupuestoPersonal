import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getExpenseCategories,
  getIncomeCategories,
  createDefaultCategories,
  getCategoryBudgetStatus,
  getCategoryMonthlyAverage,
  getSpendingAnalytics
} from '../controllers/categoryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to ALL routes
router.use(requireAuth);

// Specialized endpoints (FIRST - before generic routes)

// POST /api/categories/defaults - Create default categories
router.post('/defaults', createDefaultCategories);

// GET /api/categories/expense - Get expense categories only
router.get('/expense', getExpenseCategories);

// GET /api/categories/income - Get income categories only
router.get('/income', getIncomeCategories);

// GET /api/categories/analytics/spending - Get spending analytics
router.get('/analytics/spending', getSpendingAnalytics);

// GET /api/categories/:id/budget-status - Get budget status for category
router.get('/:id/budget-status', getCategoryBudgetStatus);

// GET /api/categories/:id/monthly-average - Get monthly average for category
router.get('/:id/monthly-average', getCategoryMonthlyAverage);

// Basic CRUD operations (AFTER specialized routes)

// GET /api/categories - Get all categories
router.get('/', getAllCategories);

// POST /api/categories - Create new category
router.post('/', createCategory);

// GET /api/categories/:id - Get specific category (LAST for GET)
router.get('/:id', getCategoryById);

// PUT /api/categories/:id - Update category
router.put('/:id', updateCategory);

// DELETE /api/categories/:id - Delete category
router.delete('/:id', deleteCategory);

export default router;