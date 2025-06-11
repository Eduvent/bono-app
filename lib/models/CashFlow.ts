// lib/models/CashFlow.ts

import { PrismaClient, CashFlow as PrismaCashFlow, Prisma } from '../../lib/generated/client'; // Añadido Prisma namespace
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { CashFlowPeriod, GracePeriodType } from '@/lib/types/calculations'; // Asumiendo que GracePeriodType es 'S' | 'P' | 'T'

/**
 * Modelo de datos para Flujos de Caja
 * Maneja la tabla unificada que sirve tanto a emisores como inversionistas
 */

// Esquemas de validación
// Los campos en Prisma son Decimal?, que se mapean a Decimal | null en TypeScript.
// Zod los define como number().optional(), que es number | undefined.
// Prisma Client maneja la conversión de number a Decimal al crear/actualizar.
// El problema de tipo null vs undefined surge al LEER de Prisma y mapear a tipos de TS.
export const CreateCashFlowSchema = z.object({
    bondId: z.string().cuid(),
    periodo: z.number().int().min(0),
    fecha: z.coerce.date(), // Coerce a Date

    inflacionAnual: z.number().min(-1).max(10).optional(),
    inflacionSemestral: z.number().min(-1).max(10).optional(),
    periodoGracia: z.enum(['S', 'P', 'T']).optional(),

    bonoCapital: z.number().optional(),
    bonoIndexado: z.number().optional(),
    cupon: z.number().optional(),
    amortizacion: z.number().optional(),
    cuota: z.number().optional(),
    prima: z.number().optional(),
    escudoFiscal: z.number().optional(),
    flujoEmisor: z.number().optional(),
    flujoEmisorConEscudo: z.number().optional(),
    flujoBonista: z.number().optional(),
    flujoActualizado: z.number().optional(),
    faPlazoPonderado: z.number().optional(),
    factorConvexidad: z.number().optional(),
});

export const CreateManyCashFlowsSchema = z.array(CreateCashFlowSchema);

export type CreateCashFlowInput = z.infer<typeof CreateCashFlowSchema>;
export type CreateManyCashFlowsInput = z.infer<typeof CreateManyCashFlowsSchema>;

// Tipos para vistas segmentadas por rol
// Estos tipos deben coincidir con lo que devuelven las funciones de mapeo
export interface EmisorCashFlowView {
    periodo: number;
    fecha: Date;
    inflacionAnual: number | null;
    inflacionSemestral: number | null;
    periodoGracia: GracePeriodType | null; // Usar el tipo importado
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
    // periodoGracia no está en tu select para InversionistaView, así que lo quito
    bonoIndexado: number | null;
    cupon: number | null;
    amortizacion: number | null; // Este no estaba en tu select, pero sí en el map. Lo mantengo por si acaso.
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

    async createMany(bondId: string, flows: CashFlowPeriod[]): Promise<void> {
        const validatedFlowsData = flows.map(flow => {
            // Convertir de CashFlowPeriod (que puede tener number | null) a Prisma.CashFlowCreateManyInput
            // Prisma espera numbers para campos Decimal al crear, o Decimal directamente.
            // Si CashFlowPeriod ya usa number | null, está bien.
            // Los campos opcionales en Zod (y por ende en CreateCashFlowInput) serán undefined si no se proveen.
            // Prisma los tratará como no establecidos. Si se provee null explícitamente, los guardará como NULL.
            const dataForPrisma: Prisma.CashFlowCreateManyInput = {
                bondId,
                periodo: flow.periodo,
                fecha: flow.fecha,
                // Aquí, si flow.X es null, queremos que se guarde como NULL en la DB.
                // Si es un número, Prisma lo convertirá a Decimal.
                inflacionAnual: flow.inflacionAnual, // Asumiendo que CashFlowPeriod.inflacionAnual es number | null
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
            // Remover propiedades undefined para que Prisma no intente establecerlas
            Object.keys(dataForPrisma).forEach(key =>
                (dataForPrisma as any)[key] === undefined && delete (dataForPrisma as any)[key]
            );
            return dataForPrisma;
        });


        await this.prisma.$transaction(async (tx) => {
            await tx.cashFlow.deleteMany({ where: { bondId } });
            await tx.cashFlow.createMany({
                data: validatedFlowsData,
                skipDuplicates: true,
            });
        });
    }

    async getEmisorView(bondId: string): Promise<EmisorCashFlowView[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: {
                periodo: true, fecha: true, inflacionAnual: true, inflacionSemestral: true,
                periodoGracia: true, bonoCapital: true, bonoIndexado: true, cupon: true,
                amortizacion: true, cuota: true, prima: true, escudoFiscal: true,
                flujoEmisor: true, flujoEmisorConEscudo: true,
            },
            orderBy: { periodo: 'asc' },
        });

