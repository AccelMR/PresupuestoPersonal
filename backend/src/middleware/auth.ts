import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Middleware to protect routes
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔍 requireAuth middleware executing...');
    console.log('🔍 Authorization header:', req.headers.authorization);
    
    // Validate JWT_SECRET exists
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET not found');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Token preview:', token.substring(0, 20) + '...');

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    console.log('🔍 Token decoded successfully:', decoded.userId);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    console.log('🔍 User found:', !!user);
    
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.'
      });
    }

    // Add user to request object
    req.user = user;
    console.log('✅ User attached to request:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware for optional auth (user might or might not be logged in)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(); // Continue without auth if JWT_SECRET not configured
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Helper function to generate JWT tokens
export const generateToken = (user: IUser): string => {
  // Validate JWT_SECRET exists
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  const payload = {
    userId: (user._id as mongoose.Types.ObjectId).toString(), // Cast to ObjectId first
    email: user.email
  };
  
  // Simple approach without explicit options typing
  try {
    return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  } catch (error) {
    console.error('JWT signing error:', error);
    throw new Error('Failed to generate token');
  }
};

// Helper function to extract user ID from request as string
export const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return (req.user._id as mongoose.Types.ObjectId).toString();
};

// Helper function to extract user ID from request as ObjectId
export const getUserObjectId = (req: Request): mongoose.Types.ObjectId => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user._id as mongoose.Types.ObjectId;
};