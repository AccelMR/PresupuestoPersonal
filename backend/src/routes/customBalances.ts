// backend/src/routes/customBalances.ts - IMPROVED VERSION
import { Router } from "express";
import {
  getAllCustomBalances,
  getCustomBalanceById,
  createCustomBalance,
  updateCustomBalance,
  deleteCustomBalance,
  getCustomBalanceSummary
} from "../controllers/customBalanceController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/custom-balances - Get all custom balances for user
router.get("/", getAllCustomBalances);

// POST /api/custom-balances - Create new custom balance
router.post("/", createCustomBalance);

// GET /api/custom-balances/:id/summary - Get detailed summary (BEFORE /:id route)
router.get("/:id/summary", getCustomBalanceSummary);

// GET /api/custom-balances/:id - Get specific custom balance
router.get("/:id", getCustomBalanceById);

// PUT /api/custom-balances/:id - Update custom balance
router.put("/:id", updateCustomBalance);

// DELETE /api/custom-balances/:id - Delete custom balance
router.delete("/:id", deleteCustomBalance);

export default router;