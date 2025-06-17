#!/usr/bin/env tsx
// scripts/debug-auth.ts
import { signToken, verifyToken } from '../lib/auth';

async function debugAuthentication() {
    console.log('🔐 Debugging Authentication System...\n');

    // 1. Verificar variables de entorno
    console.log('1️⃣ Variables de entorno:');
    console.log('   JWT_SECRET configurado:', !!process.env.JWT_SECRET);
    console.log('   JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    console.log('   JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'not set');
    console.log('');

    // 2. Test de token simple
    console.log('2️⃣ Test de generación y verificación de token:');
    try {
        const testPayload = { userId: 'test-user-123' };
        console.log('   Payload test:', testPayload);

        const token = signToken(testPayload);
        console.log('   Token generado:', !!token);
        console.log('   Token length:', token.length);
        console.log('   Token preview:', token.substring(0, 50) + '...');

        const decoded = verifyToken(token);
        console.log('   Token decoded:', !!decoded);
        console.log('   UserId recovered:', decoded?.userId);
        console.log('   Match:', decoded?.userId === testPayload.userId ? '✅' : '❌');
        console.log('');

    } catch (error) {
        console.error('❌ Error en test de token:', error);
        console.log('');
    }

    // 3. Test con token malformado
    console.log('3️⃣ Test con token inválido:');
    try {
        const invalidToken = 'invalid.token.here';
        const result = verifyToken(invalidToken);
        console.log('   Token inválido result:', result);
        console.log('');
    } catch (error) {
        console.log('   ✅ Token inválido correctamente rechazado');
        console.log('');
    }

    // 4. Test de token vacío
    console.log('4️⃣ Test con token vacío:');
    try {
        const result = verifyToken('');
        console.log('   Token vacío result:', result);
        console.log('');
    } catch (error) {
        console.log('   ✅ Token vacío correctamente rechazado');
        console.log('');
    }

    console.log('🎉 Debug de autenticación completado');
}

// Ejecutar debug
debugAuthentication().catch(console.error);