        return flows.map(flow => ({
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() ?? null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() ?? null,
            periodoGracia: flow.periodoGracia as GracePeriodType | null, // Casting explícito
            bonoCapital: flow.bonoCapital?.toNumber() ?? null,
            bonoIndexado: flow.bonoIndexado?.toNumber() ?? null,
            cupon: flow.cupon?.toNumber() ?? null,
            amortizacion: flow.amortizacion?.toNumber() ?? null,
            cuota: flow.cuota?.toNumber() ?? null,
            prima: flow.prima?.toNumber() ?? null,
            escudoFiscal: flow.escudoFiscal?.toNumber() ?? null,
            flujoEmisor: flow.flujoEmisor?.toNumber() ?? null,
            flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() ?? null,
        }));
    }

    async getInversionistaView(bondId: string): Promise<InversionistaCashFlowView[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: {
                periodo: true, fecha: true, inflacionAnual: true, inflacionSemestral: true,
                bonoIndexado: true, cupon: true, amortizacion: true, // Amortizacion está en el select
                flujoBonista: true, flujoActualizado: true, faPlazoPonderado: true,
                factorConvexidad: true,
                // periodoGracia no está aquí, así que el mapeo no debería incluirlo
            },
            orderBy: { periodo: 'asc' },
        });

        return flows.map(flow => ({
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() ?? null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() ?? null,
            bonoIndexado: flow.bonoIndexado?.toNumber() ?? null,
            cupon: flow.cupon?.toNumber() ?? null,
            amortizacion: flow.amortizacion?.toNumber() ?? null, // Correcto, ya que está en el select
            flujoBonista: flow.flujoBonista?.toNumber() ?? null,
            flujoActualizado: flow.flujoActualizado?.toNumber() ?? null,
            faPlazoPonderado: flow.faPlazoPonderado?.toNumber() ?? null,
            factorConvexidad: flow.factorConvexidad?.toNumber() ?? null,
        }));
    }

    async getFullFlows(bondId: string): Promise<CashFlowPeriod[]> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            orderBy: { periodo: 'asc' },
        });
        // Esta es la función clave que debe coincidir con CashFlowPeriod
        return flows.map(flow => this.convertPrismaToCalculationPeriod(flow));
    }

    async getSummary(bondId: string): Promise<CashFlowSummary | null> {
        const flows = await this.prisma.cashFlow.findMany({
            where: { bondId },
            select: { periodo: true, fecha: true, flujoEmisor: true, flujoBonista: true, createdAt: true },
            orderBy: { periodo: 'asc' },
        });
        if (flows.length === 0) return null;

        const totalFlujoEmisor = flows.reduce((sum, flow) => sum.plus(flow.flujoEmisor || 0), new Decimal(0));
        const totalFlujoBonista = flows.reduce((sum, flow) => sum.plus(flow.flujoBonista || 0), new Decimal(0));
        const ultimaActualizacion = flows.reduce((latest, flow) => flow.createdAt > latest ? flow.createdAt : latest, flows[0].createdAt);

        return {
            bondId,
            totalPeriodos: flows.length > 0 ? flows[flows.length - 1].periodo : 0, // Período máximo como total
            fechaInicio: flows[0].fecha,
            fechaFin: flows[flows.length - 1].fecha,
            totalFlujoEmisor: totalFlujoEmisor.toNumber(),
            totalFlujoBonista: totalFlujoBonista.toNumber(),
            ultimaActualizacion,
        };
    }

    async getFlowsByRange(
        bondId: string, startPeriod: number, endPeriod: number, userRole: 'emisor' | 'inversionista'
    ): Promise<EmisorCashFlowView[] | InversionistaCashFlowView[]> {
        // La lógica existente parece correcta, asumiendo que los mapeos en getEmisorView/getInversionistaView son correctos.
        // Solo me aseguro que los .toNumber() usen el operador de encadenamiento opcional ?? null.
        if (userRole === 'emisor') {
            const flows = await this.prisma.cashFlow.findMany({
                where: { bondId, periodo: { gte: startPeriod, lte: endPeriod } },
                select: { /* ... mismos campos que getEmisorView ... */
                    periodo: true, fecha: true, inflacionAnual: true, inflacionSemestral: true,
                    periodoGracia: true, bonoCapital: true, bonoIndexado: true, cupon: true,
                    amortizacion: true, cuota: true, prima: true, escudoFiscal: true,
                    flujoEmisor: true, flujoEmisorConEscudo: true,
                },
                orderBy: { periodo: 'asc' },
            });
            return flows.map(flow => ({ /* ... mismo mapeo que getEmisorView ... */
                periodo: flow.periodo,
                fecha: flow.fecha,
                inflacionAnual: flow.inflacionAnual?.toNumber() ?? null,
                inflacionSemestral: flow.inflacionSemestral?.toNumber() ?? null,
                periodoGracia: flow.periodoGracia as GracePeriodType | null,
                bonoCapital: flow.bonoCapital?.toNumber() ?? null,
                bonoIndexado: flow.bonoIndexado?.toNumber() ?? null,
                cupon: flow.cupon?.toNumber() ?? null,
                amortizacion: flow.amortizacion?.toNumber() ?? null,
                cuota: flow.cuota?.toNumber() ?? null,
                prima: flow.prima?.toNumber() ?? null,
                escudoFiscal: flow.escudoFiscal?.toNumber() ?? null,
                flujoEmisor: flow.flujoEmisor?.toNumber() ?? null,
                flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() ?? null,
            }));
        } else { // userRole === 'inversionista'
            const flows = await this.prisma.cashFlow.findMany({
                where: { bondId, periodo: { gte: startPeriod, lte: endPeriod } },
                select: { /* ... mismos campos que getInversionistaView ... */
                    periodo: true, fecha: true, inflacionAnual: true, inflacionSemestral: true,
                    bonoIndexado: true, cupon: true, amortizacion: true,
                    flujoBonista: true, flujoActualizado: true, faPlazoPonderado: true,
                    factorConvexidad: true,
                },
                orderBy: { periodo: 'asc' },
            });
            return flows.map(flow => ({ /* ... mismo mapeo que getInversionistaView ... */
                periodo: flow.periodo,
                fecha: flow.fecha,
                inflacionAnual: flow.inflacionAnual?.toNumber() ?? null,
                inflacionSemestral: flow.inflacionSemestral?.toNumber() ?? null,
                bonoIndexado: flow.bonoIndexado?.toNumber() ?? null,
                cupon: flow.cupon?.toNumber() ?? null,
                amortizacion: flow.amortizacion?.toNumber() ?? null,
                flujoBonista: flow.flujoBonista?.toNumber() ?? null,
                flujoActualizado: flow.flujoActualizado?.toNumber() ?? null,
                faPlazoPonderado: flow.faPlazoPonderado?.toNumber() ?? null,
                factorConvexidad: flow.factorConvexidad?.toNumber() ?? null,
            }));
        }
    }

    async hasFlows(bondId: string): Promise<boolean> {
        const count = await this.prisma.cashFlow.count({ where: { bondId } });
        return count > 0;
    }

    async deleteFlows(bondId: string): Promise<Prisma.BatchPayload> { // Devolver BatchPayload para info
        return await this.prisma.cashFlow.deleteMany({ where: { bondId } });
    }

    async getFlowMetrics(bondId: string) {
        const metrics = await this.prisma.cashFlow.aggregate({
            where: { bondId },
            _sum: {
                flujoEmisor: true, flujoBonista: true, flujoActualizado: true,
                faPlazoPonderado: true, factorConvexidad: true,
            },
            _count: { periodo: true }, // _count es sobre todos los registros que cumplen el where
        });
        return {
            totalPeriodos: metrics._count.periodo,
            sumaFlujoEmisor: metrics._sum.flujoEmisor?.toNumber() ?? 0,
            sumaFlujoBonista: metrics._sum.flujoBonista?.toNumber() ?? 0,
            sumaFlujoActualizado: metrics._sum.flujoActualizado?.toNumber() ?? 0,
            sumaFAPlazoPonderado: metrics._sum.faPlazoPonderado?.toNumber() ?? 0,
            sumaFactorConvexidad: metrics._sum.factorConvexidad?.toNumber() ?? 0,
        };
    }

    // Ya no es necesario, createMany se encarga de la validación/transformación
    // private validateCashFlowPeriod(bondId: string, flow: CashFlowPeriod): CreateCashFlowInput { ... }

    /**
     * Convierte un objeto PrismaCashFlow al tipo CashFlowPeriod usado en cálculos.
     * Es CRUCIAL que CashFlowPeriod esté definido para aceptar `null` en sus campos opcionales.
     */
    private convertPrismaToCalculationPeriod(flow: PrismaCashFlow): CashFlowPeriod {
        return {
            periodo: flow.periodo,
            fecha: flow.fecha,
            inflacionAnual: flow.inflacionAnual?.toNumber() ?? null,
            inflacionSemestral: flow.inflacionSemestral?.toNumber() ?? null,
            gracia: (flow.periodoGracia as GracePeriodType) ?? null, // Casting y ?? null
            bonoCapital: flow.bonoCapital?.toNumber() ?? null,
            bonoIndexado: flow.bonoIndexado?.toNumber() ?? null,
            cupon: flow.cupon?.toNumber() ?? null,
            amortizacion: flow.amortizacion?.toNumber() ?? null,
            cuota: flow.cuota?.toNumber() ?? null,
            prima: flow.prima?.toNumber() ?? null,
            escudoFiscal: flow.escudoFiscal?.toNumber() ?? null,
            flujoEmisor: flow.flujoEmisor?.toNumber() ?? null,
            flujoEmisorConEscudo: flow.flujoEmisorConEscudo?.toNumber() ?? null,
            flujoBonista: flow.flujoBonista?.toNumber() ?? null,
            flujoActualizado: flow.flujoActualizado?.toNumber() ?? null,
            faPlazoPonderado: flow.faPlazoPonderado?.toNumber() ?? null,
            factorConvexidad: flow.factorConvexidad?.toNumber() ?? null,
        };
    }

    async validateFlowIntegrity(bondId: string): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];
        const flows = await this.getFullFlows(bondId);
        if (flows.length === 0) {
            errors.push('No hay flujos de caja definidos');
            return { isValid: false, errors };
        }
        const periodo0 = flows.find(f => f.periodo === 0);
        if (!periodo0) errors.push('Falta el período 0 (inicial)');
        for (let i = 0; i < flows.length - 1; i++) {
            if (flows[i + 1].periodo !== flows[i].periodo + 1) {
                errors.push(`Secuencia de períodos rota entre ${flows[i].periodo} y ${flows[i + 1].periodo}`);
            }
        }
        for (const flow of flows) {
            if (flow.flujoEmisor !== null && flow.flujoBonista !== null) {
                const diff = new Decimal(flow.flujoEmisor).plus(flow.flujoBonista).abs();
                if (diff.greaterThan(0.01)) { // Usar Decimal para comparación de precisión
                    errors.push(`Flujos emisor y bonista no son espejos en período ${flow.periodo}`);
                }
            }
        }
        return { isValid: errors.length === 0, errors };
    }

    async exportToCSV(bondId: string, role: 'emisor' | 'inversionista'): Promise<string> {
        let headers: string;
        let rows: string[];
        const toFixedOrEmpty = (val: number | null, dp: number) => val === null ? '' : val.toFixed(dp);

        if (role === 'emisor') {
            headers = 'Período,Fecha,Inflación Anual,Bono Indexado,Cupón,Amortización,Escudo Fiscal,Flujo Emisor,Flujo c/Escudo';
            const dataFlows = await this.getEmisorView(bondId);
            rows = dataFlows.map(flow => [
                flow.periodo, flow.fecha.toISOString().split('T')[0],
                toFixedOrEmpty(flow.inflacionAnual, 4), toFixedOrEmpty(flow.bonoIndexado, 2),
                toFixedOrEmpty(flow.cupon, 2), toFixedOrEmpty(flow.amortizacion, 2),
                toFixedOrEmpty(flow.escudoFiscal, 2), toFixedOrEmpty(flow.flujoEmisor, 2),
                toFixedOrEmpty(flow.flujoEmisorConEscudo, 2),
            ].join(','));
        } else {
            headers = 'Período,Fecha,Inflación Anual,Bono Indexado,Cupón,Flujo Bonista,Flujo Actualizado';
            const dataFlows = await this.getInversionistaView(bondId);
            rows = dataFlows.map(flow => [
                flow.periodo, flow.fecha.toISOString().split('T')[0],
                toFixedOrEmpty(flow.inflacionAnual, 4), toFixedOrEmpty(flow.bonoIndexado, 2),
                toFixedOrEmpty(flow.cupon, 2), toFixedOrEmpty(flow.flujoBonista, 2),
                toFixedOrEmpty(flow.flujoActualizado, 2),
            ].join(','));
        }
        return [headers, ...rows].join('\n');
    }
}