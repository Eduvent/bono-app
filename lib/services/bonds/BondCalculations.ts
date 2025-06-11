// lib/services/bonds/BondCalculations.ts

import {
    PrismaClient,
    Prisma,
    // BondStatus as PrismaBondStatus, // No se usa directamente si usamos MetricsRole
    MetricsRole // Importar el enum MetricsRole
} from '../../generated/client';
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { BondModel, BondWithFullRelations } from '@/lib/models/Bond';
import { CashFlowModel } from '@/lib/models/CashFlow';
import {
    CalculationInputs,
    CalculationResult,
    FrequenciaCupon, // Usar FrequenciaCupon (de types/calculations)
    // TipoTasaMapped, // Se usa tipo literal o se define en types/calculations
    GracePeriodType,
    PrecisionConfig
} from '@/lib/types/calculations';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

export const CalculateBondRequestSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
    recalculate: z.boolean().default(false),
    saveResults: z.boolean().default(true),
});

export type CalculateBondRequest = z.infer<typeof CalculateBondRequestSchema>;

export interface BondCalculationResponse { /* ... (sin cambios) ... */
    bondId: string;
    success: boolean;
    calculatedAt: Date;
    metricas: {
        emisor: {
            precioActual: number; van: number; tceaEmisor: number; tceaEmisorConEscudo: number;
            duracion: number; duracionModificada: number; convexidad: number; totalRatiosDecision: number;
        };
        bonista: {
            precioActual: number; van: number; treaBonista: number;
            duracion: number; duracionModificada: number; convexidad: number; totalRatiosDecision: number;
        };
    };
    flowsCount: number;
    errors?: string[];
}


export class BondCalculationsService {
    private calculator: FinancialCalculator;
    private bondModel: BondModel;
    private cashFlowModel: CashFlowModel;

    constructor(private prisma: PrismaClient) {
        const precisionSettings: PrecisionConfig = {
            decimalPlaces: 6,
            tolerance: 1e-8,
            roundingMode: Decimal.ROUND_HALF_UP,
        };
        this.calculator = new FinancialCalculator({
            validateInputs: true,
            includeIntermediateSteps: true,
            precision: precisionSettings
        });
        this.bondModel = new BondModel(prisma);
        this.cashFlowModel = new CashFlowModel(prisma);
    }

