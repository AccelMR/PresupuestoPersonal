import { Router } from "express";

import { getCustomBalance, getBalance } from "../controllers/customBalanceController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Middleware to require authentication for all routes
router.use(requireAuth);

// GET /api/custom-balances - Get custom balance for the authenticated user
router.get("/", getCustomBalance);

// GET /api/custom-balances/:id - Get specific custom balance by ID
router.get("/:id", getBalance);

export default router;
