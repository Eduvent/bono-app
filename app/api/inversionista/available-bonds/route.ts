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
    sortBy: z.enum(['tasaAnual', 'numAnios', 'valorNominal', 'fechaEmision', 'estimatedTREA', 'couponRate', 'maturityDate']).default('fechaEmision'),
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

        // Obtener el inversionistaId del header de autorización o query param
        const inversionistaId = searchParams.get('inversionistaId');

        // 1. Construir filtros de búsqueda
        const whereClause: any = {
            status: BondStatus.ACTIVE, // Solo bonos activos
        };

        // Excluir bonos que ya han sido comprados por este inversionista
        if (inversionistaId) {
            // Obtener el userId del inversionista
            const inversionista = await prisma.inversionistaProfile.findUnique({
                where: { id: inversionistaId },
                select: { userId: true }
            });

            if (inversionista) {
                // Obtener los IDs de bonos que ya ha comprado este inversionista
                const purchasedBondIds = await prisma.userInvestment.findMany({
                    where: { userId: inversionista.userId },
                    select: { bondId: true }
                });

                if (purchasedBondIds.length > 0) {
                    whereClause.id = {
                        notIn: purchasedBondIds.map(p => p.bondId)
                    };
                }
            }
        }

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
        let orderBy: any = {};
        
        // Mapear campos del frontend a campos de la base de datos
        switch (sortBy) {
            case 'estimatedTREA':
                // Para ordenar por TREA, necesitamos ordenar por el campo de financialMetrics
                orderBy = {
                    financialMetrics: {
                        trea: sortOrder
                    }
                };
                break;
            case 'couponRate':
                orderBy = { tasaAnual: sortOrder };
                break;
            case 'maturityDate':
                orderBy = { fechaVencimiento: sortOrder };
                break;
            default:
                orderBy[sortBy] = sortOrder;
        }

        // 3. Obtener bonos con paginación y datos relacionados
        let bonds;
        let totalCount;

        if (sortBy === 'estimatedTREA') {
            // Para ordenar por TREA, necesitamos una consulta más compleja
            const bondsWithMetrics = await prisma.bond.findMany({
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
                take: limit,
                skip: offset,
            });

            // Ordenar en memoria por TREA
            bonds = bondsWithMetrics.sort((a, b) => {
                const treaA = a.financialMetrics[0]?.trea?.toNumber() || 0;
                const treaB = b.financialMetrics[0]?.trea?.toNumber() || 0;
                return sortOrder === 'desc' ? treaB - treaA : treaA - treaB;
            });

            totalCount = await prisma.bond.count({ where: whereClause });
        } else {
            // Consulta normal para otros campos
            [bonds, totalCount] = await Promise.all([
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
        }

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
                isinCode: bond.codigoIsin,
                issuerName: bond.emisor.companyName,
                issuerIndustry: bond.emisor.industry || 'No especificado',
                nominalValue: bond.valorNominal.toNumber(),
                commercialPrice: bond.valorComercial.toNumber(),
                couponRate: bond.tasaAnual.toNumber(),
                maturityDate: bond.fechaVencimiento.toISOString().split('T')[0],
                issueDate: bond.fechaEmision.toISOString().split('T')[0],
                paymentFrequency: bond.frecuenciaCupon,
                rateType: bond.tipoTasa,
                inflationIndexed: bond.indexadoInflacion,
                inflationRate: bond.inflacionAnual?.toNumber() || 0,
                maturityPremium: bond.primaVencimiento.toNumber(),
                availableAmount: bond.valorNominal.toNumber(), // Asumiendo que todo está disponible
                estimatedTREA: bond.financialMetrics[0]?.trea?.toNumber() || 0,
                daysPerYear: bond.baseDias,
                discountRate: 0.08, // Valor por defecto, debería calcularse
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
            },
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('❌ Error obteniendo bonos disponibles:', error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Parámetros de consulta inválidos',
                    errors: error.errors 
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { 
                success: false, 
                message: 'Error interno del servidor',
                error: error instanceof Error ? error.message : 'Error desconocido'
            },
            { status: 500 }
        );
    }
} 