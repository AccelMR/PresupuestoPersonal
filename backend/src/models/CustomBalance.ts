// backend/src/models/CustomBalance.ts - FIXED VERSION
import mongoose, { Schema, Document } from "mongoose";
import { IAccount } from "./Account";
import { IUser } from "./User";

export interface ICustomBalance extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  name: string; // NEW: Give custom balances a name
  description?: string; // NEW: Optional description
  accountIds: mongoose.Types.ObjectId[] | IAccount[];
  
  // Instance methods
  calculateTotalBalance(): Promise<number>;
  calculateBalanceByType(): Promise<{ [key: string]: number }>;
  getAccountDetails(): Promise<IAccount[]>;
}

export interface ICustomBalanceModel extends mongoose.Model<ICustomBalance> {
  getCustomBalancesByUser(userId: mongoose.Types.ObjectId): Promise<ICustomBalance[]>;
  createCustomBalance(
    userId: mongoose.Types.ObjectId, 
    name: string,
    accountIds: mongoose.Types.ObjectId[],
    description?: string
  ): Promise<ICustomBalance>;
}

const CustomBalanceSchema = new Schema<ICustomBalance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Custom balance name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    accountIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Account",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// INDEXES - Like database optimization in C++
CustomBalanceSchema.index({ userId: 1 });
CustomBalanceSchema.index({ userId: 1, name: 1 }, { unique: true }); // Unique name per user

// STATIC METHODS - Like static class methods in C++
CustomBalanceSchema.statics.getCustomBalancesByUser = async function (
  userId: mongoose.Types.ObjectId
): Promise<ICustomBalance[]> {
  return this.find({ userId })
    .populate({
      path: 'accountIds',
      select: 'name type currentBalance currency isActive',
      match: { isActive: true } // Only include active accounts
    })
    .sort({ name: 1 })
    .exec();
};

CustomBalanceSchema.statics.createCustomBalance = async function (
  userId: mongoose.Types.ObjectId,
  name: string,
  accountIds: mongoose.Types.ObjectId[],
  description?: string
): Promise<ICustomBalance> {
  // Validate that accounts exist and belong to user
  const Account = mongoose.model("Account");
  const accounts = await Account.find({ 
    _id: { $in: accountIds }, 
    userId,
    isActive: true 
  });
  
  if (accounts.length !== accountIds.length) {
    throw new Error("Some accounts were not found or don't belong to user");
  }
  
  const customBalance = new this({ 
    userId, 
    name: name.trim(),
    description: description?.trim(),
    accountIds 
  });
  
  return customBalance.save();
};

// PRE-SAVE VALIDATION - Like constructor validation in C++
CustomBalanceSchema.pre<ICustomBalance>("save", async function (next) {
  // Validate at least one account
  if (!this.accountIds || this.accountIds.length === 0) {
    return next(new Error("At least one account ID is required for custom balance"));
  }
  
  // Validate all ObjectIds
  const invalidIds = this.accountIds.filter(id => {
    const objectId = (id && typeof id === "object" && "_id" in id)
      ? (id as any)._id
      : id;
    return !mongoose.Types.ObjectId.isValid(objectId);
  });
  
  if (invalidIds.length > 0) {
    return next(new Error("Invalid account ID format"));
  }
  
  // If this is a new document or accountIds changed, validate account ownership
  if (this.isNew || this.isModified('accountIds')) {
    const Account = mongoose.model("Account");
    const accounts = await Account.find({ 
      _id: { $in: this.accountIds }, 
      userId: this.userId,
      isActive: true 
    });
    
    if (accounts.length !== this.accountIds.length) {
      return next(new Error("Some accounts don't exist or don't belong to user"));
    }
  }
  
  next();
});

// INSTANCE METHODS - Like class methods in C++

CustomBalanceSchema.methods.calculateTotalBalance = async function (): Promise<number> {
  const Account = mongoose.model("Account");
  const accounts = await Account.find({ 
    _id: { $in: this.accountIds },
    isActive: true 
  }).exec();
  
  if (!accounts || accounts.length === 0) {
    console.warn(`No active accounts found for custom balance ${this._id}`);
    return 0;
  }

  // FIXED: Use currentBalance instead of balance
  return accounts.reduce((total, account) => {
    return total + (account.currentBalance || 0);
  }, 0);
};

CustomBalanceSchema.methods.calculateBalanceByType = async function (): Promise<{ [key: string]: number }> {
  const Account = mongoose.model("Account");
  const accounts = await Account.find({ 
    _id: { $in: this.accountIds },
    isActive: true 
  }).exec();
  
  const balanceByType: { [key: string]: number } = {};
  
  accounts.forEach(account => {
    const type = account.type;
    if (!balanceByType[type]) {
      balanceByType[type] = 0;
    }
    balanceByType[type] += account.currentBalance || 0;
  });
  
  return balanceByType;
};

CustomBalanceSchema.methods.getAccountDetails = async function (): Promise<IAccount[]> {
  const Account = mongoose.model("Account");
  return Account.find({ 
    _id: { $in: this.accountIds },
    isActive: true 
  })
  .select('name type currentBalance currency')
  .exec();
};

// VIRTUAL PROPERTIES - Like computed properties in C++
CustomBalanceSchema.virtual('accountCount').get(function() {
  return this.accountIds ? this.accountIds.length : 0;
});

export const CustomBalance = mongoose.model<ICustomBalance, ICustomBalanceModel>(
  "CustomBalance", 
  CustomBalanceSchema
);