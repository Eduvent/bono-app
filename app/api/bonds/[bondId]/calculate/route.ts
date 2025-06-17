// app/api/bonds/[bondId]/calculate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../../lib/generated/client'
import { BondCalculationsService } from '@/lib/services/bonds/BondCalculations';
import { z } from 'zod';

/**
 * API para calcular flujos de caja y métricas financieras de un bono
 *
 * POST /api/bonds/[bondId]/calculate
 * - Ejecuta cálculos financieros del bono
 * - Guarda resultados en base de datos
 * - Retorna métricas para emisor e inversionista
 */

const prisma = new PrismaClient();
const calculationsService = new BondCalculationsService(prisma);

// Esquema de validación para el request
const CalculateRequestSchema = z.object({
    recalculate: z.boolean().optional().default(false),
    saveResults: z.boolean().optional().default(true),
    quickMetrics: z.boolean().optional().default(false),
});

// Esquema de validación para parámetros
const ParamsSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        // 1. Validar parámetros de URL (params es Promise en Next.js 15)
        const { bondId } = ParamsSchema.parse(await params);

        // 2. Validar cuerpo del request
        let body;
        try {
            body = await request.json();
        } catch {
            body = {}; // Body vacío es válido
        }

        const { recalculate, saveResults, quickMetrics } = CalculateRequestSchema.parse(body);

        // 3. Verificar que el bono existe
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

        // 4. Verificar permisos (TODO: implementar autenticación)
        // const currentUser = await getCurrentUser(request);
        // if (!canAccessBond(currentUser, bond)) {
        //   return NextResponse.json(
        //     { error: 'No tienes permisos para calcular este bono', code: 'FORBIDDEN' },
        //     { status: 403 }
        //   );
        // }

        // 5. Verificar si el bono está en estado calculable
        if (bond.status === 'EXPIRED') {
            return NextResponse.json(
                { error: 'No se pueden calcular bonos vencidos', code: 'BOND_EXPIRED' },
                { status: 400 }
            );
        }

        // 6. Ejecutar cálculos según el tipo solicitado
        let result;

        if (quickMetrics) {
            console.log(`⚡ Calculando métricas rápidas para bono ${bond.name}...`);
            result = await calculationsService.calculateQuickMetrics(bondId);
        } else {
            console.log(`🧮 Calculando flujos completos para bono ${bond.name}...`);
            result = await calculationsService.calculateBond({
                bondId,
                recalculate,
                saveResults,
            });
        }

        // 7. Verificar si el cálculo fue exitoso
        if (!result.success) {
            return NextResponse.json(
                {
                    error: 'Error en cálculos financieros',
                    code: 'CALCULATION_FAILED',
                    details: result.errors,
                },
                { status: 500 }
            );
        }

        // 8. Retornar resultados exitosos
        return NextResponse.json({
            success: true,
            bondId: result.bondId,
            bondName: bond.name,
            calculatedAt: result.calculatedAt,
            quickMetrics,
            metricas: result.metricas,
            flowsCount: result.flowsCount,
            calculation: {
                duration: `${Date.now() - new Date(result.calculatedAt).getTime()}ms`,
                recalculated: recalculate,
                savedToDatabase: saveResults,
            },
        });

    } catch (error) {
        console.error('Error en API de cálculo:', error);

        // Manejar errores de validación
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Manejar errores de negocio
        if (error instanceof Error) {
            return NextResponse.json(
                {
                    error: error.message,
                    code: 'BUSINESS_ERROR',
                },
                { status: 500 }
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
 * GET /api/bonds/[bondId]/calculate
 * - Obtiene el estado de cálculos del bono
 * - Indica si necesita recálculo
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = ParamsSchema.parse(await params);

        // Verificar que el bono existe
        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            select: {
                id: true,
                name: true,
                status: true,
                updatedAt: true,
            },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Verificar estado de cálculos
        const recalcStatus = await calculationsService.needsRecalculation(bondId);

        // Obtener información de flujos existentes
        const flowsCount = await prisma.cashFlow.count({
            where: { bondId },
        });

        // Obtener última fecha de cálculo
        const lastCalculation = await prisma.financialMetrics.findFirst({
            where: { bondId },
            select: { fechaCalculo: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            bondId,
            bondName: bond.name,
            bondStatus: bond.status,
            bondLastModified: bond.updatedAt,
            calculation: {
                hasFlows: flowsCount > 0,
                flowsCount,
                lastCalculated: lastCalculation?.fechaCalculo || null,
                needsRecalculation: recalcStatus.needsRecalc,
                reasons: recalcStatus.reasons,
            },
            actions: {
                canCalculate: bond.status !== 'EXPIRED',
                shouldRecalculate: recalcStatus.needsRecalc,
            },
        });

    } catch (error) {
        console.error('Error obteniendo estado de cálculo:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'ID de bono inválido', code: 'INVALID_BOND_ID' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/bonds/[bondId]/calculate
 * - Elimina cálculos existentes del bono
 * - Útil para forzar recálculo completo
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = ParamsSchema.parse(await params);


        // Verificar que el bono existe
        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            select: { id: true, name: true },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Eliminar cálculos en transacción
        await prisma.$transaction(async (tx) => {
            // Eliminar flujos de caja
            await tx.cashFlow.deleteMany({
                where: { bondId },
            });

            // Eliminar métricas financieras
            await tx.financialMetrics.deleteMany({
                where: { bondId },
            });

            // Eliminar resultados de cálculo
            await tx.calculationResult.deleteMany({
                where: { bondId },
            });
        });

        return NextResponse.json({
            success: true,
            bondId,
            bondName: bond.name,
            message: 'Cálculos eliminados exitosamente',
            deletedAt: new Date(),
        });

    } catch (error) {
        console.error('Error eliminando cálculos:', error);

        return NextResponse.json(
            { error: 'Error eliminando cálculos', code: 'DELETE_ERROR' },
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