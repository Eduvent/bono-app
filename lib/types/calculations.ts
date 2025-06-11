// lib/types/calculations.ts

import { Decimal } from 'decimal.js';

/**
 * Datos de entrada para los cálculos financieros
 * Basado en el Excel del método americano
 */
export interface CalculationInputs {
    // Datos básicos del bono (E4-E8)
    valorNominal: number;           // E4: 1,000.00
    valorComercial: number;         // E5: 1,050.00
    numAnios: number;               // E6: 5
    frecuenciaCupon: FrequenciaCupon; // E7: "Semestral"
    diasPorAno: 360 | 365;          // E8: 360

    // Configuración de tasas (E9-E13)
    tipoTasa: 'efectiva' | 'nominal'; // E9: "Efectiva"
    periodicidadCapitalizacion: PeriocidadCapitalizacion; // E10: "Bimestral"
    tasaAnual: number;              // E11: 8.000% (como decimal 0.08)
    tasaDescuento: number;          // E12: 4.500% (como decimal 0.045)
    impuestoRenta: number;          // E13: 30% (como decimal 0.30)

    // Fechas
    fechaEmision: Date;             // E14: 01/06/2025

    // Costes (E16-E20) - como porcentajes decimales
    primaPorcentaje: number;        // E16: 1.000% (como 0.01)
    estructuracionPorcentaje: number; // E17: 1.000% (como 0.01)
    colocacionPorcentaje: number;   // E18: 0.250% (como 0.0025)
    flotacionPorcentaje: number;    // E19: 0.450% (como 0.0045)
    cavaliPorcentaje: number;       // E20: 0.500% (como 0.005)

    // Series de inflación y gracia por período
    inflacionSerie: number[];       // Inflación anual por período
    graciaSerie: GracePeriodType[]; // Tipo de gracia por período
}

/**
 * Cálculos intermedios (Sección L del Excel)
 */
export interface CalculosIntermedios {
    // L4-L7: Configuración de períodos
    frecuenciaCuponDias: number;    // L4: 180
    diasCapitalizacion: number;     // L5: 60
    periodosPorAno: number;         // L6: 2
    totalPeriodos: number;          // L7: 10

    // L8-L10: Tasas calculadas
    tasaEfectivaAnual: number;      // L8: 8.0000%
    tasaCuponPeriodica: number;     // L9: 3.923%
    tasaDescuentoPeriodica: number; // L10: 2.225%

    // L11-L12: Costes iniciales
    costesInicialesEmisor: number;  // L11: 23.10
    costesInicialesBonista: number; // L12: 9.98

    // L14: VPN base
    vpnFlujosBonista: number;       // L14: ≈ 1,753.34
}

/**
 * Flujo de caja de un período específico
 */
export interface CashFlowPeriod {
    // Identificación
    periodo: number;                // A[n]: 0, 1, 2, ..., 10
    fecha: Date;                   // B[n]: Fechas de cupón

    // Inflación
    inflacionAnual: number | null;  // C[n]: 10% en ejemplo
    inflacionSemestral: number | null; // D[n]: Inflación prorrateada

    // Período de gracia
    gracia: GracePeriodType | null; // E[n]: "S", "P", "T"

    // Valores del bono
    bonoCapital: number | null;     // F[n]: Capital vivo
    bonoIndexado: number | null;    // G[n]: Ajuste por inflación

    // Pagos
    cupon: number | null;          // H[n]: Pago de interés
    amortizacion: number | null;   // J[n]: Amortización de principal
    cuota: number | null;          // I[n]: Cupón + amortización
    prima: number | null;          // K[n]: Amortización de prima

    // Escudo fiscal
    escudoFiscal: number | null;   // L[n]: Ahorro fiscal

    // Flujos por rol
    flujoEmisor: number | null;           // M[n]: Entrada/salida emisor
    flujoEmisorConEscudo: number | null;  // N[n]: Incluye beneficio fiscal
    flujoBonista: number | null;          // O[n]: Espejo del flujo emisor

    // Para cálculos de métricas
    flujoActualizado: number | null;      // P[n]: Valor presente
    faPlazoPonderado: number | null;      // Q[n]: Para duración
    factorConvexidad: number | null;      // R[n]: Para convexidad
}

/**
 * Métricas financieras calculadas
 */
export interface FinancialMetrics {
    // Precios y valores
    precioActual: number;          // VNA(L10;O28:O37) = 1,753.34
    utilidadPerdida: number;       // O27 + VNA(L10;O28:O37) = 693.37

    // Ratios de riesgo
    duracion: number;              // SUMA(Q27:Q37)/SUMA(P27:P37) = 4.45
    convexidad: number;            // Fórmula compleja = 22.39
    totalRatiosDecision: number;   // Duración + Convexidad = 26.84
    duracionModificada: number;    // Duración/(1+L10) = 4.35

    // Tasas de retorno
    tceaEmisor: number;           // TIR emisor bruto = 18.45033%
    tceaEmisorConEscudo: number;  // TIR emisor con escudo = 15.78819%
    treaBonista: number;          // TIR bonista = 17.55812%
}

/**
 * Resultado completo de cálculos
 */
export interface CalculationResult {
    // Datos de entrada validados
    inputs: CalculationInputs;

    // Cálculos intermedios
    intermedios: CalculosIntermedios;

    // Tabla de flujos completa
    flujos: CashFlowPeriod[];

    // Métricas financieras
    metricas: FinancialMetrics;

    // Metadatos
    fechaCalculo: Date;
    version: string;
}

/**
 * Tipos auxiliares
 */
export type FrequenciaCupon =
    | 'mensual'        // 30 días
    | 'bimestral'      // 60 días
    | 'trimestral'     // 90 días
    | 'cuatrimestral'  // 120 días
    | 'semestral'      // 180 días
    | 'anual';         // 360 días

export type PeriocidadCapitalizacion =
    | 'diaria'         // 1 día
    | 'quincenal'      // 15 días
    | 'mensual'        // 30 días
    | 'bimestral'      // 60 días
    | 'trimestral'     // 90 días
    | 'cuatrimestral'  // 120 días
    | 'semestral'      // 180 días
    | 'anual';         // 360 días

export type GracePeriodType =
    | 'S'  // Sin gracia
    | 'P'  // Gracia parcial
    | 'T'; // Gracia total

/**
 * Errores de validación
 */
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/**
 * Configuración para cálculos de precisión
 */
export interface PrecisionConfig {
    decimalPlaces: number;
    roundingMode: Decimal.Rounding;
    tolerance: number; // Para comparaciones de igualdad
}

/**
 * Opciones para el calculador
 */
export interface CalculatorOptions {
    precision?: PrecisionConfig;
    validateInputs?: boolean;
    includeIntermediateSteps?: boolean;
    cacheResults?: boolean;
}