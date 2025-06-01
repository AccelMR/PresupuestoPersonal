import { Request, Response } from 'express';
import Transaction, { ITransaction, TransactionType, PaymentMethod, TransactionStatus } from '../models/Transaction';
import Account from '../models/Account';
import mongoose from 'mongoose';

// GET /api/transactions - Get all transactions with filters
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const {
      accountId,
      startDate,
      endDate,
      type,
      categoryId,
      limit = 50,
      page = 1
    } = req.query;

    // Build filter object
    const filter: any = { isActive: true };
    
    if (accountId) filter.accountId = accountId;
    if (type) filter.type = type;
    if (categoryId) filter.categoryId = categoryId;
    
    // Date range filter
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate as string);
      if (endDate) filter.transactionDate.$lte = new Date(endDate as string);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name type')
      .populate('categoryId', 'name color')
      .sort({ transactionDate: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/transactions/:id - Get transaction by ID
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id)
      .populate('accountId', 'name type')
      .populate('transferToAccountId', 'name type')
      .populate('categoryId', 'name color');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/transactions - Create new transaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      description,
      amount,
      type,
      paymentMethod,
      accountId,
      transferToAccountId,
      transactionDate,
      categoryId,
      tags,
      isRecurring,
      recurringConfig,
      creditCardInfo,
      merchant,
      location,
      notes
    } = req.body;

    // Basic validation
    if (!description || !amount || !type || !paymentMethod || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'Description, amount, type, paymentMethod, and accountId are required'
      });
    }

    // Validate account exists
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Validate transfer account if provided
    if (type === TransactionType.TRANSFER) {
      if (!transferToAccountId) {
        return res.status(400).json({
          success: false,
          message: 'Transfer transactions require transferToAccountId'
        });
      }
      
      const transferAccount = await Account.findById(transferToAccountId);
      if (!transferAccount) {
        return res.status(404).json({
          success: false,
          message: 'Transfer target account not found'
        });
      }
    }

    // Validate transaction type vs amount sign
    if (type === TransactionType.EXPENSE && amount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense transactions should have negative amounts'
      });
    }
    
    if (type === TransactionType.INCOME && amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Income transactions should have positive amounts'
      });
    }

    // Create transaction data
    const transactionData: Partial<ITransaction> = {
      description,
      amount: Number(amount),
      type,
      paymentMethod,
      accountId: new mongoose.Types.ObjectId(accountId),
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
      tags,
      isRecurring: isRecurring || false,
      recurringConfig,
      creditCardInfo,
      merchant,
      location,
      notes
    };

    if (transferToAccountId) {
      transactionData.transferToAccountId = new mongoose.Types.ObjectId(transferToAccountId);
    }

    // Create and save transaction
    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Apply transaction to account(s)
    await transaction.applyToAccount();

    // Populate the response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('accountId', 'name type')
      .populate('transferToAccountId', 'name type')
      .populate('categoryId', 'name color');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: populatedTransaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/transactions/:id - Update transaction
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.accountId; // Prevent changing account after creation

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('accountId', 'name type')
     .populate('categoryId', 'name color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/transactions/:id - Soft delete transaction
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Reverse the transaction effect on account
    await transaction.reverseTransaction();

    res.status(200).json({
      success: true,
      message: 'Transaction deleted and reversed successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/transactions/account/:accountId - Get transactions for specific account
export const getTransactionsByAccount = async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Validate account exists
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const transactions = await Transaction.find({ accountId, isActive: true })
      .sort({ transactionDate: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Transaction.countDocuments({ accountId, isActive: true });

    res.status(200).json({
      success: true,
      account: {
        id: account._id,
        name: account.name,
        type: account.type,
        currentBalance: account.currentBalance
      },
      count: transactions.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/transactions/monthly/:year/:month - Get monthly transactions
export const getMonthlyTransactions = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (yearNum < 2000 || yearNum > 3000 || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }

    const transactions = await Transaction.getMonthlyExpenses(yearNum, monthNum);
    
    // Calculate summary
    const summary = {
      totalExpenses: 0,
      totalIncome: 0,
      transactionCount: transactions.length
    };
    
    transactions.forEach(t => {
      if (t.amount < 0) {
        summary.totalExpenses += Math.abs(t.amount);
      } else {
        summary.totalIncome += t.amount;
      }
    });

    res.status(200).json({
      success: true,
      period: `${year}-${month.toString().padStart(2, '0')}`,
      summary,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching monthly transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/transactions/recurring - Get recurring transactions
export const getRecurringTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.getRecurring();
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/transactions/bulk - Create multiple transactions (useful for imports)
export const createBulkTransactions = async (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transactions array is required'
      });
    }
    
    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 transactions per bulk operation'
      });
    }

    const results = {
      created: 0,
      errors: [] as any[]
    };

    for (const [index, transactionData] of transactions.entries()) {
      try {
        const transaction = new Transaction(transactionData);
        await transaction.save();
        await transaction.applyToAccount();
        results.created++;
      } catch (error) {
        results.errors.push({
          index,
          transaction: transactionData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk operation completed: ${results.created} created, ${results.errors.length} errors`,
      results
    });
  } catch (error) {
    console.error('Error in bulk transaction creation:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk transaction creation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/transactions/summary - Get transaction summary/statistics
export const getTransactionSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    
    const match: any = { isActive: true };
    
    if (accountId) match.accountId = new mongoose.Types.ObjectId(accountId as string);
    
    if (startDate || endDate) {
      match.transactionDate = {};
      if (startDate) match.transactionDate.$gte = new Date(startDate as string);
      if (endDate) match.transactionDate.$lte = new Date(endDate as string);
    }

    const summary = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $gt: ['$amount', 0] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0]
            }
          },
          transactionCount: { $sum: 1 },
          avgTransaction: { $avg: '$amount' }
        }
      }
    ]);

    const result = summary[0] || {
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: 0,
      avgTransaction: 0
    };

    result.netAmount = result.totalIncome - result.totalExpenses;

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};