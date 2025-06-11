// lib/models/CashFlow.ts

import { PrismaClient, CashFlow as PrismaCashFlow } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { CashFlowPeriod } from '@/lib/types/calculations';

/**
 * Modelo de datos para Flujos de Caja
 * Maneja la tabla unificada que sirve tanto a emisores como inversionistas
 */

// Esquemas de validación
export const CreateCashFlowSchema = z.object({
    bondId: z.string().cuid(),
    periodo: z.number().int().min(0),
    fecha: z.date(),

    // Datos opcionales (pueden ser null en ciertos períodos)
    inflacionAnual: z.number().min(-1).max(10).optional(),
    inflacionSemestral: z.number().min(-1).max(10).optional(),
    periodoGracia: z.enum(['S', 'P', 'T']).optional(),

    // Valores del bono
    bonoCapital: z.number().optional(),
    bonoIndexado: z.number().optional(),

    // Pagos
    cupon: z.number().optional(),
    amortizacion: z.number().optional(),
    cuota: z.number().optional(),
    prima: z.number().optional(),

    // Escudo fiscal
    escudoFiscal: z.number().optional(),

    // Flujos por rol
    flujoEmisor: z.number().optional(),
    flujoEmisorConEscudo: z.number().optional(),
    flujoBonista: z.number().optional(),

    // Para cálculos
    flujoActualizado: z.number().optional(),
    faPlazoPonderado: z.number().optional(),
    factorConvexidad: z.number().optional(),
});

export const CreateManyCashFlowsSchema = z.array(CreateCashFlowSchema);

export type CreateCashFlowInput = z.infer<typeof CreateCashFlowSchema>;
export type CreateManyCashFlowsInput = z.infer<typeof CreateManyCashFlowsSchema>;

// Tipos para vistas segmentadas por rol
export interface EmisorCashFlowView {
    periodo: number;
    fecha: Date;
    inflacionAnual: number | null;
    inflacionSemestral: number | null;
    periodoGracia: string | null;
    bonoCapital: number | null;
    bonoIndexado: number | null;
    cupon: number | null;
    amortizacion: number | null;
    cuota: number | null;
    prima: number | null;
    escudoFiscal: number | null;
    flujoEmisor: number | null;
    flujoEmisorConEscudo: number | null;
}

export interface InversionistaCashFlowView {
    periodo: number;
    fecha: Date;
    inflacionAnual: number | null;
    inflacionSemestral: number | null;
    bonoIndexado: number | null;
    cupon: number | null;
    amortizacion: number | null;
    flujoBonista: number | null;
    flujoActualizado: number | null;
    faPlazoPonderado: number | null;
    factorConvexidad: number | null;
}

export interface CashFlowSummary {
    bondId: string;
    totalPeriodos: number;
    fechaInicio: Date;
    fechaFin: Date;
    totalFlujoEmisor: number;
    totalFlujoBonista: number;
    ultimaActualizacion: Date;
}

/**
 * Clase modelo para operaciones con Flujos de Caja
 */
export class CashFlowModel {
    constructor(private prisma: PrismaClient) {}

    /**
     * Crear múltiples flujos de caja de una vez (más eficiente)
     */
    async createMany(bondId: string, flows: CashFlowPeriod[]): Promise<void> {
        // Validar datos de entrada
        const validatedFlows = flows.map(flow => this.validateCashFlowPeriod(bondId, flow));

        await this.prisma.$transaction(async (tx) => {
            // Eliminar flujos existentes si los hay
            await tx.cashFlow.deleteMany({
                where: { bondId },
            });

            // Crear nuevos flujos
            await tx.cashFlow.createMany({
                data: validatedFlows,
                skipDuplicates: true,
            });
        });
    }

