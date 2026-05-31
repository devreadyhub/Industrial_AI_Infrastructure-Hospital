import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'hospital-secret-key';

export interface AuthTokenPayload extends jwt.JwtPayload {
  staffId: string;
  role: string;
  clearanceLevel: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const signAuthToken = (
  payload: {
    staffId: string;
    role: string;
    clearanceLevel: number;
  },
  expiresIn = '1h',
): string => {
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    if (typeof decodedToken === 'string') {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    const decoded = decodedToken as AuthTokenPayload;
    if (
      !decoded.staffId ||
      !decoded.role ||
      typeof decoded.clearanceLevel !== 'number'
    ) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = {
      staffId: decoded.staffId,
      role: decoded.role,
      clearanceLevel: decoded.clearanceLevel,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const protectRoute = (requiredLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { clearanceLevel } = req.user;
    if (typeof clearanceLevel !== 'number' || clearanceLevel < requiredLevel) {
      return res.status(403).json({
        message: 'Forbidden: insufficient clearance level',
        requiredLevel,
        userLevel: clearanceLevel,
      });
    }

    next();
  };
};

export const authenticateAIUser = authenticateJWT;
export const authenticateToken = authenticateJWT;
