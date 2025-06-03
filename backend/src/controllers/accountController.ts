// Enhanced Account Controller with better abstraction
import { Request, Response } from 'express';
import Account, { IAccount, AccountType } from '../models/Account';
import { getUserId, getUserObjectId } from '../middleware/auth';
import mongoose from 'mongoose';

// Account type configuration (like a lookup table in C++)
interface AccountTypeConfig {
  requiresCreditFields: boolean;
  defaultCurrency: string;
  allowNegativeBalance: boolean;
}

const ACCOUNT_TYPE_CONFIG: Record<string, AccountTypeConfig> = {
  [AccountType.CHECKING]: { 
    requiresCreditFields: false, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: false 
  },
  [AccountType.SAVINGS]: { 
    requiresCreditFields: false, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: false 
  },
  [AccountType.CASH]: { 
    requiresCreditFields: false, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: false 
  },
  [AccountType.INVESTMENT]: { 
    requiresCreditFields: false, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: true 
  },
  [AccountType.CREDIT_CARD]: { 
    requiresCreditFields: true, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: true 
  },
  [AccountType.AUTO_LOAN]: { 
    requiresCreditFields: true, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: true 
  },
  [AccountType.PERSONAL_LOAN]: { 
    requiresCreditFields: true, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: true 
  },
  [AccountType.MORTGAGE]: { 
    requiresCreditFields: true, 
    defaultCurrency: 'MXN', 
    allowNegativeBalance: true 
  }
};

// Helper function to validate credit fields (like a validator function in C++)
function validateCreditFields(type: AccountType, creditFields: any): string | null {
  const config = ACCOUNT_TYPE_CONFIG[type];
  
  if (!config?.requiresCreditFields) {
    return null; // No validation needed
  }

  if (!creditFields) {
    return 'Credit fields are required for this account type';
  }

  // Credit limit validation
  if (type === AccountType.CREDIT_CARD) {
    if (!creditFields.creditLimit || creditFields.creditLimit <= 0) {
      return 'Credit limit must be greater than 0 for credit cards';
    }
    
    if (creditFields.cutoffDay && (creditFields.cutoffDay < 1 || creditFields.cutoffDay > 31)) {
      return 'Cutoff day must be between 1 and 31';
    }
    
    if (creditFields.paymentDueDay && (creditFields.paymentDueDay < 1 || creditFields.paymentDueDay > 31)) {
      return 'Payment due day must be between 1 and 31';
    }
  }

  // Interest rate validation
  if (creditFields.interestRate && (creditFields.interestRate < 0 || creditFields.interestRate > 100)) {
    return 'Interest rate must be between 0 and 100';
  }

  return null; // Valid
}

// Helper function to process credit fields (like a factory function in C++)
function processCreditFields(type: AccountType, creditFields: any, initialBalance: number): any {
  const config = ACCOUNT_TYPE_CONFIG[type];
  
  if (!config?.requiresCreditFields || !creditFields) {
    return undefined;
  }

  const processed: any = {
    ...creditFields,
    openingDate: creditFields.openingDate || new Date()
  };

  // Auto-calculate fields based on account type
  if (type === AccountType.CREDIT_CARD) {
    // Calculate available credit for credit cards
    processed.availableCredit = (creditFields.creditLimit || 0) + initialBalance;
    
    // Auto-calculate dates if cutoff and payment days are provided
    if (creditFields.cutoffDay && creditFields.paymentDueDay) {
      const today = new Date();
      processed.nextCutoffDate = calculateNextCutoffDate(today, creditFields.cutoffDay);
      processed.nextPaymentDate = calculateNextPaymentDate(processed.nextCutoffDate, creditFields.paymentDueDay);
    }
  }

  // Set default minimum payment if not provided
  if (!processed.minimumPayment) {
    if (type === AccountType.CREDIT_CARD) {
      // Default to 2% of credit limit or $200 MXN, whichever is higher
      processed.minimumPayment = Math.max((creditFields.creditLimit || 0) * 0.02, 200);
    }
  }

  return processed;
}

// Helper function to calculate next cutoff date
function calculateNextCutoffDate(fromDate: Date, cutoffDay: number): Date {
  const nextCutoff = new Date(fromDate);
  nextCutoff.setDate(cutoffDay);
  
  // If the cutoff day has already passed this month, move to next month
  if (nextCutoff <= fromDate) {
    nextCutoff.setMonth(nextCutoff.getMonth() + 1);
  }
  
  return nextCutoff;
}

// Helper function to calculate next payment date
function calculateNextPaymentDate(cutoffDate: Date, paymentDueDay: number): Date {
  const paymentDate = new Date(cutoffDate);
  
  // Payment is typically 20 days after cutoff, but respect the due day
  if (paymentDueDay >= cutoffDate.getDate()) {
    // Same month
    paymentDate.setDate(paymentDueDay);
  } else {
    // Next month
    paymentDate.setMonth(paymentDate.getMonth() + 1);
    paymentDate.setDate(paymentDueDay);
  }
  
  return paymentDate;
}

// Main controller functions
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

