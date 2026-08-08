import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'college_erp_super_secret_key_min_32_characters_long_very_secure';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export const generateToken = (payload: { id: string; role: string; tv: number }): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY as any });
};

export const verifyToken = (token: string): { id: string; role: string; tv: number } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string; tv: number };
};
