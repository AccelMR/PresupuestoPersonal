import mongoose, { Document, Schema, Model } from 'mongoose';
import { IAccount } from './Account';
import { IUser } from './User';


// Transaction types
export enum TransactionType {
  INCOME = 'income',           // Ingreso
  EXPENSE = 'expense',         // Gasto
  TRANSFER = 'transfer',       // Transferencia entre cuentas
  PAYMENT = 'payment',         // Pago de tarjeta de crédito
  ADJUSTMENT = 'adjustment'    // Ajuste manual
}

// Payment methods for Mexican context
export enum PaymentMethod {
  CASH = 'cash',                    // Efectivo
  DEBIT_CARD = 'debit_card',       // Tarjeta de débito
  CREDIT_CARD = 'credit_card',     // Tarjeta de crédito
  BANK_TRANSFER = 'bank_transfer', // Transferencia bancaria
  OTHER = 'other'                  // Otro
}

// Transaction status for credit cards (important for Mexican finance)
export enum TransactionStatus {
  PENDING = 'pending',         // Pendiente (no ha pasado fecha de corte)
  POSTED = 'posted',           // Aplicado (ya pasó fecha de corte)
  PAID = 'paid',              // Pagado
  CANCELLED = 'cancelled'      // Cancelado
}

// Transaction interface
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId | IUser;

  // Basic info
  description: string;
  amount: number;              // Positive for income, negative for expenses
  type: TransactionType;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  
  // Account relationship
  accountId: mongoose.Types.ObjectId | IAccount;  // Main account
  transferToAccountId?: mongoose.Types.ObjectId | IAccount;  // For transfers

  dueDate?: Date;
  recurringTransactionId?: mongoose.Types.ObjectId;
  paymentOptions?: {
    creditCardId?: mongoose.Types.ObjectId; // For credit card payments
    paymentType?: 'minimum' | 'no_interest' | 'custom'; // Payment strategy
    originalMinimumAmount?: number; // Calculated minimum
    noInterestAmount?: number; // Amount to avoid interest
    customAmount?: number; // User-defined amount
  };
  
  // Date info
  transactionDate: Date;       // When it actually happened
  effectiveDate?: Date;        // When it affects the account (for pending credit card transactions)
  
  // Categories and tags
  categoryId?: mongoose.Types.ObjectId;  // Reference to Category
  subcategoryId?: mongoose.Types.ObjectId;
  tags?: string[];             // ["comida", "restaurante", "trabajo"]
  
  // Mexican financial context
  isRecurring: boolean;        // Is this a recurring transaction?
  recurringConfig?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannually' | 'annually';
    interval: number;          // Every X periods (e.g., every 2 weeks)
    endDate?: Date;           // When recurring ends
    nextDate?: Date;          // Next occurrence
  };
  
  // Credit card specific (important for Mexican cards)
  creditCardInfo?: {
    installments?: number;     // Meses sin intereses
    currentInstallment?: number;
    interestRate?: number;     // If not MSI
    cutoffPeriod?: string;     // Which billing period (e.g., "2025-01")
  };
  
  // Location and context
  merchant?: string;           // "OXXO", "Liverpool", etc.
  location?: string;          // "Guadalajara, JAL"
  notes?: string;
  
  // Financial tracking
  exchangeRate?: number;       // If foreign currency
  originalCurrency?: string;   // If not MXN
  originalAmount?: number;
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  applyToAccount(): Promise<void>;
  reverseTransaction(): Promise<ITransaction>;
  updateAccountBalance(): Promise<void>;
}

// Static methods interface
export interface ITransactionModel extends Model<ITransaction> {
  getByAccount(accountId: string): Promise<ITransaction[]>;
  getByDateRange(startDate: Date, endDate: Date): Promise<ITransaction[]>;
  getRecurring(): Promise<ITransaction[]>;
  getTotalByCategory(categoryId: string, startDate?: Date, endDate?: Date): Promise<number>;
  getMonthlyExpenses(year: number, month: number): Promise<ITransaction[]>;
}

