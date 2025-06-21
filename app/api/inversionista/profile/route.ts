// app/api/inversionista/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

console.log('🟢 API Route /api/inversionista/profile CARGADO');

const prisma = new PrismaClient();

// Schema de validación para perfil de inversionista
const InversionistaProfileSchema = z.object({
    name: z.string().min(1, "Nombre es requerido"),
    country: z.string().min(1, "País es requerido"),
    investorType: z.string().optional(),
    currency: z.string().optional(),
    interests: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
    console.log('🟢 POST /api/inversionista/profile EJECUTADO');

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

        // 2. Validar datos del formulario
        const body = await request.json();
        console.log('📥 Datos recibidos:', JSON.stringify(body, null, 2));

        const data = InversionistaProfileSchema.parse(body);
        console.log('✅ Datos validados correctamente');

        // 3. Conectar a base de datos
        try {
            await prisma.$connect();
            console.log('✅ Conectado a base de datos');
        } catch (dbError) {
            console.error('❌ Error conectando a BD:', dbError);
            return NextResponse.json({ error: 'Error de conexión a base de datos' }, { status: 500 });
        }

        // 4. Verificar que el usuario existe y es inversionista
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado:', payload.userId);
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if (user.role !== 'INVERSIONISTA') {
            console.log('❌ Usuario no es inversionista:', user.role);
            return NextResponse.json({ error: 'Usuario debe ser inversionista' }, { status: 403 });
        }

        console.log('✅ Usuario verificado como inversionista');

        // 5. Preparar datos para guardar
        // Dividir el nombre en firstName y lastName
        const nameParts = data.name.trim().split(' ');
        const firstName = nameParts[0] || data.name;
        const lastName = nameParts.slice(1).join(' ') || 'N/A';

        const profileData = {
            firstName,
            lastName,
            phone: null, // Por ahora null, se puede agregar campo en formulario
            investmentProfile: data.investorType || 'individual',
            riskTolerance: data.investorType === 'institutional' ? 0.7 :
                data.investorType === 'advisor' ? 0.5 : 0.3, // Tolerancia por defecto
            // Campos adicionales como JSON si necesitas almacenar más datos
        };

        console.log('💾 Datos a guardar:', JSON.stringify(profileData, null, 2));

        // 6. Verificar si ya existe un perfil
        const existingProfile = await prisma.inversionistaProfile.findUnique({
            where: { userId: payload.userId }
        });

        if (existingProfile) {
            console.log('📝 Perfil existente encontrado, actualizando...');
        } else {
            console.log('➕ Creando nuevo perfil...');
        }

        // 7. Crear o actualizar perfil inversionista
        const profile = await prisma.inversionistaProfile.upsert({
            where: { userId: payload.userId },
            update: profileData,
            create: {
                userId: payload.userId,
                ...profileData,
            },
        });

        console.log('✅ Perfil guardado exitosamente:');
        console.log('   - ID:', profile.id);
        console.log('   - Nombre:', `${profile.firstName} ${profile.lastName}`);
        console.log('   - Tipo:', profile.investmentProfile);
        console.log('   - Usuario ID:', profile.userId);

        // 8. Verificar que se guardó correctamente
        const savedProfile = await prisma.inversionistaProfile.findUnique({
            where: { id: profile.id }
        });

        if (savedProfile) {
            console.log('✅ Verificación: Perfil encontrado en BD');
        } else {
            console.log('❌ Verificación: Perfil NO encontrado en BD');
        }

        // 9. Retornar respuesta exitosa
        const responseData = {
            success: true,
            profile: {
                id: profile.id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                fullName: `${profile.firstName} ${profile.lastName}`,
                investmentProfile: profile.investmentProfile,
                riskTolerance: profile.riskTolerance.toNumber(),
                // Datos adicionales del formulario para localStorage
                country: data.country,
                currency: data.currency,
                interests: data.interests,
            },
        };

        console.log('📤 Enviando respuesta exitosa');
        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('❌ Error en API inversionista/profile:', error);
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
    console.log('🔍 GET /api/inversionista/profile - endpoint de debug');
    return NextResponse.json({
        message: 'API endpoint funcionando',
        timestamp: new Date().toISOString()
    });
}