import { NextRequest, NextResponse } from 'next/server';

// ✅ LOG: Verificar que el archivo se está cargando
console.log('📁 API Route /api/emisor/profile cargado correctamente');

// Verificar variables de entorno críticas
console.log('🔧 DATABASE_URL disponible:', !!process.env.DATABASE_URL);
console.log('🔧 JWT_SECRET disponible:', !!process.env.JWT_SECRET);

let prisma: any;
let verifyToken: any;

try {
    // Importar Prisma y auth de forma que podamos capturar errores
    const { PrismaClient } = require('../../../../lib/generated/client');
    console.log('✅ PrismaClient importado correctamente');

    prisma = new PrismaClient();
    console.log('✅ Instancia de Prisma creada');

    const authModule = require('@/lib/auth');
    verifyToken = authModule.verifyToken;
    console.log('✅ Módulo auth importado correctamente');

} catch (error) {
    console.error('❌ Error importando dependencias:', error);
}

const { z } = require('zod');

const ProfileSchema = z.object({
    companyName: z.string().min(1, "Nombre de empresa es requerido"),
    ruc: z.string().min(1, "RUC es requerido"),
    sector: z.string().optional(),
    country: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
});

export async function POST(request: NextRequest) {
    console.log('🚀 POST /api/emisor/profile iniciado');
    console.log('📊 Headers:', Object.fromEntries(request.headers.entries()));

    try {
        // Verificar que las dependencias están disponibles
        if (!prisma) {
            console.error('❌ Prisma no está disponible');
            return NextResponse.json({ error: 'Error de configuración: Database' }, { status: 500 });
        }

        if (!verifyToken) {
            console.error('❌ verifyToken no está disponible');
            return NextResponse.json({ error: 'Error de configuración: Auth' }, { status: 500 });
        }

        console.log('✅ Dependencias verificadas');

        // 1. Verificar autenticación
        const token = request.cookies.get('token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        console.log('🔑 Token encontrado:', !!token);

        if (!token) {
            console.log('❌ Token no encontrado');
            return NextResponse.json({ error: 'No autorizado - Token requerido' }, { status: 401 });
        }

        let payload;
        try {
            payload = verifyToken(token);
            console.log('✅ Token verificado, userId:', payload?.userId);
        } catch (tokenError) {
            console.error('❌ Error verificando token:', tokenError);
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        if (!payload || !payload.userId) {
            console.log('❌ Token sin userId válido');
            return NextResponse.json({ error: 'No autorizado - Token inválido' }, { status: 401 });
        }

        // 2. Obtener y validar datos del formulario
        const body = await request.json();
        console.log('📥 Datos recibidos:', JSON.stringify(body, null, 2));

        const data = ProfileSchema.parse(body);
        console.log('✅ Datos validados correctamente');

        // 3. Verificar conexión a base de datos
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
            select: { id: true, email: true, role: true }
        });

        if (!user) {
            console.log('❌ Usuario no encontrado:', payload.userId);
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if (user.role !== 'EMISOR') {
            console.log('❌ Usuario no es emisor:', user.role);
            return NextResponse.json({ error: 'Usuario debe ser emisor' }, { status: 403 });
        }

        console.log('✅ Usuario verificado como emisor');

        // 5. Crear o actualizar perfil emisor
        const profileData = {
            companyName: data.companyName,
            ruc: data.ruc,
            industry: data.sector || 'No especificado',
            address: data.country || 'No especificado',
            contactPerson: data.companyName,
            phone: null,
        };

        console.log('💾 Creando perfil con datos:', JSON.stringify(profileData, null, 2));

        const profile = await prisma.emisorProfile.upsert({
            where: { userId: payload.userId },
            update: profileData,
            create: {
                userId: payload.userId,
                ...profileData,
            },
        });

        console.log('✅ Perfil creado exitosamente:', profile.id);

        const responseData = {
            success: true,
            profile: {
                id: profile.id,
                companyName: profile.companyName,
                ruc: profile.ruc,
                industry: profile.industry,
                address: profile.address,
            },
        };

        console.log('📤 Enviando respuesta exitosa');
        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('❌ Error en API emisor/profile:', error);
        console.error('❌ Stack trace:', error.stack);

        if (error instanceof z.ZodError) {
            console.log('📋 Errores de validación:', error.errors);
            return NextResponse.json({
                error: 'Datos inválidos',
                details: error.errors
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Error interno del servidor',
            message: error.message
        }, { status: 500 });
    }
}