// app/api/auth/update-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

console.log('🟢 API Route /api/auth/update-role CARGADO');

const prisma = new PrismaClient();

// Schema de validación para actualizar role
const UpdateRoleSchema = z.object({
    role: z.enum(['EMISOR', 'INVERSIONISTA'], { message: 'Role debe ser EMISOR o INVERSIONISTA' }),
});

export async function POST(request: NextRequest) {
    console.log('🟢 POST /api/auth/update-role EJECUTADO');

    try {
        // 1. Verificar autenticación
        const token = request.cookies.get('token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            console.log('❌ Token no encontrado');
            return NextResponse.json({ error: 'No autorizado - Token requerido' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
            console.log('❌ Token inválido o sin userId');
            return NextResponse.json({ error: 'No autorizado - Token inválido' }, { status: 401 });
        }

        console.log('✅ Usuario autenticado:', payload.userId);

        // 2. Validar datos del request
        const body = await request.json();
        console.log('📥 Datos recibidos:', JSON.stringify(body, null, 2));

        const { role } = UpdateRoleSchema.parse(body);
        console.log('✅ Role validado:', role);

        // 3. Conectar a base de datos
        try {
            await prisma.$connect();
            console.log('✅ Conectado a base de datos');
        } catch (dbError) {
            console.error('❌ Error conectando a BD:', dbError);
            return NextResponse.json({ error: 'Error de conexión a base de datos' }, { status: 500 });
        }

        // 4. Verificar que el usuario existe
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado:', payload.userId);
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        console.log('✅ Usuario encontrado:', user.email, 'Role actual:', user.role);

        // 5. Verificar si el role ya es el mismo
        if (user.role === role) {
            console.log('ℹ️ Role ya es el mismo:', role);
            return NextResponse.json({
                success: true,
                message: 'Role ya está configurado correctamente',
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                }
            });
        }

        // 6. Actualizar role del usuario
        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: { role },
            select: {
                id: true,
                email: true,
                role: true,
                updatedAt: true,
            }
        });

        console.log('✅ Role actualizado exitosamente:');
        console.log('   - Usuario:', updatedUser.email);
        console.log('   - Role anterior:', user.role);
        console.log('   - Role nuevo:', updatedUser.role);
        console.log('   - Actualizado:', updatedUser.updatedAt);

        // 7. Verificar que se actualizó correctamente
        const verificationUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true }
        });

        if (verificationUser && verificationUser.role === role) {
            console.log('✅ Verificación: Role actualizado correctamente en BD');
        } else {
            console.log('❌ Verificación: Role NO se actualizó correctamente');
            return NextResponse.json({ error: 'Error actualizando role' }, { status: 500 });
        }

        // 8. Retornar respuesta exitosa
        const responseData = {
            success: true,
            message: `Role actualizado a ${role}`,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                updatedAt: updatedUser.updatedAt,
            },
        };

        console.log('📤 Enviando respuesta exitosa');
        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('❌ Error en API auth/update-role:', error);
        console.error('❌ Stack trace:', error.stack);

        if (error instanceof z.ZodError) {
            console.log('📋 Errores de validación:', error.errors);
            return NextResponse.json({
                error: 'Datos inválidos',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            }, { status: 400 });
        }

        // Error de Prisma
        if (error.code) {
            console.log('🗄️ Error de Prisma:', error.code, error.message);
            return NextResponse.json({
                error: 'Error de base de datos',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
            }, { status: 500 });
        }

        return NextResponse.json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Error inesperado'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

// Para debug - endpoint GET
export async function GET() {
    console.log('🔍 GET /api/auth/update-role - endpoint de debug');
    return NextResponse.json({
        message: 'API endpoint funcionando',
        timestamp: new Date().toISOString()
    });
}