    async calculateBond(request: CalculateBondRequest): Promise<BondCalculationResponse> {
        // ... (sin cambios respecto a la versión anterior, asegurando que calculationInputs.id se maneje bien)
        const validatedRequest = CalculateBondRequestSchema.parse(request);
        const { bondId, recalculate, saveResults } = validatedRequest;

        try {
            if (!recalculate) {
                const existingCalculation = await this.getExistingCalculation(bondId);
                if (existingCalculation) return existingCalculation;
            }

            const bond = await this.bondModel.findById(bondId);
            if (!bond) throw new Error(`Bono ${bondId} no encontrado`);

            await this.validateBondForCalculation(bond);
            const calculationInputs = await this.convertBondToCalculationInputs(bond);

            console.log(`🔄 Calculando flujos para bono ${bond.name}...`);
            const startTime = Date.now();
            const calculationResult = await this.calculator.calculate(calculationInputs);
            const duration = Date.now() - startTime;
            console.log(`✅ Cálculos completados en ${duration}ms`);

            if (saveResults) {
                if (!calculationInputs.id) {
                    throw new Error("ID de CalculationInputs (registro de DB) no encontrado para guardar resultados.");
                }
                await this.saveCalculationResults(bondId, calculationInputs.id, calculationResult);
            }
            return this.formatCalculationResponse(bondId, calculationResult);
        } catch (error) {
            console.error(`❌ Error calculando bono ${bondId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                bondId, success: false, calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(), flowsCount: 0, errors: [errorMessage],
            };
        }
    }

    async calculateQuickMetrics(bondId: string): Promise<BondCalculationResponse> {
        // ... (sin cambios respecto a la versión anterior)
        try {
            const bond = await this.bondModel.findById(bondId);
            if (!bond) throw new Error(`Bono ${bondId} no encontrado para quick metrics`);
            const calculationInputs = await this.convertBondToCalculationInputs(bond);
            const quickMetricsResult = await this.calculator.calculateQuickMetrics(calculationInputs);

            return {
                bondId,
                success: true,
                calculatedAt: new Date(),
                metricas: {
                    emisor: {
                        precioActual: quickMetricsResult.precioActual,
                        van: quickMetricsResult.utilidadPerdida,
                        tceaEmisor: quickMetricsResult.tceaEmisor,
                        tceaEmisorConEscudo: quickMetricsResult.tceaEmisorConEscudo,
                        duracion: quickMetricsResult.duracion,
                        duracionModificada: quickMetricsResult.duracionModificada,
                        convexidad: quickMetricsResult.convexidad,
                        totalRatiosDecision: quickMetricsResult.totalRatiosDecision,
                    },
                    bonista: {
                        precioActual: quickMetricsResult.precioActual,
                        van: quickMetricsResult.precioActual,
                        treaBonista: quickMetricsResult.treaBonista,
                        duracion: quickMetricsResult.duracion,
                        duracionModificada: quickMetricsResult.duracionModificada,
                        convexidad: quickMetricsResult.convexidad,
                        totalRatiosDecision: quickMetricsResult.totalRatiosDecision,
                    },
                },
                flowsCount: 0,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                bondId, success: false, calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(), flowsCount: 0, errors: [errorMessage],
            };
        }
    }


    async calculateMultipleBonds(
        bondIds: string[],
        options: { parallel?: boolean; batchSize?: number; onProgress?: (completed: number, total: number) => void; } = {}
    ): Promise<BondCalculationResponse[]> {
        // ... (sin cambios respecto a la versión anterior)
        const { parallel = false, batchSize = 5, onProgress } = options;
        const results: BondCalculationResponse[] = [];

        const processBond = async (bondId: string): Promise<BondCalculationResponse> => {
            return this.calculateBond({ bondId, recalculate: true, saveResults: true });
        };

        if (parallel) {
            for (let i = 0; i < bondIds.length; i += batchSize) {
                const batch = bondIds.slice(i, i + batchSize);
                const batchPromises = batch.map(processBond);
                const batchResultsSettled = await Promise.allSettled(batchPromises);

                for (const settledResult of batchResultsSettled) { // Renombrado para claridad
                    if (settledResult.status === 'fulfilled') {
                        results.push(settledResult.value);
                    } else {
                        const errorMessage = settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason);
                        // Intenta obtener el bondId del input original si es posible
                        const originalPromiseIndex = batchPromises.findIndex(p => p === (settledResult as any)._promise); // Esto es un hack, puede no funcionar
                        const failedBondId = originalPromiseIndex !== -1 ? batch[originalPromiseIndex] : 'unknown_in_batch';
                        results.push({
                            bondId: failedBondId,
                            success: false, calculatedAt: new Date(), metricas: this.getEmptyMetrics(),
                            flowsCount: 0, errors: [errorMessage],
                        });
                    }
                }
                if (onProgress) onProgress(Math.min(i + batchSize, bondIds.length), bondIds.length);
            }
        } else {
            for (let i = 0; i < bondIds.length; i++) {
                const result = await processBond(bondIds[i]);
                results.push(result);
                if (onProgress) onProgress(i + 1, bondIds.length);
            }
        }
        return results;
    }

    async getCalculatedFlows(bondId: string, userRole: 'emisor' | 'inversionista') {
        // ... (sin cambios respecto a la versión anterior)
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);
        if (!hasFlows) {
            const result = await this.calculateBond({ bondId, recalculate: true, saveResults: true });
            if (!result.success) {
                throw new Error(`No se pudieron calcular los flujos: ${result.errors?.join(', ')}`);
            }
        }
        return userRole === 'emisor'
            ? this.cashFlowModel.getEmisorView(bondId)
            : this.cashFlowModel.getInversionistaView(bondId);
    }

    async needsRecalculation(bondId: string): Promise<{ needsRecalc: boolean; reasons: string[]; }> {
        // ... (sin cambios significativos respecto a la versión anterior)
        const reasons: string[] = [];
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);
        if (!hasFlows) reasons.push('No existen flujos de caja calculados');

        const metricsCount = await this.prisma.financialMetrics.count({ where: { bondId } });
        if (metricsCount === 0) reasons.push('No existen métricas financieras calculadas');

        if (hasFlows) {
            const integrity = await this.cashFlowModel.validateFlowIntegrity(bondId);
            if (!integrity.isValid) reasons.push(`Flujos con errores: ${integrity.errors.join(', ')}`);
        }

        const bond = await this.prisma.bond.findUnique({ where: { id: bondId }, select: { updatedAt: true } });
        if (bond) {
            const latestCalculationSource = await this.prisma.calculationResult.findFirst({
                where: { bondId },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
            }) || await this.prisma.financialMetrics.findFirst({
                where: { bondId },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc'}
            });

            if (latestCalculationSource && bond.updatedAt > latestCalculationSource.createdAt) {
                reasons.push('Bono modificado después del último cálculo');
            } else if (!latestCalculationSource && (hasFlows || metricsCount > 0)) {
                reasons.push('No se puede determinar la fecha del último cálculo, posible necesidad de recalcular.');
            }
        }
        return { needsRecalc: reasons.length > 0, reasons };
    }

    private async getExistingCalculation(bondId: string): Promise<BondCalculationResponse | null> {
        const [flowsCount, emisorMetrics, bonistaMetrics] = await Promise.all([
            this.prisma.cashFlow.count({ where: { bondId } }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: MetricsRole.EMISOR } } // CORRECCIÓN: Usar Enum MetricsRole
            }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: MetricsRole.BONISTA } } // CORRECCIÓN: Usar Enum MetricsRole
            }),
        ]);

        if (flowsCount > 0 && emisorMetrics && bonistaMetrics) {
            return { /* ... (resto del mapeo sin cambios) ... */
                bondId, success: true, calculatedAt: emisorMetrics.fechaCalculo,
                metricas: {
                    emisor: {
                        precioActual: emisorMetrics.precioActual.toNumber(), van: emisorMetrics.van.toNumber(),
                        tceaEmisor: emisorMetrics.tcea?.toNumber() ?? 0,
                        tceaEmisorConEscudo: emisorMetrics.tceaConEscudo?.toNumber() ?? 0,
                        duracion: emisorMetrics.duracion.toNumber(),
                        duracionModificada: emisorMetrics.duracionModificada.toNumber(),
                        convexidad: emisorMetrics.convexidad.toNumber(),
                        totalRatiosDecision: emisorMetrics.totalRatiosDecision.toNumber(),
                    },
                    bonista: {
                        precioActual: bonistaMetrics.precioActual.toNumber(), van: bonistaMetrics.van.toNumber(),
                        treaBonista: bonistaMetrics.trea?.toNumber() ?? 0,
                        duracion: bonistaMetrics.duracion.toNumber(),
                        duracionModificada: bonistaMetrics.duracionModificada.toNumber(),
                        convexidad: bonistaMetrics.convexidad.toNumber(),
                        totalRatiosDecision: bonistaMetrics.totalRatiosDecision.toNumber(),
                    },
                },
                flowsCount,
            };
        }
        return null;
    }

    private async validateBondForCalculation(bond: BondWithFullRelations): Promise<void> {
        // ... (sin cambios)
        const errors: string[] = [];
        if (bond.valorNominal.isNegative() || bond.valorNominal.isZero()) errors.push('Valor nominal inválido');
        if (bond.valorComercial.isNegative() || bond.valorComercial.isZero()) errors.push('Valor comercial inválido');
        if (bond.numAnios <= 0) errors.push('Número de años inválido');
        if (bond.tasaAnual.isNegative()) errors.push('Tasa anual inválida');
        if (errors.length > 0) throw new Error(`Bono inválido para cálculo: ${errors.join(', ')}`);
    }

    private async convertBondToCalculationInputs(bond: BondWithFullRelations): Promise<CalculationInputs & {id: string}> {
        const calcInputsRecord = await this.prisma.calculationInputs.findUnique({
            where: { bondId: bond.id }
        });

        if (!bond.costs) throw new Error(`Costes no definidos para bono ${bond.id}`);
        if (!calcInputsRecord) throw new Error(`Registro CalculationInputs no encontrado para bono ${bond.id}`);

        const frecuenciaCuponMap: Record<string, FrequenciaCupon> = { // Usar FrequenciaCupon de types/calculations
            MENSUAL: 'mensual', BIMESTRAL: 'bimestral', TRIMESTRAL: 'trimestral',
            CUATRIMESTRAL: 'cuatrimestral', SEMESTRAL: 'semestral', ANUAL: 'anual',
        };
        const tipoTasaMap: Record<string, 'efectiva' | 'nominal'> = { // Usar tipo literal
            EFECTIVA: 'efectiva', NOMINAL: 'nominal',
        };
        // Asegúrate que bond.frecuenciaCupon y bond.tipoTasa (que vienen del enum de Prisma)
        // se puedan usar como claves en estos maps. Si los enums de Prisma son exactamente 'MENSUAL', 'EFECTIVA', etc.
        // entonces esto funciona.
        const mappedFrecuenciaCupon = frecuenciaCuponMap[bond.frecuenciaCupon as keyof typeof frecuenciaCuponMap];
        const mappedTipoTasa = tipoTasaMap[bond.tipoTasa as keyof typeof tipoTasaMap];

        if (!mappedFrecuenciaCupon) throw new Error(`Frecuencia de cupón no mapeada: ${bond.frecuenciaCupon}`);
        if (!mappedTipoTasa) throw new Error(`Tipo de tasa no mapeado: ${bond.tipoTasa}`);


        return {
            id: calcInputsRecord.id,
            valorNominal: bond.valorNominal.toNumber(),
            valorComercial: bond.valorComercial.toNumber(),
            numAnios: bond.numAnios,
            frecuenciaCupon: mappedFrecuenciaCupon,
            diasPorAno: bond.baseDias as 360 | 365,
            tipoTasa: mappedTipoTasa,
            periodicidadCapitalizacion: bond.periodicidadCapitalizacion as any, // Podría necesitar un mapeo similar
            tasaAnual: bond.tasaAnual.toNumber(),
            tasaDescuento: 0.045,
            impuestoRenta: bond.impuestoRenta.toNumber(),
            fechaEmision: bond.fechaEmision,
            primaPorcentaje: bond.primaVencimiento.toNumber(),
            estructuracionPorcentaje: bond.costs.estructuracionPct.toNumber(),
            colocacionPorcentaje: bond.costs.colocacionPct.toNumber(),
            flotacionPorcentaje: bond.costs.flotacionPct.toNumber(),
            cavaliPorcentaje: bond.costs.cavaliPct.toNumber(),
            inflacionSerie: calcInputsRecord.inflacionSerie as number[],
            graciaSerie: calcInputsRecord.graciaSerie as GracePeriodType[],
        };
    }

    private async saveCalculationResults(
        bondId: string,
        calculationInputsId: string,
        result: CalculationResult
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            if (result.flujos && result.flujos.length > 0) {
                const prismaFlowsData = result.flujos.map(flow => { /* ... (sin cambios de la versión anterior) ... */
                    const data: Prisma.CashFlowCreateManyInput = {
                        bondId, periodo: flow.periodo, fecha: flow.fecha,
                        inflacionAnual: flow.inflacionAnual !== null ? new Decimal(flow.inflacionAnual) : null,
                        inflacionSemestral: flow.inflacionSemestral !== null ? new Decimal(flow.inflacionSemestral) : null,
                        periodoGracia: flow.gracia,
                        bonoCapital: flow.bonoCapital !== null ? new Decimal(flow.bonoCapital) : null,
                        bonoIndexado: flow.bonoIndexado !== null ? new Decimal(flow.bonoIndexado) : null,
                        cupon: flow.cupon !== null ? new Decimal(flow.cupon) : null,
                        amortizacion: flow.amortizacion !== null ? new Decimal(flow.amortizacion) : null,
                        cuota: flow.cuota !== null ? new Decimal(flow.cuota) : null,
                        prima: flow.prima !== null ? new Decimal(flow.prima) : null,
                        escudoFiscal: flow.escudoFiscal !== null ? new Decimal(flow.escudoFiscal) : null,
                        flujoEmisor: flow.flujoEmisor !== null ? new Decimal(flow.flujoEmisor) : null,
                        flujoEmisorConEscudo: flow.flujoEmisorConEscudo !== null ? new Decimal(flow.flujoEmisorConEscudo) : null,
                        flujoBonista: flow.flujoBonista !== null ? new Decimal(flow.flujoBonista) : null,
                        flujoActualizado: flow.flujoActualizado !== null ? new Decimal(flow.flujoActualizado) : null,
                        faPlazoPonderado: flow.faPlazoPonderado !== null ? new Decimal(flow.faPlazoPonderado) : null,
                        factorConvexidad: flow.factorConvexidad !== null ? new Decimal(flow.factorConvexidad) : null,
                    };
                    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);
                    return data;
                });
                await tx.cashFlow.deleteMany({where: {bondId}});
                await tx.cashFlow.createMany({ data: prismaFlowsData, skipDuplicates: true });
            }

            const commonMetricsCreatePayload = (metrics: CalculationResult['metricas']) => ({
                precioActual: metrics.precioActual,
                utilidadPerdida: metrics.utilidadPerdida, // Asumiendo que FinancialMetrics (de types/calculations) tiene utilidadPerdida
                // van: metrics.van, // Tu tipo FinancialMetrics (de types/calculations) NO tiene 'van'
                duracion: metrics.duracion,
                duracionModificada: metrics.duracionModificada,
                convexidad: metrics.convexidad,
                totalRatiosDecision: metrics.totalRatiosDecision,
                fechaCalculo: result.fechaCalculo || new Date(),
            });

            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: MetricsRole.EMISOR } }, // Usar Enum
                create: {
                    bondId, role: MetricsRole.EMISOR,
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.utilidadPerdida,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                },
                update: {
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.utilidadPerdida,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                },
            });
            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: MetricsRole.BONISTA } }, // Usar Enum
                create: {
                    bondId, role: MetricsRole.BONISTA,
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.precioActual,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                },
                update: {
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.precioActual,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                },
            });

            // CORRECCIÓN para where y aserciones de tipo JSON
            // Asume que @@unique([bondId, calculationInputsId], name: "CalculationResult_bondId_calculationInputsId_key") existe en schema.prisma
            await tx.calculationResult.upsert({
                where: {
                    CalculationResult_bondId_calculationInputsId_key: { // Usar el NOMBRE del índice único
                        bondId,
                        calculationInputsId
                    }
                },
                create: {
                    bond: { connect: { id: bondId } },
                    inputs: { connect: { id: calculationInputsId } },
                    calculosIntermedios: result.intermedios as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    metricasCalculadas: result.metricas as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                },
                update: {
                    calculosIntermedios: result.intermedios as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    metricasCalculadas: result.metricas as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    createdAt: new Date(),
                }
            });
        });
    }

    private formatCalculationResponse(bondId: string, result: CalculationResult): BondCalculationResponse {
        // ... (sin cambios)
        return {
            bondId, success: true, calculatedAt: result.fechaCalculo,
            metricas: {
                emisor: {
                    precioActual: result.metricas.precioActual, van: result.metricas.utilidadPerdida,
                    tceaEmisor: result.metricas.tceaEmisor,
                    tceaEmisorConEscudo: result.metricas.tceaEmisorConEscudo,
                    duracion: result.metricas.duracion, duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad, totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
                bonista: {
                    precioActual: result.metricas.precioActual, van: result.metricas.precioActual,
                    treaBonista: result.metricas.treaBonista,
                    duracion: result.metricas.duracion, duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad, totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
            },
            flowsCount: result.flujos?.length || 0,
        };
    }

    private getEmptyMetrics() {
        // ... (sin cambios)
        const emptyBase = { precioActual: 0, van: 0, duracion: 0, duracionModificada: 0, convexidad: 0, totalRatiosDecision: 0 };
        return {
            emisor: { ...emptyBase, tceaEmisor: 0, tceaEmisorConEscudo: 0 },
            bonista: { ...emptyBase, treaBonista: 0 },
        };
    }
}