    /**
     * Obtener flujos de caja con vista del EMISOR
     */
    async getEmisorView(bondId: string): Promise<EmisorCashFlowView[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: {
                periodo: true,
                fecha: true,
                inflacionAnual: true,
                inflacionSemestral: true,
                periodoGracia: true,
                bonoCapital: true,
                bonoIndexado: true,
                cupon: true,
                amortizacion: true,
                cuota: true,
                prima: true,
                escudoFiscal: true,
                flujoEmisor: true,
                flujoEmisorConEscudo: true,
            },
            orderBy: { periodo: 'asc' },
        });

        return flows.map(flow => ({
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() || null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() || null,
            periodoGracia: flow.periodoGracia,
            bonoCapital: flow.bonoCapital?.toNumber() || null,
            bonoIndexado: flow.bonoIndexado?.toNumber() || null,
            cupon: flow.cupon?.toNumber() || null,
            amortizacion: flow.amortizacion?.toNumber() || null,
            cuota: flow.cuota?.toNumber() || null,
            prima: flow.prima?.toNumber() || null,
            escudoFiscal: flow.escudoFiscal?.toNumber() || null,
            flujoEmisor: flow.flujoEmisor?.toNumber() || null,
            flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() || null,
        }));
    }

    /**
     * Obtener flujos de caja con vista del INVERSIONISTA
     */
    async getInversionistaView(bondId: string): Promise<InversionistaCashFlowView[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: {
                periodo: true,
                fecha: true,
                inflacionAnual: true,
                inflacionSemestral: true,
                bonoIndexado: true,
                cupon: true,
                amortizacion: true,
                flujoBonista: true,
                flujoActualizado: true,
                faPlazoPonderado: true,
                factorConvexidad: true,
            },
            orderBy: { periodo: 'asc' },
        });

        return flows.map(flow => ({
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() || null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() || null,
            bonoIndexado: flow.bonoIndexado?.toNumber() || null,
            cupon: flow.cupon?.toNumber() || null,
            amortizacion: flow.amortizacion?.toNumber() || null,
            flujoBonista: flow.flujoBonista?.toNumber() || null,
            flujoActualizado: flow.flujoActualizado?.toNumber() || null,
            faPlazoPonderado: flow.faPlazoPonderado?.toNumber() || null,
            factorConvexidad: flow.factorConvexidad?.toNumber() || null,
        }));
    }

    /**
     * Obtener flujos completos (para cálculos internos)
     */
    async getFullFlows(bondId: string): Promise<CashFlowPeriod[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            orderBy: { periodo: 'asc' },
        });

        return flows.map(flow => this.convertPrismaToCalculationPeriod(flow));
    }

    /**
     * Obtener resumen de flujos de caja
     */
    async getSummary(bondId: string): Promise<CashFlowSummary | null> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: {
                periodo: true,
                fecha: true,
                flujoEmisor: true,
                flujoBonista: true,
                createdAt: true,
            },
            orderBy: { periodo: 'asc' },
        });

        if (flows.length === 0) return null;

        const totalFlujoEmisor = flows.reduce(
            (sum, flow) => sum.plus(flow.flujoEmisor || 0),
            new Decimal(0)
        );

        const totalFlujoBonista = flows.reduce(
            (sum, flow) => sum.plus(flow.flujoBonista || 0),
            new Decimal(0)
        );

        const ultimaActualizacion = flows.reduce(
            (latest, flow) => flow.createdAt > latest ? flow.createdAt : latest,
            flows[0].createdAt
        );

        return {
            bondId,
            totalPeriodos: flows.length - 1, // Excluyendo período 0
            fechaInicio: flows[0].fecha,
            fechaFin: flows[flows.length - 1].fecha,
            totalFlujoEmisor: totalFlujoEmisor.toNumber(),
            totalFlujoBonista: totalFlujoBonista.toNumber(),
            ultimaActualizacion,
        };
    }

    /**
     * Obtener flujos por rango de períodos
     */
    async getFlowsByRange(
        bondId: string,
        startPeriod: number,
        endPeriod: number,
        userRole: 'emisor' | 'inversionista'
    ): Promise<EmisorCashFlowView[] | InversionistaCashFlowView[]> {
        if (userRole === 'emisor') {
            const flows = await this.prisma.cashFlow.findMany({
                where: {
                    bondId,
                    periodo: {
                        gte: startPeriod,
                        lte: endPeriod,
                    },
                },
                select: {
                    periodo: true,
                    fecha: true,
                    inflacionAnual: true,
                    inflacionSemestral: true,
                    periodoGracia: true,
                    bonoCapital: true,
                    bonoIndexado: true,
                    cupon: true,
                    amortizacion: true,
                    cuota: true,
                    prima: true,
                    escudoFiscal: true,
                    flujoEmisor: true,
                    flujoEmisorConEscudo: true,
                },
                orderBy: { periodo: 'asc' },
            });

            return flows.map(flow => ({
                periodo: flow.periodo,
                fecha: flow.fecha,
                inflacionAnual: flow.inflacionAnual?.toNumber() || null,
                inflacionSemestral: flow.inflacionSemestral?.toNumber() || null,
                periodoGracia: flow.periodoGracia,
                bonoCapital: flow.bonoCapital?.toNumber() || null,
                bonoIndexado: flow.bonoIndexado?.toNumber() || null,
                cupon: flow.cupon?.toNumber() || null,
                amortizacion: flow.amortizacion?.toNumber() || null,
                cuota: flow.cuota?.toNumber() || null,
                prima: flow.prima?.toNumber() || null,
                escudoFiscal: flow.escudoFiscal?.toNumber() || null,
                flujoEmisor: flow.flujoEmisor?.toNumber() || null,
                flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() || null,
            }));
        } else {
            return this.getInversionistaView(bondId);
        }
    }

    /**
     * Verificar si existen flujos para un bono
     */
    async hasFlows(bondId: string): Promise<boolean> {
        const count = await this.prisma.cashFlow.count({
            where: { bondId },
        });
        return count > 0;
    }

    /**
     * Eliminar todos los flujos de un bono
     */
    async deleteFlows(bondId: string): Promise<void> {
        await this.prisma.cashFlow.deleteMany({
            where: { bondId },
        });
    }

    /**
     * Obtener métricas agregadas de flujos
     */
    async getFlowMetrics(bondId: string) {
        const metrics = await this.prisma.cashFlow.aggregate({
            where: { bondId },
            _sum: {
                flujoEmisor: true,
                flujoBonista: true,
                flujoActualizado: true,
                faPlazoPonderado: true,
                factorConvexidad: true,
            },
            _count: {
                periodo: true,
            },
        });

        return {
            totalPeriodos: metrics._count.periodo,
            sumaFlujoEmisor: metrics._sum.flujoEmisor?.toNumber() || 0,
            sumaFlujoBonista: metrics._sum.flujoBonista?.toNumber() || 0,
            sumaFlujoActualizado: metrics._sum.flujoActualizado?.toNumber() || 0,
            sumaFAPlazoPonderado: metrics._sum.faPlazoPonderado?.toNumber() || 0,
            sumaFactorConvexidad: metrics._sum.factorConvexidad?.toNumber() || 0,
        };
    }

    /**
     * Utilidades privadas
     */
    private validateCashFlowPeriod(bondId: string, flow: CashFlowPeriod): CreateCashFlowInput {
        return {
            bondId,
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual,
            inflacionSemestral: flow.inflacionSemestral,
            periodoGracia: flow.gracia,
            bonoCapital: flow.bonoCapital,
            bonoIndexado: flow.bonoIndexado,
            cupon: flow.cupon,
            amortizacion: flow.amortizacion,
            cuota: flow.cuota,
            prima: flow.prima,
            escudoFiscal: flow.escudoFiscal,
            flujoEmisor: flow.flujoEmisor,
            flujoEmisorConEscudo: flow.flujoEmisorConEscudo,
            flujoBonista: flow.flujoBonista,
            flujoActualizado: flow.flujoActualizado,
            faPlazoPonderado: flow.faPlazoPonderado,
            factorConvexidad: flow.factorConvexidad,
        };
    }

    private convertPrismaToCalculationPeriod(flow: PrismaCashFlow): CashFlowPeriod {
        return {
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() || null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() || null,
            gracia: (flow.periodoGracia as 'S' | 'P' | 'T') || null,
            bonoCapital: flow.bonoCapital?.toNumber() || null,
            bonoIndexado: flow.bonoIndexado?.toNumber() || null,
            cupon: flow.cupon?.toNumber() || null,
            amortizacion: flow.amortizacion?.toNumber() || null,
            cuota: flow.cuota?.toNumber() || null,
            prima: flow.prima?.toNumber() || null,
            escudoFiscal: flow.escudoFiscal?.toNumber() || null,
            flujoEmisor: flow.flujoEmisor?.toNumber() || null,
            flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() || null,
            flujoBonista: flow.flujoBonista?.toNumber() || null,
            flujoActualizado: flow.flujoActualizado?.toNumber() || null,
            faPlazoPonderado: flow.faPlazoPonderado?.toNumber() || null,
            factorConvexidad: flow.factorConvexidad?.toNumber() || null,
        };
    }

    /**
     * Validar integridad de flujos de caja
     */
    async validateFlowIntegrity(bondId: string): Promise<{
        isValid: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];

        const flows = await this.getFullFlows(bondId);

        if (flows.length === 0) {
            errors.push('No hay flujos de caja definidos');
            return { isValid: false, errors };
        }

        // Verificar que el período 0 existe
        const periodo0 = flows.find(f => f.periodo === 0);
        if (!periodo0) {
            errors.push('Falta el período 0 (inicial)');
        }

        // Verificar secuencia de períodos
        for (let i = 0; i < flows.length - 1; i++) {
            if (flows[i + 1].periodo !== flows[i].periodo + 1) {
                errors.push(`Secuencia de períodos rota entre ${flows[i].periodo} y ${flows[i + 1].periodo}`);
            }
        }

        // Verificar que flujos emisor y bonista son espejos
        for (const flow of flows) {
            if (flow.flujoEmisor !== null && flow.flujoBonista !== null) {
                const diff = Math.abs((flow.flujoEmisor + flow.flujoBonista));
                if (diff > 0.01) { // Tolerancia de 1 centavo
                    errors.push(`Flujos emisor y bonista no son espejos en período ${flow.periodo}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Exportar flujos a formato CSV
     */
    async exportToCSV(bondId: string, role: 'emisor' | 'inversionista'): Promise<string> {
        let headers: string;
        let rows: string[];

        if (role === 'emisor') {
            headers = 'Período,Fecha,Inflación Anual,Bono Indexado,Cupón,Amortización,Escudo Fiscal,Flujo Emisor,Flujo c/Escudo';
            const flows = await this.getEmisorView(bondId);
            rows = flows.map(flow => [
                flow.periodo,
                flow.fecha.toISOString().split('T')[0],
                flow.inflacionAnual?.toFixed(4) || '',
                flow.bonoIndexado?.toFixed(2) || '',
                flow.cupon?.toFixed(2) || '',
                flow.amortizacion?.toFixed(2) || '',
                flow.escudoFiscal?.toFixed(2) || '',
                flow.flujoEmisor?.toFixed(2) || '',
                flow.flujoEmisorConEscudo?.toFixed(2) || '',
            ].join(','));
        } else {
            headers = 'Período,Fecha,Inflación Anual,Bono Indexado,Cupón,Flujo Bonista,Flujo Actualizado';
            const flows = await this.getInversionistaView(bondId);
            rows = flows.map(flow => [
                flow.periodo,
                flow.fecha.toISOString().split('T')[0],
                flow.inflacionAnual?.toFixed(4) || '',
                flow.bonoIndexado?.toFixed(2) || '',
                flow.cupon?.toFixed(2) || '',
                flow.flujoBonista?.toFixed(2) || '',
                flow.flujoActualizado?.toFixed(2) || '',
            ].join(','));
        }

        return [headers, ...rows].join('\n');
    }
}