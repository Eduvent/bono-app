// lib/auth.ts - CORREGIDO CON 'jose' Y MANEJO DE ERRORES

import {SignJWT, jwtVerify, JWTPayload} from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024-bonoapp';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const key = new TextEncoder().encode(JWT_SECRET);

console.log('🔐 AUTH MODULE: JWT_SECRET disponible:', !!process.env.JWT_SECRET);

export interface JwtPayload extends JWTPayload{
    userId: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
    console.log('🔐 SIGN: Generando token...');

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' }) // Algoritmo de firma
        .setIssuedAt() // Fecha de emisión (ahora)
        .setExpirationTime(JWT_EXPIRES_IN) // Tiempo de expiración
        .sign(key); // Firmar con la clave codificada

    console.log('🔐 SIGN: Token generado.');
    return token;
}


export async function verifyToken(token: string): Promise<JwtPayload | null> {
    try {
        console.log('🔐 VERIFY: Verificando token...');

        const { payload } = await jwtVerify<JwtPayload>(token, key);

        console.log('🔐 VERIFY: Token válido para userId:', payload.userId);
        return payload;

    } catch (error) {
        // ✅ CORRECCIÓN: Manejar el error de tipo 'unknown'
        if (error instanceof Error) {
            // Los errores de 'jose' (token expirado, firma inválida) entran aquí
            console.error('🔐 VERIFY: Token inválido:', error.message);
        } else {
            // Para casos donde se lanza algo que no es un objeto Error
            console.error('🔐 VERIFY: Error desconocido durante la verificación del token:', error);
        }
        return null;
    }
}