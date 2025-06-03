import mongoose, { Schema, Document } from "mongoose";
import { IAccount } from "./Account";

export interface ICustomBalance extends Document {
  userId: mongoose.Types.ObjectId;

  accountIds: mongoose.Types.ObjectId[] | IAccount[];

  calculateTotalBalance(): Promise<number>;
}

export interface ICustomBalanceModel extends mongoose.Model<ICustomBalance> {
  getCustomBalance(userId: mongoose.Types.ObjectId): Promise<ICustomBalance | null>;
  createCustomBalance(userId: mongoose.Types.ObjectId, accountIds: mongoose.Types.ObjectId[]): Promise<ICustomBalance>;
}

const CustomBalanceSchema = new Schema<ICustomBalance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
  }
);

CustomBalanceSchema.statics.getCustomBalance = async function (userId: mongoose.Types.ObjectId): Promise<ICustomBalance | null> {
  return this.findOne({ userId }).populate("accountIds").exec();
};

CustomBalanceSchema.statics.createCustomBalance = async function (
  userId: mongoose.Types.ObjectId,
  accountIds: mongoose.Types.ObjectId[]
): Promise<ICustomBalance> {
  const customBalance = new this({ userId, accountIds });
  return customBalance.save();
};

// Ensure the userId and accountIds combination is unique
CustomBalanceSchema.index({ userId: 1, accountIds: 1 }, { unique: true });

// Validate Account IDs
CustomBalanceSchema.pre<ICustomBalance>("save", function (next) {
  if (!this.accountIds || this.accountIds.length === 0) {
    return next(new Error("At least one account ID is required for custom balance."));
  }
  if (
    this.accountIds.some(id => {
      // If id is an object (IAccount), extract its _id
      const objectId = (id && typeof id === "object" && "_id" in id)
        ? (id as any)._id
        : id;
      return !mongoose.Types.ObjectId.isValid(objectId);
    })
  ) {
    return next(new Error("Invalid account ID format."));
  }
  next();
});

CustomBalanceSchema.methods.calculateTotalBalance = async function (): Promise<number> {
  const Account = mongoose.model("Account");
  const accounts = await Account.find({ _id: { $in: this.accountIds } }).exec();
  
  if (!accounts || accounts.length === 0) {
    // Log a warning if no accounts are found
    console.warn("No accounts found for the custom balance calculation.");
    return 0;
  }

  return accounts.reduce((total, account) => total + (account.balance || 0), 0);
};

export const CustomBalance = mongoose.model<ICustomBalance, ICustomBalanceModel>("CustomBalance", CustomBalanceSchema);