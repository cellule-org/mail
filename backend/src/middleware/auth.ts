import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getCookie } from '../utils/cookies';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth middleware');

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        req.userId = jwtObject.id;
        next();
    } catch (err) {
        logger.error('Authentication error:', err);
        res.status(401).json({ error: 'Unauthorized' });
    }
};
