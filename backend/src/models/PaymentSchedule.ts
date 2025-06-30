import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';
import { IAccount } from './Account';
import { ITransaction } from './Transaction';

export enum PaymentType {
  CREDIT_CARD_MINIMUM = 'credit_card_minimum',
  CREDIT_CARD_FULL = 'credit_card_full',
  RECURRING_TRANSACTION = 'recurring_transaction',
  MANUAL_PAYMENT = 'manual_payment'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  SKIPPED = 'skipped'
}

export interface IPaymentSchedule extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  
  // Payment details
  description: string;
  originalAmount: number;
  currentAmount: number; // Editable amount
  paymentType: PaymentType;
  status: PaymentStatus;
  
  // Dates
  dueDate: Date;
  paidDate?: Date;
  
  // Relationships
  accountId?: mongoose.Types.ObjectId | IAccount; // Target account (for credit cards)
  paidFromAccountId?: mongoose.Types.ObjectId | IAccount; // Source account
  recurringTransactionId?: mongoose.Types.ObjectId | ITransaction;
  
  // Metadata`
  month: number; // 1-12
  year: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  markAsPaid(paidFromAccountId: mongoose.Types.ObjectId): Promise<IPaymentSchedule>;
  updateAmount(newAmount: number): Promise<IPaymentSchedule>;
}

export interface IPaymentScheduleModel extends Model<IPaymentSchedule> {
  generateMonthlySchedule(userId: mongoose.Types.ObjectId, year: number, month: number): Promise<IPaymentSchedule[]>;
  getScheduleForMonth(userId: mongoose.Types.ObjectId, year: number, month: number): Promise<IPaymentSchedule[]>;
}

const PaymentScheduleSchema = new Schema<IPaymentSchedule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      //index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    originalAmount: {
      type: Number,
      required: [true, 'Original amount is required']
    },
    currentAmount: {
      type: Number,
      required: [true, 'Current amount is required']
    },
    paymentType: {
      type: String,
      enum: Object.values(PaymentType),
      required: [true, 'Payment type is required']
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    paidDate: {
      type: Date
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account'
    },
    paidFromAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account'
    },
    recurringTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020
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

// Indexes
PaymentScheduleSchema.index({ userId: 1, year: 1, month: 1 });
PaymentScheduleSchema.index({ userId: 1, dueDate: 1 });
PaymentScheduleSchema.index({ userId: 1, status: 1 });

// Instance methods
PaymentScheduleSchema.methods.markAsPaid = async function(paidFromAccountId: mongoose.Types.ObjectId) {
  this.status = PaymentStatus.PAID;
  this.paidDate = new Date();
  this.paidFromAccountId = paidFromAccountId;
  return this.save();
};

PaymentScheduleSchema.methods.updateAmount = async function(newAmount: number) {
  this.currentAmount = newAmount;
  return this.save();
};

// Static methods
PaymentScheduleSchema.statics.generateMonthlySchedule = async function(
  userId: mongoose.Types.ObjectId, 
  year: number, 
  month: number
) {
  // Implementation will come in next step
  return [];
};

PaymentScheduleSchema.statics.getScheduleForMonth = function(
  userId: mongoose.Types.ObjectId, 
  year: number, 
  month: number
) {
  return this.find({ 
    userId, 
    year, 
    month, 
    isActive: true 
  })
  .populate('accountId', 'name type')
  .populate('paidFromAccountId', 'name type')
  .populate('recurringTransactionId', 'description amount')
  .sort({ dueDate: 1 });
};

const PaymentSchedule = mongoose.model<IPaymentSchedule, IPaymentScheduleModel>('PaymentSchedule', PaymentScheduleSchema);

export default PaymentSchedule;