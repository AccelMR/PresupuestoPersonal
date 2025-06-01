import { Request, Response } from 'express';
import Category, { ICategory, CategoryType } from '../models/Category';
import Transaction from '../models/Transaction';
import { getUserId, getUserObjectId } from '../middleware/auth';
import mongoose from 'mongoose';

// GET /api/categories - Get all categories for current user
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { type, includeSubcategories = 'true' } = req.query;

    // Build filter
    const filter: any = { userId, isActive: true };
    if (type && Object.values(CategoryType).includes(type as CategoryType)) {
      filter.type = type;
    }

    let categories;
    if (includeSubcategories === 'true') {
      categories = await Category.find(filter)
        .populate('subcategories')
        .sort({ name: 1 });
    } else {
      categories = await Category.find(filter).sort({ name: 1 });
    }

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/:id - Get category by ID (only if belongs to user)
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const category = await Category.findOne({ _id: id, userId })
      .populate('subcategories');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/categories - Create new category for current user
export const createCategory = async (req: Request, res: Response) => {
  try {
    const userId = getUserObjectId(req);
    const {
      name,
      type,
      color,
      icon,
      description,
      isEssential = false,
      budgetLimit,
      parentCategoryId
    } = req.body;

    // Basic validation
    if (!name || !type || !color) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and color are required'
      });
    }

    // Validate category type
    if (!Object.values(CategoryType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type'
      });
    }

    // Validate color format (hex)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Color must be a valid hex color (e.g., #FF5733)'
      });
    }

    // Check if user already has a category with this name
    const existingCategory = await Category.findOne({ userId, name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'You already have a category with this name'
      });
    }

    // Validate parent category if provided
    if (parentCategoryId) {
      const parentCategory = await Category.findOne({ _id: parentCategoryId, userId });
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    // Create category data
    const categoryData: Partial<ICategory> = {
      userId,
      name,
      type,
      color,
      icon,
      description,
      isEssential,
      budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
      parentCategoryId: parentCategoryId ? new mongoose.Types.ObjectId(parentCategoryId) : undefined
    };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT /api/categories/:id - Update category (only if belongs to user)
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Validate color if provided
    if (updates.color && !/^#[0-9A-F]{6}$/i.test(updates.color)) {
      return res.status(400).json({
        success: false,
        message: 'Color must be a valid hex color (e.g., #FF5733)'
      });
    }

    // Validate type if provided
    if (updates.type && !Object.values(CategoryType).includes(updates.type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type'
      });
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE /api/categories/:id - Soft delete category (only if belongs to user)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Check if category has transactions
    const transactionCount = await Transaction.countDocuments({
      categoryId: id,
      userId,
      isActive: true
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${transactionCount} transactions associated with it.`,
        suggestion: 'You can deactivate it instead or reassign the transactions to another category.'
      });
    }

    const category = await Category.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: category
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/expense - Get expense categories for current user
export const getExpenseCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const categories = await Category.getExpenseCategories(userId);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/income - Get income categories for current user
export const getIncomeCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const categories = await Category.getIncomeCategories(userId);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching income categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching income categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// POST /api/categories/defaults - Create default categories for current user
export const createDefaultCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    // Check if user already has categories
    const existingCount = await Category.countDocuments({ userId, isActive: true });
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have categories. Cannot create defaults.',
        existingCount
      });
    }

    const categories = await Category.createDefaultCategories(userId);

    res.status(201).json({
      success: true,
      message: 'Default categories created successfully',
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error creating default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating default categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/:id/budget-status - Get budget status for category
export const getCategoryBudgetStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const category = await Category.findOne({ _id: id, userId });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const budgetStatus = await category.getBudgetStatus();

    res.status(200).json({
      success: true,
      data: {
        category: {
          id: category._id,
          name: category.name,
          budgetLimit: category.budgetLimit
        },
        ...budgetStatus
      }
    });
  } catch (error) {
    console.error('Error fetching budget status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/:id/monthly-average - Calculate and get monthly average
export const getCategoryMonthlyAverage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const category = await Category.findOne({ _id: id, userId });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const monthlyAverage = await category.calculateMonthlyAverage();

    res.status(200).json({
      success: true,
      data: {
        category: {
          id: category._id,
          name: category.name
        },
        monthlyAverage,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error calculating monthly average:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating monthly average',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET /api/categories/analytics/spending - Get spending analytics by category
export const getSpendingAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = getUserObjectId(req);
    const { startDate, endDate, period = 'month' } = req.query;

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStart = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const analytics = await Transaction.aggregate([
      {
        $match: {
          userId,
          transactionDate: { $gte: defaultStart, $lte: defaultEnd },
          amount: { $lt: 0 }, // Only expenses
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          categoryColor: { $first: '$category.color' },
          categoryIcon: { $first: '$category.icon' },
          isEssential: { $first: '$category.isEssential' },
          totalSpent: { $sum: { $abs: '$amount' } },
          transactionCount: { $sum: 1 },
          averageTransaction: { $avg: { $abs: '$amount' } }
        }
      },
      {
        $sort: { totalSpent: -1 }
      }
    ]);

    // Calculate percentages
    const totalSpent = analytics.reduce((sum, cat) => sum + cat.totalSpent, 0);
    const analyticsWithPercentages = analytics.map(cat => ({
      ...cat,
      percentage: totalSpent > 0 ? Math.round((cat.totalSpent / totalSpent) * 100) : 0
    }));

    res.status(200).json({
      success: true,
      period: {
        startDate: defaultStart,
        endDate: defaultEnd,
        totalSpent,
        categoryCount: analytics.length
      },
      data: analyticsWithPercentages
    });
  } catch (error) {
    console.error('Error fetching spending analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spending analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};