// MongoDB schema
const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: function(v: number) {
          return v !== 0;
        },
        message: 'Amount cannot be zero'
      }
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required']
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.POSTED
    },
    
    // Account relationships
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account is required']
    },
    transferToAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account'
    },
    
    // Dates
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now
    },
    effectiveDate: {
      type: Date
    },
    
    // Categories
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Subcategory'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    
    // Recurring
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringConfig: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly']
      },
      interval: {
        type: Number,
        min: 1,
        default: 1
      },
      endDate: Date,
      nextDate: Date
    },
    
    // Credit card info
    creditCardInfo: {
      installments: {
        type: Number,
        min: 1,
        max: 48
      },
      currentInstallment: {
        type: Number,
        min: 1
      },
      interestRate: {
        type: Number,
        min: 0,
        max: 100
      },
      dueDate: {
  type: Date
  },
  recurringTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  paymentOptions: {
    creditCardId: {
      type: Schema.Types.ObjectId,
      ref: 'Account'
    },
    paymentType: {
      type: String,
      enum: ['minimum', 'no_interest', 'custom']
    },
    originalMinimumAmount: { type: Number },
    noInterestAmount: { type: Number },
    customAmount: { type: Number }
  },
      cutoffPeriod: String
    },
    
    // Additional info
    merchant: {
      type: String,
      trim: true,
      maxlength: 200
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    // Currency
    exchangeRate: {
      type: Number,
      min: 0
    },
    originalCurrency: {
      type: String,
      uppercase: true,
      maxlength: 3
    },
    originalAmount: {
      type: Number
    },
    
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
TransactionSchema.index({ userId: 1, accountId: 1, transactionDate: -1 });
TransactionSchema.index({ userId: 1, transactionDate: -1 });
TransactionSchema.index({ userId: 1, categoryId: 1 });
TransactionSchema.index({ isRecurring: 1, 'recurringConfig.nextDate': 1 });

// Virtual for absolute amount (always positive)
TransactionSchema.virtual('absoluteAmount').get(function() {
  return Math.abs(this.amount);
});

// Virtual for transaction direction
TransactionSchema.virtual('direction').get(function() {
  return this.amount >= 0 ? 'credit' : 'debit';
});

// Pre-save middleware
TransactionSchema.pre('save', function(next) {
  // Set effective date if not provided
  if (!this.effectiveDate) {
    this.effectiveDate = this.transactionDate;
  }
  
  // Validate transfer transactions
  if (this.type === TransactionType.TRANSFER && !this.transferToAccountId) {
    return next(new Error('Transfer transactions require transferToAccountId'));
  }
  
  // Validate recurring config
  if (this.isRecurring && !this.recurringConfig?.frequency) {
    return next(new Error('Recurring transactions require frequency'));
  }
  
  next();
});

// Instance methods
TransactionSchema.methods.applyToAccount = async function() {
  const Account = mongoose.model('Account');
  const account = await Account.findById(this.accountId);
  
  if (!account) {
    throw new Error('Account not found');
  }
  
  // For transfers: FROM account should LOSE money (negative)
  // For other transactions: use amount as-is
  if (this.type === TransactionType.TRANSFER) {
    await account.updateBalance(-Math.abs(this.amount));  // ✅ FROM: Always subtract
    
    if (this.transferToAccountId) {
      const targetAccount = await Account.findById(this.transferToAccountId);
      if (targetAccount) {
        await targetAccount.updateBalance(Math.abs(this.amount));  // ✅ TO: Always add
      }
    }
  } else {
    // For non-transfer transactions, use amount as-is
    await account.updateBalance(this.amount);
  }
};

TransactionSchema.methods.reverseTransaction = async function() {
  // Create reverse transaction
  const reverseTransaction = new (mongoose.model('Transaction'))({
    description: `REVERSAL: ${this.description}`,
    amount: -this.amount,
    type: this.type,
    paymentMethod: this.paymentMethod,
    accountId: this.accountId,
    transferToAccountId: this.transferToAccountId,
    transactionDate: new Date(),
    notes: `Reversal of transaction ${this._id}`
  });
  
  await reverseTransaction.save();
  await reverseTransaction.applyToAccount();
  
  // Mark original as cancelled
  this.status = TransactionStatus.CANCELLED;
  await this.save();
  
  return reverseTransaction;
};

// Static methods
TransactionSchema.statics.getByAccount = function(accountId: string) {
  return this.find({ accountId, isActive: true })
    .sort({ transactionDate: -1 })
    .populate('accountId', 'name type')
    .populate('categoryId', 'name color');
};

TransactionSchema.statics.getByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    transactionDate: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ transactionDate: -1 });
};

TransactionSchema.statics.getRecurring = function() {
  return this.find({ isRecurring: true, isActive: true });
};

TransactionSchema.statics.getTotalByCategory = function(categoryId: string, startDate?: Date, endDate?: Date) {
  const match: any = { categoryId, isActive: true };
  
  if (startDate && endDate) {
    match.transactionDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).then(result => result[0]?.total || 0);
};

TransactionSchema.statics.getMonthlyExpenses = function(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.find({
    transactionDate: { $gte: startDate, $lte: endDate },
    amount: { $lt: 0 }, // Only expenses
    isActive: true
  }).sort({ transactionDate: -1 });
};

TransactionSchema.statics.getByAccountForUser = function(accountId: string, userId: string) {
  return this.find({ accountId, userId, isActive: true })
    .sort({ transactionDate: -1 })
    .populate('accountId', 'name type')
    .populate('categoryId', 'name color');
};

TransactionSchema.statics.getMonthlyExpensesForUser = function(year: number, month: number, userId: string) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.find({
    userId,
    transactionDate: { $gte: startDate, $lte: endDate },
    amount: { $lt: 0 },
    isActive: true
  }).sort({ transactionDate: -1 });
};

// Remove markAsPaid method from Transaction
// Add this instead:
TransactionSchema.statics.createFromPayment = async function(paymentSchedule: any, paidFromAccountId: mongoose.Types.ObjectId) {
  const transaction = new this({
    userId: paymentSchedule.userId,
    description: paymentSchedule.description,
    amount: -paymentSchedule.currentAmount, // negative for expense
    type: 'payment',
    paymentMethod: 'bank_transfer',
    accountId: paidFromAccountId,
    transactionDate: new Date(),
    notes: `Payment for: ${paymentSchedule.description}`
  });
  
  await transaction.save();
  await transaction.applyToAccount();
  return transaction;
};

// Create and export the model
const Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction', TransactionSchema);

export default Transaction;