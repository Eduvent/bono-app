import useSWR from 'swr';
import {useCallback, useMemo} from 'react';

interface BondSummary {
    id: string;
    name: string;
    codigoIsin: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    nominalValue: number;
    commercialValue: number;
    years: number;
    couponFrequency: string;
    tceaEmisor: number | null;
    van: number | null;
    duracion: number | null;
    flowsCount: number;
    investorsCount: number;
    hasFlows: boolean;
    isPublished: boolean;
}

interface UseEmisorBondsOptions {
    status?: 'all' | 'draft' | 'active' | 'paused' | 'completed';
    refreshInterval?: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useEmisorBonds(emisorId: string, options: UseEmisorBondsOptions = {}) {
    const { status = 'all', refreshInterval = 30000 } = options;

    // Construir URL con filtros
    const url = useMemo(() => {
        if (!emisorId) return null;
        const params = new URLSearchParams();
        if (status !== 'all') params.set('status', status);
        return `/api/emisor/${emisorId}/bonds?${params.toString()}`;
    }, [emisorId, status]);

    const { data, error, mutate, isLoading } = useSWR(
        url,
        fetcher,
        {
            refreshInterval,
            revalidateOnFocus: false,
        }
    );

    // Métricas calculadas
    const metrics = useMemo(() => {
        if (!data?.bonds) return null;

        const bonds: BondSummary[] = data.bonds;

        return {
            totalBonds: bonds.length,
            activeBonds: bonds.filter(b => b.status === 'ACTIVE').length,
            draftBonds: bonds.filter(b => b.status === 'DRAFT').length,
            totalNominalValue: bonds.reduce((sum, b) => sum + b.nominalValue, 0),
            totalCommercialValue: bonds.reduce((sum, b) => sum + b.commercialValue, 0),
            bondsWithFlows: bonds.filter(b => b.hasFlows).length,
            averageTCEA: bonds
                .filter(b => b.tceaEmisor !== null)
                .reduce((sum, b, _, arr) => sum + (b.tceaEmisor! / arr.length), 0),
        };
    }, [data?.bonds]);

    // Función para filtrar bonos
    const filterBonds = useCallback((searchTerm: string, statusFilter: string) => {
        if (!data?.bonds) return [];

        return data.bonds.filter((bond: BondSummary) => {
            const matchesStatus = statusFilter === 'all' || bond.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = bond.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bond.codigoIsin.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [data?.bonds]);

    return {
        bonds: data?.bonds || [],
        metrics,
        isLoading,
        error: error?.message || null,
        refresh: mutate,
        filterBonds,
    };
}
