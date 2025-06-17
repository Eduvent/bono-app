// lib/hooks/useCalculations.ts
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

/**
 * Custom hooks para manejar cálculos financieros en el frontend
 * Incluye manejo de estado, loading, errores y caché
 */

// Tipos para los hooks
interface CalculationMetrics {
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
}

interface CalculationResponse {
    success: boolean;
    bondId: string;
    bondName: string;
    calculatedAt: string;
    metricas: CalculationMetrics;
    flowsCount: number;
    quickMetrics?: boolean;
    calculation?: {
        duration: string;
        recalculated: boolean;
        savedToDatabase: boolean;
    };
}

interface CalculationStatus {
    bondId: string;
    bondName: string;
    bondStatus: string;
    bondLastModified: string;
    calculation: {
        hasFlows: boolean;
        flowsCount: number;
        lastCalculated: string | null;
        needsRecalculation: boolean;
        reasons: string[];
    };
    actions: {
        canCalculate: boolean;
        shouldRecalculate: boolean;
    };
}

interface UseCalculationsOptions {
    autoCalculate?: boolean;
    refreshInterval?: number;
    onSuccess?: (result: CalculationResponse) => void;
    onError?: (error: Error) => void;
}

/**
 * Hook principal para manejar cálculos de bonos
 */
