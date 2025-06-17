// app/api/bonds/[bondId]/flows/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../../lib/generated/client'
import { CashFlowModel } from '@/lib/models/CashFlow';
import { BondCalculationsService } from '@/lib/services/bonds/BondCalculations';
import { z } from 'zod';

/**
 * API para obtener flujos de caja de un bono
 *
 * GET /api/bonds/[bondId]/flows?role=emisor|inversionista&period_from=0&period_to=10&format=json|csv
 * - Obtiene flujos de caja segmentados por rol
 * - Permite filtrar por rango de períodos
 * - Soporta exportación a CSV
 */

const prisma = new PrismaClient();
const cashFlowModel = new CashFlowModel(prisma);
const calculationsService = new BondCalculationsService(prisma);

// Esquema de validación para parámetros
const ParamsSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
});

// Esquema de validación para query parameters
const QuerySchema = z.object({
    role: z.enum(['emisor', 'inversionista']).default('inversionista'),
    period_from: z.coerce.number().int().min(0).optional(),
    period_to: z.coerce.number().int().min(0).optional(),
    format: z.enum(['json', 'csv']).default('json'),
    auto_calculate: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),
});

export async function GET(
    request: NextRequest,
    { params }: { params: { bondId: string } }
) {
    try {
        // 1. Validar parámetros
        const { bondId } = ParamsSchema.parse(params);

        const searchParams = new URL(request.url).searchParams;
        const { role, period_from, period_to, format, auto_calculate } = QuerySchema.parse({
            role: searchParams.get('role') ?? undefined,
            period_from: searchParams.get('period_from') ?? undefined,
            period_to: searchParams.get('period_to') ?? undefined,
            format: searchParams.get('format') ?? undefined,
            auto_calculate: searchParams.get('auto_calculate') ?? undefined,
        });

        // 2. Verificar que el bono existe
        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            select: {
                id: true,
                name: true,
                status: true,
                emisorId: true,
            },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        // 3. Verificar permisos basados en rol
        // TODO: Implementar autenticación y verificar que:
        // - Si role=emisor, el usuario debe ser el emisor del bono
        // - Si role=inversionista, el usuario debe tener acceso a ver el bono

        // 4. Verificar si existen flujos de caja
        const hasFlows = await cashFlowModel.hasFlows(bondId);

        if (!hasFlows && auto_calculate) {
            console.log(`📊 No hay flujos para bono ${bond.name}, calculando automáticamente...`);

            const calcResult = await calculationsService.calculateBond({
                bondId,
                recalculate: false,
                saveResults: true,
            });

            if (!calcResult.success) {
                return NextResponse.json(
                    {
                        error: 'No se pudieron calcular los flujos de caja',
                        code: 'CALCULATION_FAILED',
                        details: calcResult.errors,
                    },
                    { status: 500 }
                );
            }
        } else if (!hasFlows) {
            return NextResponse.json(
                {
                    error: 'No hay flujos de caja calculados para este bono',
                    code: 'NO_FLOWS_CALCULATED',
                    bondId,
                    bondName: bond.name,
                    suggestion: 'Ejecute POST /api/bonds/' + bondId + '/calculate primero',
                },
                { status: 404 }
            );
        }

        // 5. Obtener flujos según el rol
        let flows;

        if (period_from !== undefined || period_to !== undefined) {
            // Flujos por rango
            const from = period_from || 0;
            const to = period_to || 999; // Número alto para incluir todos
            flows = await cashFlowModel.getFlowsByRange(bondId, from, to, role);
        } else {
            // Todos los flujos
            if (role === 'emisor') {
                flows = await cashFlowModel.getEmisorView(bondId);
            } else {
                flows = await cashFlowModel.getInversionistaView(bondId);
            }
        }

        // 6. Obtener resumen de flujos
        const summary = await cashFlowModel.getSummary(bondId);

        // 7. Retornar según formato solicitado
        if (format === 'csv') {
            const csvData = await cashFlowModel.exportToCSV(bondId, role);

            return new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="flujos_${bond.name}_${role}.csv"`,
                },
            });
        }

        // Formato JSON (por defecto)
        return NextResponse.json({
            success: true,
            bondId,
            bondName: bond.name,
            bondStatus: bond.status,
            role,
            summary: {
                totalPeriods: summary?.totalPeriodos || 0,
                dateRange: summary ? {
                    start: summary.fechaInicio,
                    end: summary.fechaFin,
                } : null,
                totals: summary ? {
                    emisorFlow: summary.totalFlujoEmisor,
                    bonistaFlow: summary.totalFlujoBonista,
                } : null,
                lastUpdated: summary?.ultimaActualizacion || null,
            },
            filters: {
                periodFrom: period_from,
                periodTo: period_to,
                appliedFilters: flows.length !== (summary?.totalPeriodos || 0) + 1, // +1 por período 0
            },
            flows,
            metadata: {
                flowsCount: flows.length,
                columnsShown: role === 'emisor'
                    ? ['periodo', 'fecha', 'inflacionAnual', 'bonoIndexado', 'cupon', 'amortizacion', 'escudoFiscal', 'flujoEmisor', 'flujoEmisorConEscudo']
                    : ['periodo', 'fecha', 'inflacionAnual', 'bonoIndexado', 'cupon', 'flujoBonista', 'flujoActualizado'],
                currency: 'USD', // TODO: Obtener de configuración del bono
                generatedAt: new Date(),
            },
        });

    } catch (error) {
        console.error('Error obteniendo flujos de caja:', error);

        // Manejar errores de validación
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Parámetros inválidos',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Error genérico
        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                code: 'INTERNAL_ERROR',
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/bonds/[bondId]/flows
 * - Recalcula flujos de caja forzosamente
 * - Útil cuando se necesita refresh manual
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { bondId: string } }
) {
    try {
        const { bondId } = ParamsSchema.parse(params);

        // Verificar que el bono existe
        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            select: { id: true, name: true, status: true },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Verificar que el bono se puede calcular
        if (bond.status === 'EXPIRED') {
            return NextResponse.json(
                { error: 'No se pueden recalcular flujos de bonos vencidos', code: 'BOND_EXPIRED' },
                { status: 400 }
            );
        }

        console.log(`🔄 Recalculando flujos para bono ${bond.name}...`);

        // Forzar recálculo
        const result = await calculationsService.calculateBond({
            bondId,
            recalculate: true,
            saveResults: true,
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Error recalculando flujos',
                    code: 'RECALCULATION_FAILED',
                    details: result.errors,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            bondId,
            bondName: bond.name,
            message: 'Flujos recalculados exitosamente',
            flowsCount: result.flowsCount,
            calculatedAt: result.calculatedAt,
            metricas: result.metricas,
        });

    } catch (error) {
        console.error('Error recalculando flujos:', error);

        return NextResponse.json(
            { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}

// Cerrar conexión de Prisma al finalizar
if (process.env.NODE_ENV !== 'development') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}