export const createAccount = async (req: Request, res: Response) => {
  try {
    console.log('🔍 createAccount controller executing...');
    console.log('🔍 req.user exists:', !!req.user);
    console.log('🔍 req.body:', req.body);
    
    const userId = getUserObjectId(req);
    const {
      name,
      type,
      initialBalance = 0,
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

    // Get account type configuration
    const typeConfig = ACCOUNT_TYPE_CONFIG[type];
    if (!typeConfig) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported account type'
      });
    }

    // Validate negative balance for non-credit accounts
    if (!typeConfig.allowNegativeBalance && initialBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'This account type does not allow negative balances'
      });
    }

    // Validate credit fields if required
    const creditFieldsError = validateCreditFields(type, creditFields);
    if (creditFieldsError) {
      return res.status(400).json({
        success: false,
        message: creditFieldsError
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

    // Build account data (like building an object in C++)
    const accountData: Partial<IAccount> = {
      userId,
      name,
      type,
      initialBalance: Number(initialBalance),
      currency: currency || typeConfig.defaultCurrency,
      description
    };

    // Process and add credit fields if needed
    const processedCreditFields = processCreditFields(type, creditFields, Number(initialBalance));
    if (processedCreditFields) {
      accountData.creditFields = processedCreditFields;
    }

    console.log('🔍 Final account data:', accountData);

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

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If updating credit fields, validate them
    if (updates.creditFields) {
      const account = await Account.findOne({ _id: id, userId });
      if (account) {
        const creditFieldsError = validateCreditFields(account.type, updates.creditFields);
        if (creditFieldsError) {
          return res.status(400).json({
            success: false,
            message: creditFieldsError
          });
        }
        
        // Re-process credit fields
        updates.creditFields = processCreditFields(
          account.type, 
          updates.creditFields, 
          updates.initialBalance || account.currentBalance
        );
      }
    }

    const account = await Account.findOneAndUpdate(
      { _id: id, userId },
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

// Keep existing functions: updateAccountBalance, deleteAccount, getCreditStatus
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

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const account = await Account.findOneAndUpdate(
      { _id: id, userId },
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

// New function: Get payment calculation for credit cards
export const getCreditPaymentCalculation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { targetPayoffMonths } = req.query;
    
    const account = await Account.findOne({ _id: id, userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (account.type !== AccountType.CREDIT_CARD) {
      return res.status(400).json({
        success: false,
        message: 'Payment calculation is only available for credit cards'
      });
    }

    const creditFields = account.creditFields;
    if (!creditFields) {
      return res.status(400).json({
        success: false,
        message: 'Credit card information is incomplete'
      });
    }

    const currentDebt = Math.abs(Math.min(0, account.currentBalance));
    const monthlyInterestRate = (creditFields.interestRate || 0) / 100 / 12;
    
    // Calculate different payment scenarios
    const paymentScenarios = {
      minimumPayment: {
        amount: creditFields.minimumPayment || 0,
        monthsToPayoff: 0,
        totalInterest: 0
      },
      noInterestPayment: {
        amount: 0,
        monthsToPayoff: 0,
        totalInterest: 0
      },
      customPayoff: {
        amount: 0,
        monthsToPayoff: parseInt(targetPayoffMonths as string) || 12,
        totalInterest: 0
      }
    };

    if (currentDebt > 0 && monthlyInterestRate > 0) {
      // Calculate months to payoff with minimum payment
      if (paymentScenarios.minimumPayment.amount > monthlyInterestRate * currentDebt) {
        paymentScenarios.minimumPayment.monthsToPayoff = Math.ceil(
          -Math.log(1 - (currentDebt * monthlyInterestRate) / paymentScenarios.minimumPayment.amount) / 
          Math.log(1 + monthlyInterestRate)
        );
        paymentScenarios.minimumPayment.totalInterest = 
          (paymentScenarios.minimumPayment.amount * paymentScenarios.minimumPayment.monthsToPayoff) - currentDebt;
      } else {
        paymentScenarios.minimumPayment.monthsToPayoff = Infinity;
        paymentScenarios.minimumPayment.totalInterest = Infinity;
      }

      // Calculate payment to avoid interest (pay off before next due date)
      const daysUntilDue = account.daysUntilPayment || 30;
      paymentScenarios.noInterestPayment.amount = currentDebt;
      paymentScenarios.noInterestPayment.monthsToPayoff = daysUntilDue <= 30 ? 1 : Math.ceil(daysUntilDue / 30);
      paymentScenarios.noInterestPayment.totalInterest = 0;

      // Calculate payment for custom payoff period
      const customMonths = paymentScenarios.customPayoff.monthsToPayoff;
      if (monthlyInterestRate > 0) {
        paymentScenarios.customPayoff.amount = 
          (currentDebt * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, customMonths)) /
          (Math.pow(1 + monthlyInterestRate, customMonths) - 1);
      } else {
        paymentScenarios.customPayoff.amount = currentDebt / customMonths;
      }
      paymentScenarios.customPayoff.totalInterest = 
        (paymentScenarios.customPayoff.amount * customMonths) - currentDebt;
    }

    res.status(200).json({
      success: true,
      data: {
        accountInfo: {
          name: account.name,
          currentBalance: account.currentBalance,
          currentDebt,
          creditLimit: creditFields.creditLimit,
          availableCredit: creditFields.availableCredit,
          interestRate: creditFields.interestRate,
          daysUntilPayment: account.daysUntilPayment
        },
        paymentScenarios
      }
    });
  } catch (error) {
    console.error('Error calculating credit payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating credit payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};