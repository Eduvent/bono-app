import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JwtPayload {
    userId: string;
}

export function signToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}