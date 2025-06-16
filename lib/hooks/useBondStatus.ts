import { useState, useCallback } from 'react';

type BondStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export function useBondStatus(bondId: string) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateStatus = useCallback(async (newStatus: BondStatus) => {
        setIsUpdating(true);
        setError(null);

        try {
            const response = await fetch(`/api/bonds/${bondId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    publishedAt: newStatus === 'ACTIVE' ? new Date().toISOString() : null
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error actualizando estado');
            }

            return result.bond;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            throw err;
        } finally {
            setIsUpdating(false);
        }
    }, [bondId]);

    const publishBond = useCallback(() => updateStatus('ACTIVE'), [updateStatus]);
    const pauseBond = useCallback(() => updateStatus('PAUSED'), [updateStatus]);
    const completeBond = useCallback(() => updateStatus('COMPLETED'), [updateStatus]);
    const draftBond = useCallback(() => updateStatus('DRAFT'), [updateStatus]);

    return {
        updateStatus,
        publishBond,
        pauseBond,
        completeBond,
        draftBond,
        isUpdating,
        error,
    };
}