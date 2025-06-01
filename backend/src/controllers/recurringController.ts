import { Request, Response } from 'express';
import Transaction, { ITransaction, TransactionType, PaymentMethod } from '../models/Transaction';
import Account from '../models/Account';
import Category from '../models/Category';
import { getUserId, getUserObjectId } from '../middleware/auth';
import mongoose from 'mongoose';

// POST /api/recurring/setup - Set up a new recurring transaction
export const setupRecurringTransaction = async (req: Request, res: Response) => {
  try {
    const userId = getUserObjectId(req);
    const {
      description,
      amount,
      type,
      paymentMethod,
      accountId,
      categoryId,
      frequency, // 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
      interval = 1, // Every X periods
      startDate,
      endDate,
      dayOfMonth, // For monthly: which day (1-31)
      dayOfWeek, // For weekly: which day (0=Sunday, 6=Saturday)
      merchant,
      location,
      notes,
      tags
    } = req.body;

    // Validation
    if (!description || !amount || !type || !paymentMethod || !accountId || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Description, amount, type, paymentMethod, accountId, and frequency are required'
      });
    }

    // Validate account belongs to user
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Validate category if provided
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, userId });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
    }

    // Calculate next occurrence date
    const start = startDate ? new Date(startDate) : new Date();
    const nextDate = calculateNextOccurrence(start, frequency, interval, dayOfMonth, dayOfWeek);

    // Create recurring transaction template
    const recurringData: Partial<ITransaction> = {
      userId,
      description,
      amount: Number(amount),
      type,
      paymentMethod,
      accountId: new mongoose.Types.ObjectId(accountId),
      categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
      transactionDate: start,
      isRecurring: true,
      recurringConfig: {
        frequency,
        interval,
        endDate: endDate ? new Date(endDate) : undefined,
        nextDate
      },
      merchant,
      location,
      notes,
      tags
    };

    const transaction = new Transaction(recurringData);
    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Recurring transaction set up successfully',
      data: {
        ...transaction.toObject(),
        nextOccurrence: nextDate
      }
    });
  } catch (error) {
    console.error('Error setting up recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up recurring transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/recurring/due - Get recurring transactions due for processing
export const getDueRecurringTransactions = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { date } = req.query;
    
    const checkDate = date ? new Date(date as string) : new Date();
    
    const dueTransactions = await Transaction.find({
      userId,
      isRecurring: true,
      isActive: true,
      'recurringConfig.nextDate': { $lte: checkDate }
    }).populate('accountId', 'name type')
      .populate('categoryId', 'name color');

    res.status(200).json({
      success: true,
      count: dueTransactions.length,
      checkDate,
      data: dueTransactions
    });
  } catch (error) {
    console.error('Error fetching due recurring transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching due recurring transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/recurring/process - Process due recurring transactions
export const processDueRecurringTransactions = async (req: Request, res: Response) => {
  try {
    const userId = getUserObjectId(req);
    const { date, transactionIds } = req.body;
    
    const processDate = date ? new Date(date) : new Date();
    
    // Get transactions to process
    let filter: any = {
      userId,
      isRecurring: true,
      isActive: true,
      'recurringConfig.nextDate': { $lte: processDate }
    };

    // If specific transaction IDs provided, filter by those
    if (transactionIds && Array.isArray(transactionIds)) {
      filter._id = { $in: transactionIds };
    }

    const recurringTransactions = await Transaction.find(filter);
    
    const results = {
      processed: 0,
      errors: [] as any[]
    };

    for (const recurring of recurringTransactions) {
      try {
        // Create new transaction instance
        const newTransaction = new Transaction({
          userId,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          paymentMethod: recurring.paymentMethod,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          transactionDate: processDate,
          merchant: recurring.merchant,
          location: recurring.location,
          notes: `${recurring.notes || ''} (Auto-generated from recurring)`.trim(),
          tags: recurring.tags,
          isRecurring: false // The generated transaction is not recurring itself
        });

        await newTransaction.save();
        await newTransaction.applyToAccount();

        // Update next occurrence date
        const nextDate = calculateNextOccurrence(
          processDate,
          recurring.recurringConfig?.frequency!,
          recurring.recurringConfig?.interval || 1
        );

        recurring.recurringConfig!.nextDate = nextDate;
        
        // Check if recurring should end
        if (recurring.recurringConfig?.endDate && nextDate > recurring.recurringConfig.endDate) {
          recurring.isActive = false;
        }

        await recurring.save();
        results.processed++;

      } catch (error) {
        results.errors.push({
          recurringId: recurring._id,
          description: recurring.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.processed} recurring transactions`,
      processDate,
      results
    });
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing recurring transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/recurring/forecast - Get forecast of upcoming recurring transactions
export const getRecurringForecast = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { months = 3 } = req.query;
    
    const forecastMonths = Math.min(Number(months), 12); // Max 12 months
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + forecastMonths);

    const recurringTransactions = await Transaction.find({
      userId,
      isRecurring: true,
      isActive: true
    }).populate('accountId', 'name type')
      .populate('categoryId', 'name color');

    const forecast = [];
    
    for (const recurring of recurringTransactions) {
      let currentDate = new Date(recurring.recurringConfig?.nextDate || new Date());
      
      while (currentDate <= endDate) {
        // Check if recurring should end
        if (recurring.recurringConfig?.endDate && currentDate > recurring.recurringConfig.endDate) {
          break;
        }

        forecast.push({
          recurringTransactionId: recurring._id,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          expectedDate: new Date(currentDate),
          frequency: recurring.recurringConfig?.frequency,
          merchant: recurring.merchant
        });

        // Calculate next occurrence
        currentDate = calculateNextOccurrence(
          currentDate,
          recurring.recurringConfig?.frequency!,
          recurring.recurringConfig?.interval || 1
        );
      }
    }

    // Sort by date
    forecast.sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime());

    // Calculate monthly summaries
    const monthlySummary: { [key: string]: { income: number; expenses: number; count: number } } = {};
    forecast.forEach(item => {
      const monthKey = `${item.expectedDate.getFullYear()}-${item.expectedDate.getMonth() + 1}`;
      if (!monthlySummary[monthKey]) {
        monthlySummary[monthKey] = { income: 0, expenses: 0, count: 0 };
      }
      
      if (item.amount > 0) {
        monthlySummary[monthKey].income += item.amount;
      } else {
        monthlySummary[monthKey].expenses += Math.abs(item.amount);
      }
      monthlySummary[monthKey].count++;
    });

    res.status(200).json({
      success: true,
      forecastPeriod: {
        startDate,
        endDate,
        months: forecastMonths
      },
      totalItems: forecast.length,
      monthlySummary,
      forecast
    });
  } catch (error) {
    console.error('Error generating recurring forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recurring forecast',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/recurring/:id - Update recurring transaction
export const updateRecurringTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If frequency is being updated, recalculate next date
    if (updates.recurringConfig?.frequency) {
      const nextDate = calculateNextOccurrence(
        new Date(),
        updates.recurringConfig.frequency,
        updates.recurringConfig.interval || 1
      );
      updates.recurringConfig.nextDate = nextDate;
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId, isRecurring: true },
      updates,
      { new: true, runValidators: true }
    ).populate('accountId', 'name type')
     .populate('categoryId', 'name color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recurring transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating recurring transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/recurring/:id - Cancel recurring transaction
export const cancelRecurringTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId, isRecurring: true },
      { isActive: false },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Recurring transaction cancelled successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error cancelling recurring transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling recurring transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to calculate next occurrence
function calculateNextOccurrence(
  fromDate: Date,
  frequency: string,
  interval: number = 1,
  dayOfMonth?: number,
  dayOfWeek?: number
): Date {
  const nextDate = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      if (dayOfWeek !== undefined) {
        // Adjust to specific day of week
        const currentDay = nextDate.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        if (daysToAdd === 0 && nextDate <= fromDate) {
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        }
      }
      break;

    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + (14 * interval));
      break;

    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      if (dayOfMonth) {
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      }
      break;

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return nextDate;
}