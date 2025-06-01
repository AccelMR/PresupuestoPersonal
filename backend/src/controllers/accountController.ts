import mongoose, { Document, Schema } from 'mongoose';

// Account types
export enum AccountType {
  CHECKING = 'checking',    // Checking account
  SAVINGS = 'savings',      // Savings account
  CREDIT_CARD = 'credit_card',     // Credit card
  AUTO_LOAN = 'auto_loan',         // Auto loan
  PERSONAL_LOAN = 'personal_loan', // Personal loan
  MORTGAGE = 'mortgage',           // Mortgage
  CASH = 'cash',                   // Cash
  INVESTMENT = 'investment'        // Investments
}

// TypeScript interface
export interface IAccount extends Document {
  name: string;
  type: AccountType;
  initialBalance: number;\

  
  currentBalance: number;
  currency: string;
  description?: string;
  isActive: boolean;
  
  // Fields for credit products (cards, loans, etc.)
  creditFields?: {
    creditLimit?: number;           // Credit limit
    availableCredit?: number;       // Available credit
    minimumPayment?: number;        // Minimum monthly payment
    interestRate?: number;          // Annual interest rate
    cutoffDay?: number;             // Cutoff day (1-31)
    paymentDueDay?: number;         // Payment due day (1-31)
    
    // For loans/financing
    originalAmount?: number;        // Original loan amount
    monthlyPayment?: number;        // Fixed monthly payment
    remainingPayments?: number;     // Remaining payments
    totalPayments?: number;         // Total payments
    
    // Important dates
    lastCutoffDate?: Date;          // Last cutoff date
    nextCutoffDate?: Date;          // Next cutoff date
    nextPaymentDate?: Date;         // Next payment date
    openingDate?: Date;             // Account opening date
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB schema
const AccountSchema = new Schema<IAccount>(
  {
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      unique: true
    },
    type: {
      type: String,
      enum: Object.values(AccountType),
      required: [true, 'Account type is required']
    },
    initialBalance: {
      type: Number,
      required: [true, 'Initial balance is required'],
      default: 0
    },
    currentBalance: {
      type: Number,
      required: [true, 'Current balance is required'],
      default: function() { return this.initialBalance; }
    },
    currency: {
      type: String,
      required: true,
      default: 'MXN',
      uppercase: true,
      maxlength: 3
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Fields for credit products
    creditFields: {
      type: {
        creditLimit: { type: Number, min: 0 },
        availableCredit: { type: Number, min: 0 },
        minimumPayment: { type: Number, min: 0 },
        interestRate: { 
          type: Number, 
          min: 0, 
          max: 100,
          validate: {
            validator: function(v: number) {
              return v >= 0 && v <= 100;
            },
            message: 'Interest rate must be between 0% and 100%'
          }
        },
        cutoffDay: { 
          type: Number, 
          min: 1, 
          max: 31,
          validate: {
            validator: function(v: number) {
              return v >= 1 && v <= 31;
            },
            message: 'Cutoff day must be between 1 and 31'
          }
        },
        paymentDueDay: { 
          type: Number, 
          min: 1, 
          max: 31,
          validate: {
            validator: function(v: number) {
              return v >= 1 && v <= 31;
            },
            message: 'Payment due day must be between 1 and 31'
          }
        },
        
        // For loans
        originalAmount: { type: Number, min: 0 },
        monthlyPayment: { type: Number, min: 0 },
        remainingPayments: { type: Number, min: 0 },
        totalPayments: { type: Number, min: 0 },
        
        // Important dates
        lastCutoffDate: { type: Date },
        nextCutoffDate: { type: Date },
        nextPaymentDate: { type: Date },
        openingDate: { type: Date }
      },
      required: function() {
        return ['credit_card', 'auto_loan', 'personal_loan', 'mortgage'].includes(this.type);
      }
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to calculate difference from initial balance
AccountSchema.virtual('balanceDifference').get(function() {
  return this.currentBalance - this.initialBalance;
});

// Virtual to calculate credit used (for cards)
AccountSchema.virtual('creditUsed').get(function() {
  if (this.type === AccountType.CREDIT_CARD && this.creditFields?.creditLimit) {
    return this.creditFields.creditLimit - (this.creditFields.availableCredit || 0);
  }
  return 0;
});

// Virtual to calculate utilization percentage
AccountSchema.virtual('utilizationPercentage').get(function() {
  if (this.type === AccountType.CREDIT_CARD && this.creditFields?.creditLimit) {
    const used = this.creditUsed;
    return Math.round((used / this.creditFields.creditLimit) * 100);
  }
  return 0;
});

// Virtual for days until next payment
AccountSchema.virtual('daysUntilPayment').get(function() {
  if (this.creditFields?.nextPaymentDate) {
    const today = new Date();
    const paymentDate = new Date(this.creditFields.nextPaymentDate);
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return null;
});

// Virtual for days until next cutoff
AccountSchema.virtual('daysUntilCutoff').get(function() {
  if (this.creditFields?.nextCutoffDate) {
    const today = new Date();
    const cutoffDate = new Date(this.creditFields.nextCutoffDate);
    const diffTime = cutoffDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return null;
});

// Middleware for custom validations
AccountSchema.pre('save', function(next) {
  // If it's a credit card or loan, balance can be negative
  const creditTypes = [AccountType.CREDIT_CARD, AccountType.AUTO_LOAN, AccountType.PERSONAL_LOAN, AccountType.MORTGAGE];
  if (!creditTypes.includes(this.type) && this.currentBalance < 0) {
    next(new Error('Balance cannot be negative for this account type'));
    return;
  }
  
  // Auto-calculate dates for credit products
  if (this.creditFields?.cutoffDay && this.creditFields?.paymentDueDay) {
    this.calculateCreditDates();
  }
  
  // Auto-calculate available credit if not defined
  if (this.type === AccountType.CREDIT_CARD && this.creditFields?.creditLimit && !this.creditFields.availableCredit) {
    this.creditFields.availableCredit = this.creditFields.creditLimit + this.currentBalance;
  }
  
  next();
});

// Model methods
AccountSchema.methods.updateBalance = function(amount: number) {
  this.currentBalance += amount;
  
  // Update available credit for cards
  if (this.type === AccountType.CREDIT_CARD && this.creditFields?.creditLimit) {
    this.creditFields.availableCredit = this.creditFields.creditLimit + this.currentBalance;
  }
  
  return this.save();
};

AccountSchema.methods.setBalance = function(newBalance: number) {
  this.currentBalance = newBalance;
  
  // Update available credit for cards
  if (this.type === AccountType.CREDIT_CARD && this.creditFields?.creditLimit) {
    this.creditFields.availableCredit = this.creditFields.creditLimit + this.currentBalance;
  }
  
  return this.save();
};

// Method to calculate cutoff and payment dates
AccountSchema.methods.calculateCreditDates = function() {
  if (!this.creditFields?.cutoffDay || !this.creditFields?.paymentDueDay) return;
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Calculate next cutoff date
  let nextCutoff = new Date(currentYear, currentMonth, this.creditFields.cutoffDay);
  if (nextCutoff <= today) {
    nextCutoff = new Date(currentYear, currentMonth + 1, this.creditFields.cutoffDay);
  }
  
  // Calculate next payment date (usually 20 days after cutoff)
  let nextPayment = new Date(nextCutoff);
  if (this.creditFields.paymentDueDay >= this.creditFields.cutoffDay) {
    // Same month
    nextPayment = new Date(currentYear, currentMonth, this.creditFields.paymentDueDay);
    if (nextPayment <= today) {
      nextPayment = new Date(currentYear, currentMonth + 1, this.creditFields.paymentDueDay);
    }
  } else {
    // Next month
    nextPayment = new Date(nextCutoff.getFullYear(), nextCutoff.getMonth() + 1, this.creditFields.paymentDueDay);
  }
  
  this.creditFields.nextCutoffDate = nextCutoff;
  this.creditFields.nextPaymentDate = nextPayment;
};

// Method to get credit status
AccountSchema.methods.getCreditStatus = function() {
  if (!['credit_card', 'auto_loan', 'personal_loan', 'mortgage'].includes(this.type)) {
    return null;
  }
  
  return {
    type: this.type,
    balance: this.currentBalance,
    limit: this.creditFields?.creditLimit || 0,
    available: this.creditFields?.availableCredit || 0,
    used: this.creditUsed,
    utilization: this.utilizationPercentage,
    minimumPayment: this.creditFields?.minimumPayment || 0,
    daysUntilPayment: this.daysUntilPayment,
    daysUntilCutoff: this.daysUntilCutoff,
    nextPaymentDate: this.creditFields?.nextPaymentDate,
    nextCutoffDate: this.creditFields?.nextCutoffDate
  };
};

// Static method to get active accounts
AccountSchema.statics.getActiveAccounts = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Create and export the model
const Account = mongoose.model<IAccount>('Account', AccountSchema);

export default Account;