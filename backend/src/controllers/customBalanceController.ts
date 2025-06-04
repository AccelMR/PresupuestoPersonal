// backend/src/controllers/customBalanceController.ts - IMPROVED VERSION
import { Request, Response } from 'express';
import { CustomBalance } from '../models/CustomBalance';
import Account from '../models/Account';
import { getUserId, getUserObjectId } from '../middleware/auth';
import mongoose from 'mongoose';

// GET /api/custom-balances - Get all custom balances for user
export const getAllCustomBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserObjectId(req);
    const customBalances = await CustomBalance.getCustomBalancesByUser(userId);
    
    // Calculate totals for each custom balance
    const balancesWithTotals = await Promise.all(
      customBalances.map(async (cb) => {
        const totalBalance = await cb.calculateTotalBalance();
        const balanceByType = await cb.calculateBalanceByType();
        
        return {
          id: cb._id,
          name: cb.name,
          description: cb.description,
          accountCount: cb.accountIds.length,
          totalBalance,
          balanceByType,
          accounts: cb.accountIds, // Already populated
          //createdAt: cb.createdAt,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: balancesWithTotals.length,
      data: balancesWithTotals
    });
  } catch (error) {
    console.error('Error fetching custom balances:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching custom balances',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/custom-balances/:id - Get specific custom balance
export const getCustomBalanceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserObjectId(req);

    const customBalance = await CustomBalance.findOne({ _id: id, userId })
      .populate({
        path: 'accountIds',
        select: 'name type currentBalance currency isActive',
        match: { isActive: true }
      });

    if (!customBalance) {
      res.status(404).json({ 
        success: false,
        message: 'Custom balance not found' 
      });
      return;
    }

    const totalBalance = await customBalance.calculateTotalBalance();
    const balanceByType = await customBalance.calculateBalanceByType();
    const accountDetails = await customBalance.getAccountDetails();

    res.status(200).json({
      success: true,
      data: {
        id: customBalance._id,
        name: customBalance.name,
        description: customBalance.description,
        totalBalance,
        balanceByType,
        accountCount: customBalance.accountIds.length,
        accounts: accountDetails,
        //createdAt: customBalance.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching custom balance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching custom balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/custom-balances - Create new custom balance
export const createCustomBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserObjectId(req);
    const { name, description, accountIds } = req.body;

    // Validation
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one account ID is required'
      });
      return;
    }

    // Validate ObjectIds
    const invalidIds = accountIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid account ID format',
        invalidIds
      });
      return;
    }

    // Convert to ObjectIds
    const objectIds = accountIds.map(id => new mongoose.Types.ObjectId(id));

    const customBalance = await CustomBalance.createCustomBalance(
      userId,
      name.trim(),
      objectIds,
      description?.trim()
    );

    // Get the created balance with populated accounts
    const populatedBalance = await CustomBalance.findById(customBalance._id)
      .populate({
        path: 'accountIds',
        select: 'name type currentBalance currency'
      });

    const totalBalance = await customBalance.calculateTotalBalance();

    res.status(201).json({
      success: true,
      message: 'Custom balance created successfully',
      data: {
        id: populatedBalance!._id,
        name: populatedBalance!.name,
        description: populatedBalance!.description,
        totalBalance,
        accountCount: populatedBalance!.accountIds.length,
        accounts: populatedBalance!.accountIds
      }
    });
  } catch (error) {
    console.error('Error creating custom balance:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        res.status(400).json({
          success: false,
          message: 'You already have a custom balance with this name'
        });
        return;
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating custom balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/custom-balances/:id - Update custom balance
export const updateCustomBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If updating accountIds, validate them
    if (updates.accountIds) {
      if (!Array.isArray(updates.accountIds) || updates.accountIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one account ID is required'
        });
        return;
      }

      const invalidIds = updates.accountIds.filter((id: any) => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid account ID format',
          invalidIds
        });
        return;
      }

      updates.accountIds = updates.accountIds.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    const customBalance = await CustomBalance.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'accountIds',
      select: 'name type currentBalance currency'
    });

    if (!customBalance) {
      res.status(404).json({
        success: false,
        message: 'Custom balance not found'
      });
      return;
    }

    const totalBalance = await customBalance.calculateTotalBalance();

    res.status(200).json({
      success: true,
      message: 'Custom balance updated successfully',
      data: {
        id: customBalance._id,
        name: customBalance.name,
        description: customBalance.description,
        totalBalance,
        accountCount: customBalance.accountIds.length,
        accounts: customBalance.accountIds
      }
    });
  } catch (error) {
    console.error('Error updating custom balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating custom balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/custom-balances/:id - Delete custom balance
export const deleteCustomBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const customBalance = await CustomBalance.findOneAndDelete({ _id: id, userId });

    if (!customBalance) {
      res.status(404).json({
        success: false,
        message: 'Custom balance not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Custom balance deleted successfully',
      data: {
        id: customBalance._id,
        name: customBalance.name
      }
    });
  } catch (error) {
    console.error('Error deleting custom balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting custom balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/custom-balances/:id/summary - Get detailed summary
export const getCustomBalanceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserObjectId(req);

    const customBalance = await CustomBalance.findOne({ _id: id, userId });
    
    if (!customBalance) {
      res.status(404).json({
        success: false,
        message: 'Custom balance not found'
      });
      return;
    }

    const [totalBalance, balanceByType, accountDetails] = await Promise.all([
      customBalance.calculateTotalBalance(),
      customBalance.calculateBalanceByType(),
      customBalance.getAccountDetails()
    ]);

    // Calculate additional statistics
    const positiveBalance = Object.values(balanceByType)
      .filter(balance => balance > 0)
      .reduce((sum, balance) => sum + balance, 0);
    
    const negativeBalance = Object.values(balanceByType)
      .filter(balance => balance < 0)
      .reduce((sum, balance) => sum + balance, 0);

    res.status(200).json({
      success: true,
      data: {
        customBalance: {
          id: customBalance._id,
          name: customBalance.name,
          description: customBalance.description
        },
        summary: {
          totalBalance,
          positiveBalance,
          negativeBalance: Math.abs(negativeBalance),
          netWorth: positiveBalance + negativeBalance,
          accountCount: accountDetails.length
        },
        balanceByType,
        accounts: accountDetails
      }
    });
  } catch (error) {
    console.error('Error fetching custom balance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching custom balance summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};