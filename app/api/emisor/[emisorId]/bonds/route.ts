// app/api/emisor/[emisorId]/bonds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, MetricsRole } from '../../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validación para parámetros
const ParamsSchema = z.object({
    emisorId: z.string().cuid('ID de emisor inválido'),
});

// Schema de validación para query parameters
const QuerySchema = z.object({
    status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ emisorId: string }> } // ← FIX: params es Promise en Next.js 15
) {
    try {
        // 1. Await params (Next.js 15 cambio)
        const resolvedParams = await params;
        const { emisorId } = ParamsSchema.parse(resolvedParams);

        console.log('🔍 Obteniendo bonos para emisor:', emisorId);

        const searchParams = new URL(request.url).searchParams;
        const { status, limit, offset, search } = QuerySchema.parse({
            status: searchParams.get('status') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
            search: searchParams.get('search') ?? undefined,
        });

        // 2. Verificar que el emisor existe
        const emisor = await prisma.emisorProfile.findUnique({
            where: { id: emisorId },
            select: { id: true, companyName: true },
        });

        if (!emisor) {
            console.log('❌ Emisor no encontrado:', emisorId);
            return NextResponse.json(
                { error: 'Emisor no encontrado', code: 'EMISOR_NOT_FOUND' },
                { status: 404 }
            );
        }

        console.log('✅ Emisor encontrado:', emisor.companyName);

        // 3. Construir filtros de búsqueda
        const whereClause: any = {
            emisorId: emisorId,
        };

        if (status) {
            whereClause.status = status.toUpperCase();
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { codigoIsin: { contains: search, mode: 'insensitive' } },
            ];
        }

        // 4. Obtener bonos con paginación
        const [bonds, totalCount] = await Promise.all([
            prisma.bond.findMany({
                where: whereClause,
                include: {
                    financialMetrics: {
                        where: { role: MetricsRole.EMISOR },
                        select: { tcea: true, van: true, duracion: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.bond.count({ where: whereClause }),
        ]);

        console.log('📊 Bonos encontrados:', bonds.length, 'de', totalCount);

        // 5. Formatear respuesta sin contenedor "data"
        const response = {
            success: true,
            bonds: bonds.map(bond => ({
                id: bond.id,
                name: bond.name,
                codigoIsin: bond.codigoIsin,
                status: bond.status,
                valorNominal: bond.valorNominal.toNumber(),
                valorComercial: bond.valorComercial.toNumber(),
                numAnios: bond.numAnios,
                fechaEmision: bond.fechaEmision,
                fechaVencimiento: bond.fechaVencimiento,
                frecuenciaCupon: bond.frecuenciaCupon,
                tipoTasa: bond.tipoTasa,
                tasaAnual: bond.tasaAnual.toNumber(),
                createdAt: bond.createdAt,
                updatedAt: bond.updatedAt,
                tceaEmisor: bond.financialMetrics[0]?.tcea?.toNumber() ?? null,
                van: bond.financialMetrics[0]?.van?.toNumber() ?? null,
                duracion: bond.financialMetrics[0]?.duracion?.toNumber() ?? null,
            })),
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            emisor: {
                id: emisor.id,
                companyName: emisor.companyName,
            },
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Error obteniendo bonos del emisor:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Parámetros inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR',
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        }, { status: 500 });
    }
}