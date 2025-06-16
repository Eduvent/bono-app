// app/api/emisor/[emisorId]/bonds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../../lib/generated/client';
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
    { params }: { params: { emisorId: string } }
) {
    try {
        // 1. Validar parámetros
        const { emisorId } = ParamsSchema.parse(params);

        const searchParams = new URL(request.url).searchParams;
        const { status, limit, offset, search } = QuerySchema.parse({
            status: searchParams.get('status'),
            limit: searchParams.get('limit'),
            offset: searchParams.get('offset'),
            search: searchParams.get('search'),
        });

        // 2. Verificar que el emisor existe
        const emisor = await prisma.emisorProfile.findUnique({
            where: { id: emisorId },
            select: { id: true, companyName: true },
        });

        if (!emisor) {
            return NextResponse.json(
                { error: 'Emisor no encontrado', code: 'EMISOR_NOT_FOUND' },
                { status: 404 }
            );
        }

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

        // 4. Obtener bonos con información relacionada
        const [bonds, totalCount] = await Promise.all([
            prisma.bond.findMany({
                where: whereClause,
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    costs: {
                        select: {
                            estructuracionPorcentaje: true,
                            colocacionPorcentaje: true,
                            flotacionPorcentaje: true,
                            cavaliPorcentaje: true,
                        },
                    },
                    metrics: {
                        select: {
                            tceaEmisor: true,
                            treaBonista: true,
                            van: true,
                            duracion: true,
                            duracionModificada: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    _count: {
                        select: {
                            cashFlows: true,
                            investments: true,
                        },
                    },
                },
            }),
            prisma.bond.count({ where: whereClause }),
        ]);

        // 5. Transformar datos para el frontend
        const bondsFormatted = bonds.map((bond) => ({
            id: bond.id,
            name: bond.name,
            codigoIsin: bond.codigoIsin,
            status: bond.status,
            createdAt: bond.createdAt.toISOString(),
            updatedAt: bond.updatedAt.toISOString(),

            // Valores financieros básicos
            nominalValue: Number(bond.valorNominal),
            commercialValue: Number(bond.valorComercial),
            years: bond.numAnios,
            couponFrequency: bond.frecuenciaCupon,

            // Métricas financieras (si existen)
            tceaEmisor: bond.metrics?.[0]?.tceaEmisor ? Number(bond.metrics[0].tceaEmisor) : null,
            treaBonista: bond.metrics?.[0]?.treaBonista ? Number(bond.metrics[0].treaBonista) : null,
            van: bond.metrics?.[0]?.van ? Number(bond.metrics[0].van) : null,
            duracion: bond.metrics?.[0]?.duracion ? Number(bond.metrics[0].duracion) : null,

            // Contadores
            flowsCount: bond._count.cashFlows,
            investorsCount: bond._count.investments,

            // Estados derivados
            hasFlows: bond._count.cashFlows > 0,
            isPublished: bond.status === 'ACTIVE',
            hasMetrics: (bond.metrics?.length || 0) > 0,
        }));

        // 6. Calcular métricas agregadas
        const metrics = {
            totalBonds: totalCount,
            activeBonds: bonds.filter(b => b.status === 'ACTIVE').length,
            draftBonds: bonds.filter(b => b.status === 'DRAFT').length,
            pausedBonds: bonds.filter(b => b.status === 'PAUSED').length,
            completedBonds: bonds.filter(b => b.status === 'COMPLETED').length,

            totalNominalValue: bonds.reduce((sum, b) => sum + Number(b.valorNominal), 0),
            totalCommercialValue: bonds.reduce((sum, b) => sum + Number(b.valorComercial), 0),

            bondsWithFlows: bonds.filter(b => b._count.cashFlows > 0).length,
            bondsWithMetrics: bonds.filter(b => (b.metrics?.length || 0) > 0).length,

            // TCEA promedio (solo bonos con métricas)
            averageTCEA: (() => {
                const bondsWithTCEA = bonds.filter(b => b.metrics?.[0]?.tceaEmisor);
                if (bondsWithTCEA.length === 0) return null;
                return bondsWithTCEA.reduce((sum, b) => sum + Number(b.metrics![0].tceaEmisor!), 0) / bondsWithTCEA.length;
            })(),
        };

        return NextResponse.json({
            success: true,
            emisor: {
                id: emisor.id,
                companyName: emisor.companyName,
            },
            bonds: bondsFormatted,
            metrics,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
        });

    } catch (error) {
        console.error('❌ Error obteniendo bonos del emisor:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Parámetros inválidos',
                    code: 'INVALID_PARAMS',
                    details: error.errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// POST - Crear nuevo bono (redireccionar a API principal)
export async function POST(
    request: NextRequest,
    { params }: { params: { emisorId: string } }
) {
    try {
        const { emisorId } = ParamsSchema.parse(params);
        const body = await request.json();

        // Agregar emisorId al body y redirigir a la API principal
        const bondData = { ...body, emisorId };

        // Hacer request interno a la API principal de bonos
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/bonds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bondData),
        });

        const result = await response.json();

        if (!response.ok) {
            return NextResponse.json(result, { status: response.status });
        }

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error('❌ Error creando bono:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Parámetros inválidos',
                    code: 'INVALID_PARAMS',
                    details: error.errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}