export function useCalculations(bondId?: string, options: UseCalculationsOptions = {}) {
    const { autoCalculate = false, refreshInterval = 0, onSuccess, onError } = options;

    const [isCalculating, setIsCalculating] = useState(false);
    const [calculationError, setCalculationError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<CalculationResponse | null>(null);

    // Obtener estado de cálculos del bono
    const {
        data: status,
        error: statusError,
        mutate: refreshStatus,
        isLoading: isLoadingStatus
    } = useSWR<CalculationStatus>(
        bondId ? `/api/bonds/${bondId}/calculate` : null,
        fetcher,
        {
            refreshInterval,
            revalidateOnFocus: false,
        }
    );

    // Función para ejecutar cálculos
    const calculate = useCallback(async (options: {
        recalculate?: boolean;
        saveResults?: boolean;
        quickMetrics?: boolean;
        inputs?: any; // ✅ CORRECCIÓN AQUÍ
    } = {}) => {
        if (!bondId) {
            throw new Error('Bond ID is required for calculations');
        }

        setIsCalculating(true);
        setCalculationError(null);

        try {
            const response = await fetch(`/api/bonds/${bondId}/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en cálculos');
            }

            const result: CalculationResponse = await response.json();
            setLastResult(result);

            // Refresh del status para reflejar cambios
            refreshStatus();

            if (onSuccess) {
                onSuccess(result);
            }

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setCalculationError(errorMessage);

            if (onError) {
                onError(error instanceof Error ? error : new Error(errorMessage));
            }

            throw error;
        } finally {
            setIsCalculating(false);
        }
    }, [bondId, onSuccess, onError, refreshStatus]);

    // Función para eliminar cálculos
    const clearCalculations = useCallback(async () => {
        if (!bondId) {
            throw new Error('Bond ID is required');
        }

        try {
            const response = await fetch(`/api/bonds/${bondId}/calculate`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error eliminando cálculos');
            }

            // Refresh del status
            refreshStatus();
            setLastResult(null);

        } catch (error) {
            console.error('Error clearing calculations:', error);
            throw error;
        }
    }, [bondId, refreshStatus]);

    // Auto-calcular si está habilitado y se necesita
    useEffect(() => {
        if (autoCalculate && status?.actions.shouldRecalculate && bondId) {
            console.log(`🔄 Auto-calculando bono ${bondId}...`);
            calculate({ recalculate: false, saveResults: true });
        }
    }, [autoCalculate, status?.actions.shouldRecalculate, bondId, calculate]);

    return {
        // Estado del cálculo
        status,
        isCalculating,
        isLoadingStatus,
        calculationError: calculationError || statusError?.message || null,
        lastResult,

        // Acciones
        calculate,
        clearCalculations,
        refreshStatus,

        // Helpers
        canCalculate: status?.actions.canCalculate ?? false,
        needsRecalculation: status?.actions.shouldRecalculate ?? false,
        hasFlows: status?.calculation.hasFlows ?? false,
        flowsCount: status?.calculation.flowsCount ?? 0,
        lastCalculated: status?.calculation.lastCalculated,

        // Funciones de conveniencia
        calculateQuick: () => calculate({ quickMetrics: true }),
        recalculate: () => calculate({ recalculate: true }),
        calculateAndSave: () => calculate({ recalculate: false, saveResults: true }),
    };
}

/**
 * Hook para obtener métricas de un bono (solo lectura)
 */
export function useBondMetrics(bondId: string | undefined, role: 'emisor' | 'inversionista' = 'inversionista') {
    const { status, lastResult, calculate, isCalculating } = useCalculations(bondId, {
        autoCalculate: true,
    });

    const metrics = lastResult?.metricas?.[role as keyof typeof lastResult.metricas] || null;


    return {
        metrics,
        isLoading: isCalculating,
        error: status ? null : 'No se pudieron cargar las métricas',

        // Métricas específicas de fácil acceso
        precioActual: metrics?.precioActual || 0,
        van: metrics?.van || 0,
        tir:
            role === 'emisor'
                ? (metrics as CalculationMetrics['emisor'])?.tceaEmisor || 0
                : (metrics as CalculationMetrics['bonista'])?.treaBonista || 0,
        duracion: metrics?.duracion || 0,
        convexidad: metrics?.convexidad || 0,

        // Acciones
        refresh: calculate,
    };
}

/**
 * Hook para validar inputs de cálculo en tiempo real
 */
export function useCalculationValidation() {
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isValidating, setIsValidating] = useState(false);

    const validateInputs = useCallback(async (inputs: any) => {
        setIsValidating(true);
        const errors: Record<string, string> = {};

        try {
            // Validaciones básicas
            if (!inputs.valorNominal || inputs.valorNominal <= 0) {
                errors.valorNominal = 'Valor nominal debe ser mayor a 0';
            }

            if (!inputs.valorComercial || inputs.valorComercial <= 0) {
                errors.valorComercial = 'Valor comercial debe ser mayor a 0';
            }

            if (!inputs.numAnios || inputs.numAnios <= 0) {
                errors.numAnios = 'Número de años debe ser mayor a 0';
            }

            if (!inputs.tasaAnual || inputs.tasaAnual < 0 || inputs.tasaAnual > 1) {
                errors.tasaAnual = 'Tasa anual debe estar entre 0% y 100%';
            }

            // Validación de series
            if (inputs.inflacionSerie && inputs.inflacionSerie.length !== inputs.numAnios) {
                errors.inflacionSerie = `Debe tener ${inputs.numAnios} valores de inflación`;
            }

            if (inputs.graciaSerie && inputs.graciaSerie.length !== inputs.numAnios) {
                errors.graciaSerie = `Debe tener ${inputs.numAnios} valores de gracia`;
            }

            setValidationErrors(errors);
            return Object.keys(errors).length === 0;

        } catch (error) {
            console.error('Error validating inputs:', error);
            return false;
        } finally {
            setIsValidating(false);
        }
    }, []);

    const clearValidation = useCallback(() => {
        setValidationErrors({});
    }, []);

    return {
        validationErrors,
        isValidating,
        validateInputs,
        clearValidation,
        isValid: Object.keys(validationErrors).length === 0,
    };
}

/**
 * Hook para cálculos en batch (múltiples bonos)
 */
export function useBatchCalculations() {
    const [isBatchCalculating, setIsBatchCalculating] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
    const [batchResults, setBatchResults] = useState<CalculationResponse[]>([]);
    const [batchErrors, setBatchErrors] = useState<string[]>([]);

    const calculateBatch = useCallback(async (bondIds: string[], options: {
        parallel?: boolean;
        batchSize?: number;
    } = {}) => {
        setIsBatchCalculating(true);
        setBatchProgress({ completed: 0, total: bondIds.length });
        setBatchResults([]);
        setBatchErrors([]);

        try {
            const { parallel = false, batchSize = 3 } = options;
            const results: CalculationResponse[] = [];
            const errors: string[] = [];

            if (parallel) {
                // Procesamiento en paralelo con batches
                for (let i = 0; i < bondIds.length; i += batchSize) {
                    const batch = bondIds.slice(i, i + batchSize);
                    const batchPromises = batch.map(async (bondId) => {
                        try {
                            const response = await fetch(`/api/bonds/${bondId}/calculate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ recalculate: true, saveResults: true }),
                            });

                            if (!response.ok) {
                                throw new Error(`Error calculando ${bondId}`);
                            }

                            return await response.json();
                        } catch (error) {
                            errors.push(`${bondId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                            return null;
                        }
                    });

                    const batchResults = await Promise.allSettled(batchPromises);

                    for (const result of batchResults) {
                        if (result.status === 'fulfilled' && result.value) {
                            results.push(result.value);
                        }
                    }

                    setBatchProgress({
                        completed: Math.min(i + batchSize, bondIds.length),
                        total: bondIds.length
                    });
                }
            } else {
                // Procesamiento secuencial
                for (let i = 0; i < bondIds.length; i++) {
                    try {
                        const response = await fetch(`/api/bonds/${bondIds[i]}/calculate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ recalculate: true, saveResults: true }),
                        });

                        if (!response.ok) {
                            throw new Error(`Error calculando ${bondIds[i]}`);
                        }

                        const result = await response.json();
                        results.push(result);
                    } catch (error) {
                        errors.push(`${bondIds[i]}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                    }

                    setBatchProgress({ completed: i + 1, total: bondIds.length });
                }
            }

            setBatchResults(results);
            setBatchErrors(errors);

            return { results, errors };

        } catch (error) {
            console.error('Error in batch calculation:', error);
            throw error;
        } finally {
            setIsBatchCalculating(false);
        }
    }, []);

    return {
        isBatchCalculating,
        batchProgress,
        batchResults,
        batchErrors,
        calculateBatch,

        // Helpers
        successCount: batchResults.length,
        errorCount: batchErrors.length,
        progressPercentage: batchProgress.total > 0
            ? Math.round((batchProgress.completed / batchProgress.total) * 100)
            : 0,
    };
}

/**
 * Función fetcher para SWR
 */
async function fetcher(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error fetching data');
    }

    return response.json();
}