import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CreateBondData {
    // Step 1
    name: string;
    codigoIsin?: string;
    valorNominal: number;
    valorComercial: number;
    numAnios: number;
    fechaEmision: string;
    frecuenciaCupon: 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';
    diasPorAno: number;

    // Step 2
    tipoTasa: 'nominal' | 'efectiva';
    periodicidadCapitalizacion: string;
    tasaAnual: number;
    tasaDescuento: number;
    inflacionSerie: number[];
    primaPorcentaje: number;
    impuestoRenta: number;

    // Step 3
    estructuracionPorcentaje: number;
    colocacionPorcentaje: number;
    flotacionPorcentaje: number;
    cavaliPorcentaje: number;

    // Gracia
    graciaSerie: ('S' | 'P' | 'T')[];

    // Metadata
    emisorId: string;
}

interface UseCreateBondOptions {
    onSuccess?: (bondId: string) => void;
    onError?: (error: string) => void;
    autoRedirect?: boolean;
}

export function useCreateBond(options: UseCreateBondOptions = {}) {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdBondId, setCreatedBondId] = useState<string | null>(null);
    const router = useRouter();

    const createBond = useCallback(async (data: CreateBondData) => {
        setIsCreating(true);
        setError(null);

        try {
            const response = await fetch('/api/bonds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error creando bono');
            }

            setCreatedBondId(result.bondId);

            // Callbacks
            options.onSuccess?.(result.bondId);

            // Auto-redirect
            if (options.autoRedirect) {
                router.push(`/emisor/bond/${result.bondId}`);
            }

            return result;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            options.onError?.(errorMessage);
            throw err;
        } finally {
            setIsCreating(false);
        }
    }, [options, router]);

    const reset = useCallback(() => {
        setError(null);
        setCreatedBondId(null);
    }, []);

    return {
        createBond,
        isCreating,
        error,
        createdBondId,
        reset,
    };
}