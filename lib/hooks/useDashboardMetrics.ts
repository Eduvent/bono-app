// lib/hooks/useDashboardMetrics.ts
import useSWR from 'swr';

interface DashboardMetrics {
    totalBonds: number;
    activeBonds: number;
    totalNominalValue: number;
    averageTCEA: number;
    interestPaidYTD: number;
    nextPayment: {
        amount: number;
        date: string | null;
    };
    draftBonds: number;
    pausedBonds: number;
    completedBonds: number;
}

interface DashboardMetricsResponse {
    success: boolean;
    metrics: DashboardMetrics;
    updatedAt: string;
}

const fetcher = async (url: string): Promise<DashboardMetricsResponse> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return response.json();
};

export function useDashboardMetrics(emisorId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<DashboardMetricsResponse>(
        emisorId ? `/api/emisor/${emisorId}/dashboard-metrics` : null,
        fetcher,
        {
            refreshInterval: 30000, // Refrescar cada 30 segundos
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            errorRetryCount: 3,
            errorRetryInterval: 1000,
        }
    );

    return {
        metrics: data?.metrics || null,
        isLoading,
        error: error?.message || null,
        refresh: mutate,
        lastUpdated: data?.updatedAt || null,
    };
}