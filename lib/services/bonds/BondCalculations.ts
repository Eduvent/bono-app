// lib/services/bonds/BondCalculations.ts

import { PrismaClient } from '@prisma/client';
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { BondModel } from '@/lib/models/Bond';
import { CashFlowModel } from '@/lib/models/CashFlow';
import { CalculationInputs, CalculationResult } from '@/lib/types/calculations';
import { z } from 'zod';

/**
 * Servicio que orquesta los cálculos financieros de bonos
 * Conecta el motor de cálculos con la base de datos
 */

// Esquema para validar requests de cálculo
export const CalculateBondRequestSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
    recalculate: z.boolean().default(false),
    saveResults: z.boolean().default(true),
});

export type CalculateBondRequest = z.infer<typeof CalculateBondRequestSchema>;

// Resultado simplificado para APIs
export interface BondCalculationResponse {
    bondId: string;
    success: boolean;
    calculatedAt: Date;
    metricas: {
        emisor: {
            precioActual: number;
            van: number;
            tceaEmisor: number;
            tceaEmisorConEscudo: number;
            duracion: number;
            duracionModificada: number;
            convexidad: number;
            totalRatiosDecision: number;
        };
        bonista: {
            precioActual: number;
            van: number;
            treaBonista: number;
            duracion: number;
            duracionModificada: number;
            convexidad: number;
            totalRatiosDecision: number;
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
        this.calculator = new FinancialCalculator({
            validateInputs: true,
            includeIntermediateSteps: true,
            precision: {
                decimalPlaces: 6,
                tolerance: 1e-8
            }
        });
        this.bondModel = new BondModel(prisma);
        this.cashFlowModel = new CashFlowModel(prisma);
    }

    /**
     * Método principal: Calcular flujos y métricas de un bono
     */
    async calculateBond(request: CalculateBondRequest): Promise<BondCalculationResponse> {
        const validatedRequest = CalculateBondRequestSchema.parse(request);
        const { bondId, recalculate, saveResults } = validatedRequest;

        try {
            // 1. Verificar si ya existen cálculos y si necesitamos recalcular
            if (!recalculate) {
                const existingCalculation = await this.getExistingCalculation(bondId);
                if (existingCalculation) {
                    return existingCalculation;
                }
            }

            // 2. Obtener datos del bono
            const bond = await this.bondModel.findById(bondId);
            if (!bond) {
                throw new Error(`Bono ${bondId} no encontrado`);
            }

            // 3. Verificar que el bono se puede calcular
            await this.validateBondForCalculation(bond);

            // 4. Convertir datos del bono a inputs de cálculo
            const calculationInputs = await this.convertBondToCalculationInputs(bondId);

            // 5. Ejecutar cálculos financieros
            console.log(`🔄 Calculando flujos para bono ${bond.name}...`);
            const startTime = Date.now();

            const calculationResult = await this.calculator.calculate(calculationInputs);

            const duration = Date.now() - startTime;
            console.log(`✅ Cálculos completados en ${duration}ms`);

            // 6. Guardar resultados si está habilitado
            if (saveResults) {
                await this.saveCalculationResults(bondId, calculationResult);
            }

            // 7. Retornar respuesta simplificada
            return this.formatCalculationResponse(bondId, calculationResult);

        } catch (error) {
            console.error(`❌ Error calculando bono ${bondId}:`, error);

            return {
                bondId,
                success: false,
                calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(),
                flowsCount: 0,
                errors: [error instanceof Error ? error.message : 'Error desconocido'],
            };
        }
    }

    /**
     * Calcular solo métricas principales (más rápido)
     */
    async calculateQuickMetrics(bondId: string): Promise<BondCalculationResponse> {
        try {
            const calculationInputs = await this.convertBondToCalculationInputs(bondId);
            const metricas = await this.calculator.calculateQuickMetrics(calculationInputs);

            return {
                bondId,
                success: true,
                calculatedAt: new Date(),
                metricas: {
                    emisor: {
                        precioActual: metricas.precioActual,
                        van: metricas.utilidadPerdida,
                        tceaEmisor: metricas.tceaEmisor,
                        tceaEmisorConEscudo: metricas.tceaEmisorConEscudo,
                        duracion: metricas.duracion,
                        duracionModificada: metricas.duracionModificada,
                        convexidad: metricas.convexidad,
                        totalRatiosDecision: metricas.totalRatiosDecision,
                    },
                    bonista: {
                        precioActual: metricas.precioActual,
                        van: metricas.precioActual,
                        treaBonista: metricas.treaBonista,
                        duracion: metricas.duracion,
                        duracionModificada: metricas.duracionModificada,
                        convexidad: metricas.convexidad,
                        totalRatiosDecision: metricas.totalRatiosDecision,
                    },
                },
                flowsCount: 0,
            };

        } catch (error) {
            return {
                bondId,
                success: false,
                calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(),
                flowsCount: 0,
                errors: [error instanceof Error ? error.message : 'Error desconocido'],
            };
        }
    }

    /**
     * Recalcular múltiples bonos (útil para actualizaciones masivas)
     */
    async calculateMultipleBonds(
        bondIds: string[],
        options: {
            parallel?: boolean;
            batchSize?: number;
            onProgress?: (completed: number, total: number) => void;
        } = {}
    ): Promise<BondCalculationResponse[]> {
        const { parallel = false, batchSize = 5, onProgress } = options;

        if (parallel) {
            // Procesamiento en paralelo con batches
            const results: BondCalculationResponse[] = [];

            for (let i = 0; i < bondIds.length; i += batchSize) {
                const batch = bondIds.slice(i, i + batchSize);
                const batchPromises = batch.map(bondId =>
                    this.calculateBond({ bondId, recalculate: true, saveResults: true })
                );

                const batchResults = await Promise.allSettled(batchPromises);

                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    } else {
                        results.push({
                            bondId: 'unknown',
                            success: false,
                            calculatedAt: new Date(),
                            metricas: this.getEmptyMetrics(),
                            flowsCount: 0,
                            errors: [result.reason?.message || 'Error en cálculo paralelo'],
                        });
                    }
                }

                if (onProgress) {
                    onProgress(Math.min(i + batchSize, bondIds.length), bondIds.length);
                }
            }

            return results;
        } else {
            // Procesamiento secuencial
            const results: BondCalculationResponse[] = [];

            for (let i = 0; i < bondIds.length; i++) {
                const result = await this.calculateBond({
                    bondId: bondIds[i],
                    recalculate: true,
                    saveResults: true
                });
                results.push(result);

                if (onProgress) {
                    onProgress(i + 1, bondIds.length);
                }
            }

            return results;
        }
    }

    /**
     * Obtener flujos de caja calculados por rol
     */
    async getCalculatedFlows(bondId: string, userRole: 'emisor' | 'inversionista') {
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);

        if (!hasFlows) {
            // Calcular flujos si no existen
            const result = await this.calculateBond({ bondId, saveResults: true });
            if (!result.success) {
                throw new Error(`No se pudieron calcular los flujos: ${result.errors?.join(', ')}`);
            }
        }

        // Retornar vista según el rol
        if (userRole === 'emisor') {
            return await this.cashFlowModel.getEmisorView(bondId);
        } else {
            return await this.cashFlowModel.getInversionistaView(bondId);
        }
    }

    /**
     * Validar si un bono necesita recálculo
     */
    async needsRecalculation(bondId: string): Promise<{
        needsRecalc: boolean;
        reasons: string[];
    }> {
        const reasons: string[] = [];

        // Verificar si existen flujos
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);
        if (!hasFlows) {
            reasons.push('No existen flujos de caja calculados');
        }

        // Verificar si hay métricas
        const metricsCount = await this.prisma.financialMetrics.count({
            where: { bondId },
        });
        if (metricsCount === 0) {
            reasons.push('No existen métricas financieras calculadas');
        }

        // Verificar integridad de flujos
        if (hasFlows) {
            const integrity = await this.cashFlowModel.validateFlowIntegrity(bondId);
            if (!integrity.isValid) {
                reasons.push(`Flujos con errores: ${integrity.errors.join(', ')}`);
            }
        }

        // Verificar si el bono fue modificado después del último cálculo
        const bond = await this.prisma.bond.findUnique({
            where: { id: bondId },
            select: { updatedAt: true },
        });

        if (bond && hasFlows) {
            const latestFlow = await this.prisma.cashFlow.findFirst({
                where: { bondId },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
            });

            if (latestFlow && bond.updatedAt > latestFlow.createdAt) {
                reasons.push('Bono modificado después del último cálculo');
            }
        }

        return {
            needsRecalc: reasons.length > 0,
            reasons,
        };
    }

    /**
     * MÉTODOS PRIVADOS
     */

    private async getExistingCalculation(bondId: string): Promise<BondCalculationResponse | null> {
        // Verificar si existen flujos y métricas recientes
        const [flowsCount, emisorMetrics, bonistaMetrics] = await Promise.all([
            this.prisma.cashFlow.count({ where: { bondId } }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: 'EMISOR' } },
            }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: 'BONISTA' } },
            }),
        ]);

        if (flowsCount > 0 && emisorMetrics && bonistaMetrics) {
            return {
                bondId,
                success: true,
                calculatedAt: emisorMetrics.fechaCalculo,
                metricas: {
                    emisor: {
                        precioActual: emisorMetrics.precioActual.toNumber(),
                        van: emisorMetrics.van.toNumber(),
                        tceaEmisor: emisorMetrics.tcea?.toNumber() || 0,
                        tceaEmisorConEscudo: emisorMetrics.tceaConEscudo?.toNumber() || 0,
                        duracion: emisorMetrics.duracion.toNumber(),
                        duracionModificada: emisorMetrics.duracionModificada.toNumber(),
                        convexidad: emisorMetrics.convexidad.toNumber(),
                        totalRatiosDecision: emisorMetrics.totalRatiosDecision.toNumber(),
                    },
                    bonista: {
                        precioActual: bonistaMetrics.precioActual.toNumber(),
                        van: bonistaMetrics.van.toNumber(),
                        treaBonista: bonistaMetrics.trea?.toNumber() || 0,
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

    private async validateBondForCalculation(bond: any): Promise<void> {
        const errors: string[] = [];

        if (!bond.valorNominal || bond.valorNominal <= 0) {
            errors.push('Valor nominal inválido');
        }

        if (!bond.valorComercial || bond.valorComercial <= 0) {
            errors.push('Valor comercial inválido');
        }

        if (!bond.numAnios || bond.numAnios <= 0) {
            errors.push('Número de años inválido');
        }

        if (!bond.tasaAnual || bond.tasaAnual < 0) {
            errors.push('Tasa anual inválida');
        }

        if (errors.length > 0) {
            throw new Error(`Bono inválido para cálculo: ${errors.join(', ')}`);
        }
    }

    private async convertBondToCalculationInputs(bondId: string): Promise<CalculationInputs> {
        // Obtener datos del bono con relaciones
        const bond = await this.prisma.bond.findUnique({
            where: { id: bondId },
            include: {
                costs: true,
                calculationInputs: true,
            },
        });

        if (!bond) {
            throw new Error(`Bono ${bondId} no encontrado`);
        }

        if (!bond.costs) {
            throw new Error(`Costes no definidos para bono ${bondId}`);
        }

        if (!bond.calculationInputs) {
            throw new Error(`Inputs de cálculo no definidos para bono ${bondId}`);
        }

        // Convertir enums a strings
        const frecuenciaCuponMap = {
            'MENSUAL': 'mensual',
            'BIMESTRAL': 'bimestral',
            'TRIMESTRAL': 'trimestral',
            'CUATRIMESTRAL': 'cuatrimestral',
            'SEMESTRAL': 'semestral',
            'ANUAL': 'anual',
        } as const;

        const tipoTasaMap = {
            'EFECTIVA': 'efectiva',
            'NOMINAL': 'nominal',
        } as const;

        return {
            // Datos básicos
            valorNominal: bond.valorNominal.toNumber(),
            valorComercial: bond.valorComercial.toNumber(),
            numAnios: bond.numAnios,
            frecuenciaCupon: frecuenciaCuponMap[bond.frecuenciaCupon],
            diasPorAno: bond.baseDias as 360 | 365,

            // Configuración financiera
            tipoTasa: tipoTasaMap[bond.tipoTasa],
            periodicidadCapitalizacion: bond.periodicidadCapitalizacion as any,
            tasaAnual: bond.tasaAnual.toNumber(),
            tasaDescuento: 0.045, // TODO: Obtener de configuración
            impuestoRenta: bond.impuestoRenta.toNumber(),

            // Fecha
            fechaEmision: bond.fechaEmision,

            // Costes
            primaPorcentaje: bond.primaVencimiento.toNumber(),
            estructuracionPorcentaje: bond.costs.estructuracionPct.toNumber(),
            colocacionPorcentaje: bond.costs.colocacionPct.toNumber(),
            flotacionPorcentaje: bond.costs.flotacionPct.toNumber(),
            cavaliPorcentaje: bond.costs.cavaliPct.toNumber(),

            // Series
            inflacionSerie: bond.calculationInputs.inflacionSerie as number[],
            graciaSerie: bond.calculationInputs.graciaSerie as ('S' | 'P' | 'T')[],
        };
    }

    private async saveCalculationResults(bondId: string, result: CalculationResult): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // 1. Guardar flujos de caja
            await this.cashFlowModel.createMany(bondId, result.flujos);

            // 2. Guardar métricas del emisor
            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: 'EMISOR' } },
                create: {
                    bondId,
                    role: 'EMISOR',
                    precioActual: result.metricas.precioActual,
                    utilidadPerdida: result.metricas.utilidadPerdida,
                    van: result.metricas.utilidadPerdida,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                    fechaCalculo: new Date(),
                },
                update: {
                    precioActual: result.metricas.precioActual,
                    utilidadPerdida: result.metricas.utilidadPerdida,
                    van: result.metricas.utilidadPerdida,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                    fechaCalculo: new Date(),
                },
            });

            // 3. Guardar métricas del bonista
            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: 'BONISTA' } },
                create: {
                    bondId,
                    role: 'BONISTA',
                    precioActual: result.metricas.precioActual,
                    utilidadPerdida: result.metricas.utilidadPerdida,
                    van: result.metricas.precioActual,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                    fechaCalculo: new Date(),
                },
                update: {
                    precioActual: result.metricas.precioActual,
                    utilidadPerdida: result.metricas.utilidadPerdida,
                    van: result.metricas.precioActual,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                    fechaCalculo: new Date(),
                },
            });

            // 4. Guardar resultado completo como JSON
            await tx.calculationResult.create({
                data: {
                    bondId,
                    calculationInputsId: (await tx.calculationInputs.findUnique({
                        where: { bondId },
                        select: { id: true },
                    }))!.id,
                    calculosIntermedios: result.intermedios as any,
                    metricasCalculadas: result.metricas as any,
                },
            });
        });
    }

    private formatCalculationResponse(bondId: string, result: CalculationResult): BondCalculationResponse {
        return {
            bondId,
            success: true,
            calculatedAt: result.fechaCalculo,
            metricas: {
                emisor: {
                    precioActual: result.metricas.precioActual,
                    van: result.metricas.utilidadPerdida,
                    tceaEmisor: result.metricas.tceaEmisor,
                    tceaEmisorConEscudo: result.metricas.tceaEmisorConEscudo,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
                bonista: {
                    precioActual: result.metricas.precioActual,
                    van: result.metricas.precioActual,
                    treaBonista: result.metricas.treaBonista,
                    duracion: result.metricas.duracion,
                    duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad,
                    totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
            },
            flowsCount: result.flujos.length,
        };
    }

    private getEmptyMetrics() {
        const emptyMetrics = {
            precioActual: 0,
            van: 0,
            duracion: 0,
            duracionModificada: 0,
            convexidad: 0,
            totalRatiosDecision: 0,
        };

        return {
            emisor: { ...emptyMetrics, tceaEmisor: 0, tceaEmisorConEscudo: 0 },
            bonista: { ...emptyMetrics, treaBonista: 0 },
        };
    }
}