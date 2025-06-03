import { Request, Response } from 'express';
import { CustomBalance } from '../models/CustomBalance';
import { requireAuth, getUserId, getUserObjectId } from '../middleware/auth';

export const getCustomBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserObjectId(req);
    const customBalance = await CustomBalance.getCustomBalance(userId);
    
    if (!customBalance) {
      res.status(404).json({ message: 'Custom balance not found.' });
      return;
    }

    res.json(customBalance);
  } catch (error) {
    console.error('Error fetching custom balance:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const customBalance = await CustomBalance.findOne({ _id: id, userId });
    if (!customBalance) {
      return res.status(404).json({ message: 'Custom balance not found.' });
    }

    const totalBalance = await customBalance.calculateTotalBalance();
    res.status(200).json({
      success: true,
      data:{
        totalBalance,
        accountIds: customBalance.accountIds
      }
    });
  } catch (error) {
    console.error('Error calculating balance:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};