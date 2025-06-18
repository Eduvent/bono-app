import useSWR from 'swr';
import {useCallback, useMemo} from 'react';

interface BondSummary {
    id: string;
    name: string;
    codigoIsin: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    nominalValue: number;      // valorNominal
    commercialValue: number;   // valorComercial
    years: number;             // numAnios
    emissionDate?: string;     // fechaEmision
    maturityDate?: string;     // fechaVencimiento
    couponFrequency: string;   // frecuenciaCupon
    rateType?: string;         // tipoTasa
    annualRate?: number;       // tasaAnual
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

    const bonds = useMemo(() => {
        if (!data?.bonds) return [] as BondSummary[];
        return (data.bonds as any[]).map((b) => ({
            id: b.id,
            name: b.name,
            codigoIsin: b.codigoIsin,
            status: b.status,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
            nominalValue: b.valorNominal,
            commercialValue: b.valorComercial,
            years: b.numAnios,
            emissionDate: b.fechaEmision,
            maturityDate: b.fechaVencimiento,
            couponFrequency: b.frecuenciaCupon,
            rateType: b.tipoTasa,
            annualRate: b.tasaAnual,
            tceaEmisor: b.tceaEmisor ?? null,
            van: b.van ?? null,
            duracion: b.duracion ?? null,
            flowsCount: b.flowsCount ?? 0,
            investorsCount: b.investorsCount ?? 0,
            hasFlows: b.hasFlows ?? false,
            isPublished: b.isPublished ?? false,
        }));
    }, [data?.bonds]);


    // Métricas calculadas
    const metrics = useMemo(() => {
        if (!bonds.length) return null;
        const list = bonds as BondSummary[];
        return {
            totalBonds: list.length,
            activeBonds: list.filter(b => b.status === 'ACTIVE').length,
            draftBonds: list.filter(b => b.status === 'DRAFT').length,
            totalNominalValue: list.reduce((sum, b) => sum + b.nominalValue, 0),
            totalCommercialValue: list.reduce((sum, b) => sum + b.commercialValue, 0),
            bondsWithFlows: list.filter(b => b.hasFlows).length,
            averageTCEA: list
                .filter(b => b.tceaEmisor !== null)
                .reduce((sum, b, _, arr) => sum + (b.tceaEmisor! / arr.length), 0),
        };
    }, [bonds]);

    // Función para filtrar bonos
    const filterBonds = useCallback((searchTerm: string, statusFilter: string) => {
        if (!bonds.length) return [];

        return bonds.filter((bond: BondSummary) => {
            const matchesStatus = statusFilter === 'all' || bond.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = bond.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bond.codigoIsin.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [bonds]);

    return {
        bonds,
        metrics,
        isLoading,
        error: error?.message || null,
        refresh: mutate,
        filterBonds,
    };
}
