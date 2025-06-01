import { Request, Response } from 'express';
import Account, { IAccount, AccountType } from '../models/Account';
import { getUserId, getUserObjectId } from '../middleware/auth';
import mongoose from 'mongoose';

// GET /api/accounts - Get all accounts for current user
export const getAllAccounts = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accounts = await Account.find({ userId, isActive: true }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accounts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/accounts/:id - Get account by ID (only if belongs to user)
export const getAccountById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/accounts - Create new account for current user
export const createAccount = async (req: Request, res: Response) => {
  try {
    console.log('🔍 createAccount controller executing...');
    console.log('🔍 req.user exists:', !!req.user);
    console.log('🔍 req.user details:', req.user ? { id: req.user._id, email: req.user.email } : 'undefined');
    
    const userId = getUserObjectId(req);  // ← Use ObjectId version
    const {
      name,
      type,
      initialBalance,
      currency = 'MXN',
      description,
      creditFields
    } = req.body;

    // Basic validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    // Validate account type
    if (!Object.values(AccountType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account type'
      });
    }

    // Check if user already has an account with this name
    const existingAccount = await Account.findOne({ userId, name });
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'You already have an account with this name'
      });
    }

    // Create account data
    const accountData: Partial<IAccount> = {
      userId,  // ← Now this is ObjectId, not string
      name,
      type,
      initialBalance: initialBalance || 0,
      currency,
      description
    };

    // Add credit fields for credit products
    const creditTypes = [AccountType.CREDIT_CARD, AccountType.AUTO_LOAN, AccountType.PERSONAL_LOAN, AccountType.MORTGAGE];
    if (creditTypes.includes(type) && creditFields) {
      accountData.creditFields = creditFields;
    }

    const account = new Account(accountData);
    await account.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/accounts/:id - Update account (only if belongs to user)
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.userId;  // ← Prevent changing ownership
    delete updates.createdAt;
    delete updates.updatedAt;

    const account = await Account.findOneAndUpdate(
      { _id: id, userId },  // ← Only update if belongs to user
      updates,
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/accounts/:id/balance - Update account balance (only if belongs to user)
export const updateAccountBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { amount, operation = 'set' } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a number'
      });
    }

    const account = await Account.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Update balance based on operation
    if (operation === 'add') {
      await account.updateBalance(amount);
    } else if (operation === 'set') {
      await account.setBalance(amount);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use "add" or "set"'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Balance updated successfully',
      data: account
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating balance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/accounts/:id - Soft delete account (only if belongs to user)
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const account = await Account.findOneAndUpdate(
      { _id: id, userId },  // ← Only delete if belongs to user
      { isActive: false },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      data: account
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/accounts/:id/credit-status - Get credit status (only if belongs to user)
export const getCreditStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const account = await Account.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const creditStatus = account.getCreditStatus();
    if (!creditStatus) {
      return res.status(400).json({
        success: false,
        message: 'This account is not a credit product'
      });
    }

    res.status(200).json({
      success: true,
      data: creditStatus
    });
  } catch (error) {
    console.error('Error fetching credit status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credit status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};