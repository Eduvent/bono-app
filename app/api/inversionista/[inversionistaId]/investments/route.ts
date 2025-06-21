import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, InvestmentStatus } from '../../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validación para parámetros
const ParamsSchema = z.object({
    inversionistaId: z.string().cuid('ID de inversionista inválido'),
});

// Schema de validación para query parameters
const QuerySchema = z.object({
    status: z.enum(['active', 'completed', 'cancelled']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().optional(),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ inversionistaId: string }> }
) {
    try {
        // 1. Await params (Next.js 15 cambio)
        const resolvedParams = await params;
        const { inversionistaId } = ParamsSchema.parse(resolvedParams);

        console.log('🔍 Obteniendo inversiones para inversionista:', inversionistaId);

        const searchParams = new URL(request.url).searchParams;
        const { status, limit, offset, search } = QuerySchema.parse({
            status: searchParams.get('status') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            offset: searchParams.get('offset') ?? undefined,
            search: searchParams.get('search') ?? undefined,
        });

        // 2. Verificar que el inversionista existe
        const inversionista = await prisma.inversionistaProfile.findUnique({
            where: { id: inversionistaId },
            select: { 
                id: true, 
                firstName: true, 
                lastName: true,
                userId: true 
            },
        });

        if (!inversionista) {
            console.log('❌ Inversionista no encontrado:', inversionistaId);
            return NextResponse.json(
                { error: 'Inversionista no encontrado', code: 'INVERSIONISTA_NOT_FOUND' },
                { status: 404 }
            );
        }

        console.log('✅ Inversionista encontrado:', `${inversionista.firstName} ${inversionista.lastName}`);

        // 3. Construir filtros de búsqueda
        const whereClause: any = {
            userId: inversionista.userId, // Usar userId del perfil
        };

        if (status) {
            whereClause.status = status.toUpperCase() as InvestmentStatus;
        }

        if (search) {
            whereClause.bond = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { codigoIsin: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        // 4. Obtener inversiones con paginación y datos relacionados
        const [investments, totalCount] = await Promise.all([
            prisma.userInvestment.findMany({
                where: whereClause,
                include: {
                    bond: {
                        include: {
                            emisor: {
                                select: {
                                    id: true,
                                    companyName: true,
                                    ruc: true,
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
                                }
                            }
                        }
                    }
                },
                orderBy: { fechaInversion: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.userInvestment.count({ where: whereClause }),
        ]);

        console.log('📊 Inversiones encontradas:', investments.length, 'de', totalCount);

        // 5. Calcular métricas agregadas
        const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE');
        const totalInvested = activeInvestments.reduce((sum, inv) => 
            sum + inv.montoInvertido.toNumber(), 0
        );
        const totalUnrealizedGain = activeInvestments.reduce((sum, inv) => 
            sum + inv.gananciaNoRealizada.toNumber(), 0
        );

        // 6. Formatear respuesta
        const response = {
            success: true,
            investments: investments.map(investment => ({
                id: investment.id,
                bondId: investment.bondId,
                bondName: investment.bond.name,
                bondCode: investment.bond.codigoIsin,
                emisor: {
                    id: investment.bond.emisor.id,
                    companyName: investment.bond.emisor.companyName,
                    ruc: investment.bond.emisor.ruc,
                },
                montoInvertido: investment.montoInvertido.toNumber(),
                fechaInversion: investment.fechaInversion.toISOString().split('T')[0],
                precioCompra: investment.precioCompra.toNumber(),
                status: investment.status,
                gananciaNoRealizada: investment.gananciaNoRealizada.toNumber(),
                rendimientoActual: investment.rendimientoActual.toNumber(),
                // Datos del bono
                valorNominal: investment.bond.valorNominal.toNumber(),
                tasaAnual: investment.bond.tasaAnual.toNumber(),
                frecuenciaCupon: investment.bond.frecuenciaCupon,
                fechaVencimiento: investment.bond.fechaVencimiento.toISOString().split('T')[0],
                // Métricas financieras del bonista
                precioActual: investment.bond.financialMetrics[0]?.precioActual.toNumber() || null,
                trea: investment.bond.financialMetrics[0]?.trea?.toNumber() || null,
                van: investment.bond.financialMetrics[0]?.van.toNumber() || null,
                duracion: investment.bond.financialMetrics[0]?.duracion.toNumber() || null,
                convexidad: investment.bond.financialMetrics[0]?.convexidad.toNumber() || null,
            })),
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            metrics: {
                totalInvestments: totalCount,
                activeInvestments: activeInvestments.length,
                totalInvested,
                totalUnrealizedGain,
                averageReturn: activeInvestments.length > 0 
                    ? activeInvestments.reduce((sum, inv) => sum + inv.rendimientoActual.toNumber(), 0) / activeInvestments.length
                    : 0,
            },
            inversionista: {
                id: inversionista.id,
                name: `${inversionista.firstName} ${inversionista.lastName}`,
            },
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Error obteniendo inversiones del inversionista:', error);

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