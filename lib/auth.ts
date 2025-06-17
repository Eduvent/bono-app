import jwt from 'jsonwebtoken';

// FORZAR carga de variables de entorno con fallback
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024-bonoapp';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Debug para verificar qué secret se está usando
console.log('🔐 AUTH MODULE: JWT_SECRET disponible:', !!process.env.JWT_SECRET);
console.log('🔐 AUTH MODULE: Usando secret length:', JWT_SECRET.length);
console.log('🔐 AUTH MODULE: Secret preview:', JWT_SECRET.substring(0, 10) + '...');

export interface JwtPayload {
    userId: string;
}

export function signToken(payload: JwtPayload) {
    console.log('🔐 SIGN: Generando token con secret length:', JWT_SECRET.length);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log('🔐 SIGN: Token generado length:', token.length);
    return token;
}

export function verifyToken(token: string): JwtPayload | null {
    try {
        console.log('🔐 VERIFY: Verificando token con secret length:', JWT_SECRET.length);
        console.log('🔐 VERIFY: Token length:', token.length);
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        console.log('🔐 VERIFY: Token válido para userId:', payload.userId);
        return payload;
    } catch (error) {
        console.log('🔐 VERIFY: Token inválido:', error.message);
        return null;
    }
}