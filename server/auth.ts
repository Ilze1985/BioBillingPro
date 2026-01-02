import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from './storage';
import { type User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  await storage.createAuthSession({
    id: sessionId,
    userId,
    expiresAt,
  });
  
  return sessionId;
}

export async function validateSession(sessionId: string): Promise<User | null> {
  const session = await storage.getAuthSession(sessionId);
  
  if (!session) {
    return null;
  }
  
  if (new Date(session.expiresAt) < new Date()) {
    await storage.deleteAuthSession(sessionId);
    return null;
  }
  
  const user = await storage.getUser(session.userId);
  return user || null;
}

export async function destroySession(sessionId: string): Promise<void> {
  await storage.deleteAuthSession(sessionId);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

export function requirePractitionerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'practitioner') {
    res.status(403).json({ message: 'Practitioner or admin access required' });
    return;
  }
  next();
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies?.session;
  
  if (sessionId) {
    const user = await validateSession(sessionId);
    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
  }
  
  next();
}
