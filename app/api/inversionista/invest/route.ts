import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BondStatus, InvestmentStatus } from '../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validación para el request body
const InvestRequestSchema = z.object({
    inversionistaId: z.string().cuid('ID de inversionista inválido'),
    bondId: z.string().cuid('ID de bono inválido'),
    montoInvertido: z.number().positive('El monto debe ser positivo'),
    precioCompra: z.number().positive('El precio debe ser positivo').optional(),
    fechaInversion: z.string().datetime().optional(), // ISO string
});

export async function POST(request: NextRequest) {
    try {
        console.log('💰 Procesando nueva inversión');

        // 1. Validar request body
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({
                error: 'Cuerpo de request inválido',
                code: 'INVALID_BODY',
            }, { status: 400 });
        }

        const { inversionistaId, bondId, montoInvertido, precioCompra, fechaInversion } = 
            InvestRequestSchema.parse(body);

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
            return NextResponse.json({
                error: 'Inversionista no encontrado',
                code: 'INVERSIONISTA_NOT_FOUND',
            }, { status: 404 });
        }

        // 3. Verificar que el bono existe y está activo
        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            include: {
                emisor: {
                    select: {
                        id: true,
                        companyName: true,
                    }
                },
                financialMetrics: {
                    where: { role: 'BONISTA' },
                    select: {
                        precioActual: true,
                        trea: true,
                    }
                }
            },
        });

        if (!bond) {
            console.log('❌ Bono no encontrado:', bondId);
            return NextResponse.json({
                error: 'Bono no encontrado',
                code: 'BOND_NOT_FOUND',
            }, { status: 404 });
        }

        if (bond.status !== BondStatus.ACTIVE) {
            console.log('❌ Bono no está activo:', bondId, bond.status);
            return NextResponse.json({
                error: 'El bono no está disponible para inversión',
                code: 'BOND_NOT_ACTIVE',
            }, { status: 400 });
        }

        // 4. Verificar que el inversionista no ya invirtió en este bono
        const existingInvestment = await prisma.userInvestment.findUnique({
            where: {
                userId_bondId: {
                    userId: inversionista.userId,
                    bondId: bondId,
                }
            },
        });

        if (existingInvestment) {
            console.log('❌ Inversión ya existe:', existingInvestment.id);
            return NextResponse.json({
                error: 'Ya tienes una inversión en este bono',
                code: 'INVESTMENT_ALREADY_EXISTS',
            }, { status: 400 });
        }

        // 5. Calcular precio de compra si no se proporciona
        let precioCompraFinal = precioCompra;
        if (!precioCompraFinal) {
            precioCompraFinal = bond.financialMetrics[0]?.precioActual.toNumber() || 100;
        }

        // 6. Calcular ganancia no realizada inicial (0 al momento de la compra)
        const gananciaNoRealizada = 0;
        const rendimientoActual = 0;

        // 7. Crear la inversión en una transacción
        const investment = await prisma.$transaction(async (tx) => {
            // Crear la inversión
            const newInvestment = await tx.userInvestment.create({
                data: {
                    userId: inversionista.userId,
                    bondId: bondId,
                    montoInvertido: montoInvertido,
                    fechaInversion: fechaInversion ? new Date(fechaInversion) : new Date(),
                    precioCompra: precioCompraFinal,
                    status: InvestmentStatus.ACTIVE,
                    gananciaNoRealizada: gananciaNoRealizada,
                    rendimientoActual: rendimientoActual,
                },
                include: {
                    bond: {
                        include: {
                            emisor: {
                                select: {
                                    id: true,
                                    companyName: true,
                                    ruc: true,
                                }
                            }
                        }
                    }
                }
            });

            // Crear log de auditoría
            await tx.auditLog.create({
                data: {
                    userId: inversionista.userId,
                    tableName: 'user_investments',
                    recordId: newInvestment.id,
                    action: 'CREATE',
                    newValues: {
                        bondId: bondId,
                        montoInvertido: montoInvertido,
                        precioCompra: precioCompraFinal,
                        emisor: bond.emisor.companyName,
                        bondName: bond.name,
                    },
                },
            });

            return newInvestment;
        });

        console.log('✅ Inversión creada exitosamente:', investment.id);

        // 8. Calcular métricas actualizadas del inversionista
        const [totalInvestments, totalInvested] = await Promise.all([
            prisma.userInvestment.count({
                where: { 
                    userId: inversionista.userId,
                    status: InvestmentStatus.ACTIVE 
                }
            }),
            prisma.userInvestment.aggregate({
                where: { 
                    userId: inversionista.userId,
                    status: InvestmentStatus.ACTIVE 
                },
                _sum: { montoInvertido: true }
            })
        ]);

        // 9. Formatear respuesta
        const response = {
            success: true,
            investment: {
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
            },
            inversionista: {
                id: inversionista.id,
                name: `${inversionista.firstName} ${inversionista.lastName}`,
            },
            portfolioMetrics: {
                totalInvestments,
                totalInvested: totalInvested._sum.montoInvertido?.toNumber() || 0,
            },
            message: `Inversión exitosa en ${investment.bond.name}`,
            investedAt: new Date().toISOString(),
        };

        return NextResponse.json(response, { status: 201 });

    } catch (error: any) {
        console.error('❌ Error procesando inversión:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Datos de inversión inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR',
            }, { status: 400 });
        }

        // Manejar errores de base de datos específicos
        if (error.code === 'P2002') {
            return NextResponse.json({
                error: 'Ya tienes una inversión en este bono',
                code: 'DUPLICATE_INVESTMENT',
            }, { status: 409 });
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

// GET endpoint para obtener estadísticas de inversión
export async function GET(request: NextRequest) {
    try {
        const searchParams = new URL(request.url).searchParams;
        const inversionistaId = searchParams.get('inversionistaId');

        if (!inversionistaId) {
            return NextResponse.json({
                error: 'ID de inversionista requerido',
                code: 'MISSING_INVERSIONISTA_ID',
            }, { status: 400 });
        }

        // Verificar que el inversionista existe
        const inversionista = await prisma.inversionistaProfile.findUnique({
            where: { id: inversionistaId },
            select: { userId: true },
        });

        if (!inversionista) {
            return NextResponse.json({
                error: 'Inversionista no encontrado',
                code: 'INVERSIONISTA_NOT_FOUND',
            }, { status: 404 });
        }

        // Obtener estadísticas de inversión
        const [totalInvestments, totalInvested, activeInvestments, completedInvestments] = await Promise.all([
            prisma.userInvestment.count({
                where: { userId: inversionista.userId }
            }),
            prisma.userInvestment.aggregate({
                where: { 
                    userId: inversionista.userId,
                    status: InvestmentStatus.ACTIVE 
                },
                _sum: { montoInvertido: true }
            }),
            prisma.userInvestment.count({
                where: { 
                    userId: inversionista.userId,
                    status: InvestmentStatus.ACTIVE 
                }
            }),
            prisma.userInvestment.count({
                where: { 
                    userId: inversionista.userId,
                    status: InvestmentStatus.COMPLETED 
                }
            }),
        ]);

        const totalUnrealizedGain = await prisma.userInvestment.aggregate({
            where: { 
                userId: inversionista.userId,
                status: InvestmentStatus.ACTIVE 
            },
            _sum: { gananciaNoRealizada: true }
        });

        const averageReturn = await prisma.userInvestment.aggregate({
            where: { 
                userId: inversionista.userId,
                status: InvestmentStatus.ACTIVE 
            },
            _avg: { rendimientoActual: true }
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalInvestments,
                activeInvestments,
                completedInvestments,
                totalInvested: totalInvested._sum.montoInvertido?.toNumber() || 0,
                totalUnrealizedGain: totalUnrealizedGain._sum.gananciaNoRealizada?.toNumber() || 0,
                averageReturn: averageReturn._avg.rendimientoActual?.toNumber() || 0,
            },
        });

    } catch (error: any) {
        console.error('❌ Error obteniendo estadísticas de inversión:', error);

        return NextResponse.json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 