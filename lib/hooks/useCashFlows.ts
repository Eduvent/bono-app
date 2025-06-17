// lib/hooks/useCashFlows.ts
import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';

/**
 * Custom hooks para manejar flujos de caja segmentados por rol
 */

// Tipos para flujos del emisor
export interface EmisorCashFlow {
    periodo: number;
    fecha: string;
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

// Tipos para flujos del inversionista
export interface InversionistaCashFlow {
    periodo: number;
    fecha: string;
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

interface FlowSummary {
    totalPeriods: number;
    dateRange: {
        start: string;
        end: string;
    } | null;
    totals: {
        emisorFlow: number;
        bonistaFlow: number;
    } | null;
    lastUpdated: string | null;
}

interface CashFlowsResponse {
    success: boolean;
    bondId: string;
    bondName: string;
    bondStatus: string;
    role: 'emisor' | 'inversionista';
    summary: FlowSummary;
    filters: {
        periodFrom?: number;
        periodTo?: number;
        appliedFilters: boolean;
    };
    flows: EmisorCashFlow[] | InversionistaCashFlow[];
    metadata: {
        flowsCount: number;
        columnsShown: string[];
        currency: string;
        generatedAt: string;
    };
}

interface UseCashFlowsOptions {
    role: 'emisor' | 'inversionista';
    periodFrom?: number;
    periodTo?: number;
    autoCalculate?: boolean;
    refreshInterval?: number;
    format?: 'json' | 'csv';
}

// ✅ CORRECCIÓN 1: Tipos auxiliares para el genérico
type Role = 'emisor' | 'inversionista';
type FlowType<R extends Role> = R extends 'emisor' ? EmisorCashFlow : InversionistaCashFlow;


/**
 * Hook principal para obtener flujos de caja
 */
// ✅ CORRECCIÓN 2: Firma del hook genérica
export function useCashFlows<R extends Role>(
    bondId: string | undefined,
    options: UseCashFlowsOptions & { role: R }
) {
    const {
        role,
        periodFrom,
        periodTo,
        autoCalculate = true,
        refreshInterval = 0,
        format = 'json'
    } = options;

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    // Construir URL con parámetros
    const url = useMemo(() => {
        if (!bondId) return null;

        const params = new URLSearchParams({
            role,
            auto_calculate: autoCalculate.toString(),
            format,
        });

        if (periodFrom !== undefined) params.set('period_from', periodFrom.toString());
        if (periodTo !== undefined) params.set('period_to', periodTo.toString());

        return `/api/bonds/${bondId}/flows?${params.toString()}`;
    }, [bondId, role, periodFrom, periodTo, autoCalculate, format]);

    // Obtener flujos con SWR
    const {
        data,
        error,
        mutate,
        isLoading
    } = useSWR<CashFlowsResponse>(
        url,
        fetcher,
        {
            refreshInterval,
            revalidateOnFocus: false,
            errorRetryCount: 2,
        }
    );

    // Función para refrescar/recalcular flujos
    const refreshFlows = useCallback(async (forceRecalculate = false) => {
        if (!bondId) return;

        setIsRefreshing(true);
        setRefreshError(null);

        try {
            if (forceRecalculate) {
                // Forzar recálculo via POST
                const response = await fetch(`/api/bonds/${bondId}/flows`, {
                    method: 'POST',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error recalculando flujos');
                }
            }
            await mutate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error refrescando flujos';
            setRefreshError(errorMessage);
            console.error('Error refreshing flows:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [bondId, mutate]);

    // Función para descargar CSV
    const downloadCSV = useCallback(async () => {
        if (!bondId) return;

        try {
            const response = await fetch(`/api/bonds/${bondId}/flows?role=${role}&format=csv`);

            if (!response.ok) throw new Error('Error descargando CSV');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `flujos_${data?.bondName || bondId}_${role}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading CSV:', error);
            throw error;
        }
    }, [bondId, role, data?.bondName]);

    // ✅ CORRECCIÓN 3: 'flows' tipado con el genérico
    const flows = useMemo(() => {
        if (!data?.flows) return [] as FlowType<R>[];
        return data.flows as FlowType<R>[];
    }, [data?.flows]);

    return {
        // Datos
        flows,
        summary: data?.summary || null,
        metadata: data?.metadata || null,
        // Estado
        isLoading,
        isRefreshing,
        error: error?.message || refreshError,
        // Información del bono
        bondId: data?.bondId,
        bondName: data?.bondName,
        bondStatus: data?.bondStatus,
        // Filtros aplicados
        filters: data?.filters || { appliedFilters: false },
        // Acciones
        refreshFlows,
        downloadCSV,
        mutate,
        // Helpers
        hasFlows: flows.length > 0,
        flowsCount: flows.length,
        isEmpty: !isLoading && flows.length === 0,
        isFiltered: data?.filters.appliedFilters || false,
        // Funciones de conveniencia
        recalculate: () => refreshFlows(true),
        refresh: () => refreshFlows(false),
    };
}

/**
 * Hook para obtener solo el resumen de flujos (más liviano)
 */
export function useCashFlowsSummary(bondId: string | undefined) {
    const { summary, metadata, isLoading, error, bondName } = useCashFlows(bondId, {
        role: 'inversionista', // Role no importa para el resumen
        autoCalculate: false, // No auto-calcular para el resumen
    });

    return {
        summary,
        metadata,
        isLoading,
        error,
        bondName,

        // Helpers específicos del resumen
        totalPeriods: summary?.totalPeriods || 0,
        dateRange: summary?.dateRange,
        totals: summary?.totals,
        lastUpdated: summary?.lastUpdated,
        hasData: Boolean(summary && summary.totalPeriods > 0),
    };
}

/**
 * Hook para comparar flujos emisor vs inversionista
 */
export function useComparativeFlows(bondId: string | undefined) {
    const emisorFlows = useCashFlows(bondId, { role: 'emisor', autoCalculate: true });
    const inversionistaFlows = useCashFlows(bondId, { role: 'inversionista', autoCalculate: false });

    const combinedFlows = useMemo(() => {
        if (!emisorFlows.flows.length || !inversionistaFlows.flows.length) {
            return [];
        }

        const emisor = emisorFlows.flows as EmisorCashFlow[];
        const inversionista = inversionistaFlows.flows as InversionistaCashFlow[];

        return emisor.map((emisorFlow, index) => {
            const invFlow = inversionista[index];

            return {
                periodo: emisorFlow.periodo,
                fecha: emisorFlow.fecha,
                inflacionAnual: emisorFlow.inflacionAnual,
                bonoIndexado: emisorFlow.bonoIndexado,
                cupon: emisorFlow.cupon,
                amortizacion: emisorFlow.amortizacion,

                // Flujos del emisor
                flujoEmisor: emisorFlow.flujoEmisor,
                flujoEmisorConEscudo: emisorFlow.flujoEmisorConEscudo,
                escudoFiscal: emisorFlow.escudoFiscal,

                // Flujos del inversionista
                flujoBonista: invFlow?.flujoBonista || null,
                flujoActualizado: invFlow?.flujoActualizado || null,

                // Verificación de consistencia
                isConsistent: emisorFlow.flujoEmisor !== null && invFlow?.flujoBonista !== null
                    ? Math.abs((emisorFlow.flujoEmisor + invFlow.flujoBonista)) < 0.01
                    : true,
            };
        });
    }, [emisorFlows.flows, inversionistaFlows.flows]);

    return {
        combinedFlows,

        // Estado combinado
        isLoading: emisorFlows.isLoading || inversionistaFlows.isLoading,
        error: emisorFlows.error || inversionistaFlows.error,

        // Acciones combinadas
        refreshAll: async () => {
            await Promise.all([
                emisorFlows.refreshFlows(),
                inversionistaFlows.refreshFlows(),
            ]);
        },

        recalculateAll: async () => {
            await emisorFlows.recalculate();
            // El inversionista se actualiza automáticamente
        },

        // Estados individuales
        emisor: emisorFlows,
        inversionista: inversionistaFlows,

        // Helpers
        hasData: combinedFlows.length > 0,
        inconsistentFlows: combinedFlows.filter(f => !f.isConsistent),
        hasInconsistencies: combinedFlows.some(f => !f.isConsistent),
    };
}

/**
 * Hook para filtrar y paginar flujos
 */
export function useFilteredCashFlows(
    bondId: string | undefined,
    role: 'emisor' | 'inversionista',
    options: {
        pageSize?: number;
        searchTerm?: string;
        periodRange?: [number, number];
    } = {}
) {
    const { pageSize = 10, searchTerm = '', periodRange } = options;
    const [currentPage, setCurrentPage] = useState(1);

    const cashFlowsOptions: UseCashFlowsOptions = {
        role,
        autoCalculate: true,
    };

    if (periodRange) {
        cashFlowsOptions.periodFrom = periodRange[0];
        cashFlowsOptions.periodTo = periodRange[1];
    }

    const { flows, ...rest } = useCashFlows(bondId, cashFlowsOptions);

    // Filtrar por término de búsqueda
    const filteredFlows = useMemo(() => {
        if (!searchTerm) return flows;

        return flows.filter(flow => {
            const searchLower = searchTerm.toLowerCase();
            return (
                flow.periodo.toString().includes(searchLower) ||
                flow.fecha.includes(searchLower) ||
                ('periodoGracia' in flow && flow.periodoGracia?.toLowerCase().includes(searchLower))
            );
        });
    }, [flows, searchTerm]);

    // Paginar resultados
    const paginatedFlows = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredFlows.slice(startIndex, endIndex);
    }, [filteredFlows, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredFlows.length / pageSize);

    return {
        ...rest,
        flows: paginatedFlows,

        // Paginación
        currentPage,
        totalPages,
        pageSize,
        totalItems: filteredFlows.length,

        // Navegación
        nextPage: () => setCurrentPage(page => Math.min(page + 1, totalPages)),
        prevPage: () => setCurrentPage(page => Math.max(page - 1, 1)),
        goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),

        // Filtros
        searchTerm,
        periodRange,
        isFiltered: Boolean(searchTerm || periodRange),

        // Helpers
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        startItem: (currentPage - 1) * pageSize + 1,
        endItem: Math.min(currentPage * pageSize, filteredFlows.length),
    };
}

/**
 * Función fetcher para SWR
 */
async function fetcher(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error fetching cash flows');
    }

    return response.json();
}