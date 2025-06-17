#!/usr/bin/env tsx
// scripts/verify-fix.ts
import { signToken, verifyToken } from '../lib/auth';

async function verifyFix() {
    console.log('🔧 Verificando solución completa...\n');

    // 1. Verificar variables de entorno
    console.log('1️⃣ Variables de entorno:');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   JWT_SECRET from process.env:', !!process.env.JWT_SECRET);
    console.log('   JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    console.log('');

    // 2. Test completo de auth
    console.log('2️⃣ Test de autenticación:');
    const testPayload = { userId: 'test-user-verification' };

    try {
        const token = signToken(testPayload);
        console.log('   ✅ Token generado correctamente');

        const decoded = verifyToken(token);
        console.log('   ✅ Token verificado correctamente');
        console.log('   ✅ UserId match:', decoded?.userId === testPayload.userId);

        // Test con el mismo token múltiples veces
        const decoded2 = verifyToken(token);
        console.log('   ✅ Segunda verificación:', !!decoded2);

    } catch (error) {
        console.error('   ❌ Error en test:', error);
    }

    console.log('');

    // 3. Verificar que la importación funciona
    console.log('3️⃣ Verificando importaciones:');
    try {
        const authModule = require('../lib/auth');
        console.log('   ✅ Módulo auth importado');
        console.log('   ✅ signToken disponible:', typeof authModule.signToken);
        console.log('   ✅ verifyToken disponible:', typeof authModule.verifyToken);
    } catch (error) {
        console.error('   ❌ Error importando:', error);
    }

    console.log('');
    console.log('🎉 Verificación completada');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecutar el script de logout en el navegador');
    console.log('   2. Reiniciar servidor Next.js');
    console.log('   3. Registrarse/loguearse de nuevo');
    console.log('   4. Probar crear perfil emisor');
}

verifyFix().catch(console.error);