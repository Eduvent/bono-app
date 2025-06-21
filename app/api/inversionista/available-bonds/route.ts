import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BondStatus } from '../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validación para query parameters
const QuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().optional(),
    emisor: z.string().optional(),
    minTasa: z.coerce.number().min(0).max(1).optional(),
    maxTasa: z.coerce.number().min(0).max(1).optional(),
    minPlazo: z.coerce.number().int().min(1).optional(),
    maxPlazo: z.coerce.number().int().min(1).optional(),
    sortBy: z.enum(['tasaAnual', 'numAnios', 'valorNominal', 'fechaEmision']).default('fechaEmision'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Obteniendo bonos disponibles para inversión');

        const searchParams = new URL(request.url).searchParams;
        const { 
            limit, 
            offset, 
            search, 
            emisor, 
            minTasa, 
            maxTasa, 
            minPlazo, 
            maxPlazo,
            sortBy,
            sortOrder
        } = QuerySchema.parse({
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
            search: searchParams.get('search') ?? undefined,
            emisor: searchParams.get('emisor') ?? undefined,
            minTasa: searchParams.get('minTasa') ?? undefined,
            maxTasa: searchParams.get('maxTasa') ?? undefined,
            minPlazo: searchParams.get('minPlazo') ?? undefined,
            maxPlazo: searchParams.get('maxPlazo') ?? undefined,
            sortBy: searchParams.get('sortBy') ?? undefined,
            sortOrder: searchParams.get('sortOrder') ?? undefined,
        });

        // 1. Construir filtros de búsqueda
        const whereClause: any = {
            status: BondStatus.ACTIVE, // Solo bonos activos
        };

        // Filtro de búsqueda por nombre o código ISIN
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { codigoIsin: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Filtro por emisor
        if (emisor) {
            whereClause.emisor = {
                OR: [
                    { companyName: { contains: emisor, mode: 'insensitive' } },
                    { ruc: { contains: emisor, mode: 'insensitive' } },
                ],
            };
        }

        // Filtros de tasa de interés
        if (minTasa !== undefined || maxTasa !== undefined) {
            whereClause.tasaAnual = {};
            if (minTasa !== undefined) whereClause.tasaAnual.gte = minTasa;
            if (maxTasa !== undefined) whereClause.tasaAnual.lte = maxTasa;
        }

        // Filtros de plazo
        if (minPlazo !== undefined || maxPlazo !== undefined) {
            whereClause.numAnios = {};
            if (minPlazo !== undefined) whereClause.numAnios.gte = minPlazo;
            if (maxPlazo !== undefined) whereClause.numAnios.lte = maxPlazo;
        }

        // 2. Construir ordenamiento
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        // 3. Obtener bonos con paginación y datos relacionados
        const [bonds, totalCount] = await Promise.all([
            prisma.bond.findMany({
                where: whereClause,
                include: {
                    emisor: {
                        select: {
                            id: true,
                            companyName: true,
                            ruc: true,
                            industry: true,
                        }
                    },
                    financialMetrics: {
                        where: { role: 'BONISTA' },
                        select: {
                            precioActual: true,
                            trea: true,
                            van: true,
                            duracion: true,
                            convexidad: true,
                            utilidadPerdida: true,
                        }
                    },
                    costs: {
                        select: {
                            bonistaTotalAbs: true,
                            totalCostsAbs: true,
                        }
                    }
                },
                orderBy,
                take: limit,
                skip: offset,
            }),
            prisma.bond.count({ where: whereClause }),
        ]);

        console.log('📊 Bonos disponibles encontrados:', bonds.length, 'de', totalCount);

        // 4. Calcular métricas agregadas
        const totalNominalValue = bonds.reduce((sum, bond) => 
            sum + bond.valorNominal.toNumber(), 0
        );
        const averageRate = bonds.length > 0 
            ? bonds.reduce((sum, bond) => sum + bond.tasaAnual.toNumber(), 0) / bonds.length
            : 0;
        const averageTerm = bonds.length > 0
            ? bonds.reduce((sum, bond) => sum + bond.numAnios, 0) / bonds.length
            : 0;

        // 5. Formatear respuesta
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
                fechaEmision: bond.fechaEmision.toISOString().split('T')[0],
                fechaVencimiento: bond.fechaVencimiento.toISOString().split('T')[0],
                frecuenciaCupon: bond.frecuenciaCupon,
                tipoTasa: bond.tipoTasa,
                tasaAnual: bond.tasaAnual.toNumber(),
                primaVencimiento: bond.primaVencimiento.toNumber(),
                impuestoRenta: bond.impuestoRenta.toNumber(),
                baseDias: bond.baseDias,
                // Datos del emisor
                emisor: {
                    id: bond.emisor.id,
                    companyName: bond.emisor.companyName,
                    ruc: bond.emisor.ruc,
                    industry: bond.emisor.industry,
                },
                // Métricas financieras del bonista
                financialMetrics: bond.financialMetrics[0] ? {
                    precioActual: bond.financialMetrics[0].precioActual.toNumber(),
                    trea: bond.financialMetrics[0].trea?.toNumber() || null,
                    van: bond.financialMetrics[0].van.toNumber(),
                    duracion: bond.financialMetrics[0].duracion.toNumber(),
                    convexidad: bond.financialMetrics[0].convexidad.toNumber(),
                    utilidadPerdida: bond.financialMetrics[0].utilidadPerdida.toNumber(),
                } : null,
                // Costes para el bonista
                costs: bond.costs ? {
                    bonistaTotalAbs: bond.costs.bonistaTotalAbs.toNumber(),
                    totalCostsAbs: bond.costs.totalCostsAbs.toNumber(),
                } : null,
                // Cálculos adicionales
                yieldToMaturity: bond.financialMetrics[0]?.trea?.toNumber() || null,
                duration: bond.financialMetrics[0]?.duracion.toNumber() || null,
                convexity: bond.financialMetrics[0]?.convexidad.toNumber() || null,
                // Indicadores de atractivo
                isAttractive: bond.financialMetrics[0]?.trea && 
                    bond.financialMetrics[0].trea.toNumber() > 0.05, // 5% mínimo
                riskLevel: bond.financialMetrics[0]?.duracion ? 
                    (bond.financialMetrics[0].duracion.toNumber() > 5 ? 'HIGH' : 
                     bond.financialMetrics[0].duracion.toNumber() > 3 ? 'MEDIUM' : 'LOW') : 'UNKNOWN',
            })),
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            metrics: {
                totalBonds: totalCount,
                totalNominalValue,
                averageRate,
                averageTerm,
                averageDuration: bonds.length > 0 
                    ? bonds.reduce((sum, bond) => 
                        sum + (bond.financialMetrics[0]?.duracion.toNumber() || 0), 0) / bonds.length
                    : 0,
                averageYield: bonds.length > 0
                    ? bonds.reduce((sum, bond) => 
                        sum + (bond.financialMetrics[0]?.trea?.toNumber() || 0), 0) / bonds.length
                    : 0,
            },
            filters: {
                applied: {
                    search: search || null,
                    emisor: emisor || null,
                    minTasa: minTasa || null,
                    maxTasa: maxTasa || null,
                    minPlazo: minPlazo || null,
                    maxPlazo: maxPlazo || null,
                },
                sortBy,
                sortOrder,
            },
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Error obteniendo bonos disponibles:', error);

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
    } finally {
        await prisma.$disconnect();
    }
} 