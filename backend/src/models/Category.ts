import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

// Category types for Mexican context
export enum CategoryType {
  EXPENSE = 'expense',
  INCOME = 'income',
  BOTH = 'both'
}

// Category interface
export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  
  name: string;
  type: CategoryType;
  color: string;           // Hex color for UI (#FF5733)
  icon?: string;          // Icon name for UI
  description?: string;
  
  // Mexican financial context
  isEssential: boolean;    // Essential vs discretionary spending
  budgetLimit?: number;    // Monthly budget limit for this category
  
  // Hierarchy
  parentCategoryId?: mongoose.Types.ObjectId | ICategory;  // For subcategories
  
  // Analytics
  monthlyAverage?: number;  // Calculated monthly average
  lastMonthTotal?: number;  // Last month's total
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  calculateMonthlyAverage(): Promise<number>;
  getBudgetStatus(): Promise<{ spent: number; remaining: number; percentage: number }>;
}

// Static methods interface
export interface ICategoryModel extends Model<ICategory> {
  getExpenseCategories(userId: string): Promise<ICategory[]>;
  getIncomeCategories(userId: string): Promise<ICategory[]>;
  createDefaultCategories(userId: string): Promise<ICategory[]>;
}

// MongoDB schema
const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    type: {
      type: String,
      enum: Object.values(CategoryType),
      required: [true, 'Category type is required']
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color']
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 30
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    isEssential: {
      type: Boolean,
      default: false
    },
    budgetLimit: {
      type: Number,
      min: 0
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category'
    },
    monthlyAverage: {
      type: Number,
      default: 0
    },
    lastMonthTotal: {
      type: Number,
      default: 0
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
CategorySchema.index({ userId: 1, name: 1 }, { unique: true }); // Unique name per user
CategorySchema.index({ userId: 1, type: 1 });
CategorySchema.index({ userId: 1, isActive: 1 });

// Virtual for subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategoryId'
});

// Instance methods
CategorySchema.methods.calculateMonthlyAverage = async function() {
  const Transaction = mongoose.model('Transaction');
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        categoryId: this._id,
        transactionDate: { $gte: sixMonthsAgo },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$transactionDate' },
          month: { $month: '$transactionDate' }
        },
        total: { $sum: { $abs: '$amount' } }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$total' }
      }
    }
  ]);
  
  const average = result[0]?.average || 0;
  this.monthlyAverage = Math.round(average);
  await this.save();
  
  return this.monthlyAverage;
};

CategorySchema.methods.getBudgetStatus = async function() {
  if (!this.budgetLimit) {
    return { spent: 0, remaining: 0, percentage: 0 };
  }
  
  const Transaction = mongoose.model('Transaction');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        categoryId: this._id,
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        spent: { $sum: { $abs: '$amount' } }
      }
    }
  ]);
  
  const spent = result[0]?.spent || 0;
  const remaining = Math.max(0, this.budgetLimit - spent);
  const percentage = Math.round((spent / this.budgetLimit) * 100);
  
  return { spent, remaining, percentage };
};

// Static methods
CategorySchema.statics.getExpenseCategories = function(userId: string) {
  return this.find({ 
    userId, 
    type: { $in: [CategoryType.EXPENSE, CategoryType.BOTH] },
    isActive: true 
  }).sort({ name: 1 });
};

CategorySchema.statics.getIncomeCategories = function(userId: string) {
  return this.find({ 
    userId, 
    type: { $in: [CategoryType.INCOME, CategoryType.BOTH] },
    isActive: true 
  }).sort({ name: 1 });
};

CategorySchema.statics.createDefaultCategories = function(userId: string) {
  const defaultCategories = [
    // EXPENSE CATEGORIES
    // Essential expenses (gastos esenciales)
    { name: 'Vivienda', type: CategoryType.EXPENSE, color: '#E74C3C', icon: 'home', isEssential: true },
    { name: 'Alimentación', type: CategoryType.EXPENSE, color: '#F39C12', icon: 'utensils', isEssential: true },
    { name: 'Transporte', type: CategoryType.EXPENSE, color: '#3498DB', icon: 'car', isEssential: true },
    { name: 'Salud', type: CategoryType.EXPENSE, color: '#2ECC71', icon: 'heart', isEssential: true },
    { name: 'Servicios', type: CategoryType.EXPENSE, color: '#9B59B6', icon: 'bolt', isEssential: true },
    
    // Discretionary expenses (gastos discrecionales)
    { name: 'Entretenimiento', type: CategoryType.EXPENSE, color: '#E67E22', icon: 'film', isEssential: false },
    { name: 'Ropa', type: CategoryType.EXPENSE, color: '#1ABC9C', icon: 'tshirt', isEssential: false },
    { name: 'Educación', type: CategoryType.EXPENSE, color: '#34495E', icon: 'book', isEssential: false },
    { name: 'Tecnología', type: CategoryType.EXPENSE, color: '#95A5A6', icon: 'laptop', isEssential: false },
    { name: 'Regalos', type: CategoryType.EXPENSE, color: '#F1C40F', icon: 'gift', isEssential: false },
    { name: 'Mascotas', type: CategoryType.EXPENSE, color: '#8E44AD', icon: 'paw', isEssential: false },
    
    // Mexican specific
    { name: 'OXXO/Tiendas', type: CategoryType.EXPENSE, color: '#D35400', icon: 'shopping-bag', isEssential: false },
    { name: 'Farmacia', type: CategoryType.EXPENSE, color: '#27AE60', icon: 'pills', isEssential: true },
    { name: 'Banco/Fees', type: CategoryType.EXPENSE, color: '#C0392B', icon: 'university', isEssential: true },
    
    // INCOME CATEGORIES
    { name: 'Salario', type: CategoryType.INCOME, color: '#2ECC71', icon: 'dollar-sign', isEssential: true },
    { name: 'Freelance', type: CategoryType.INCOME, color: '#3498DB', icon: 'briefcase', isEssential: false },
    { name: 'Inversiones', type: CategoryType.INCOME, color: '#F39C12', icon: 'chart-line', isEssential: false },
    { name: 'Renta', type: CategoryType.INCOME, color: '#9B59B6', icon: 'home', isEssential: false },
    { name: 'Otros Ingresos', type: CategoryType.INCOME, color: '#1ABC9C', icon: 'plus-circle', isEssential: false }
  ];
  
  const categories = defaultCategories.map(cat => ({
    ...cat,
    userId: new mongoose.Types.ObjectId(userId)
  }));
  
  return this.insertMany(categories);
};

// Create and export the model
const Category = mongoose.model<ICategory, ICategoryModel>('Category', CategorySchema);

export default Category;