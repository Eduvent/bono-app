import { useState, useCallback, useEffect } from 'react';
import { useCreateBond } from './useCreateBond';

interface WizardStep {
    isValid: boolean;
    data: any;
}

interface UseBondWizardOptions {
    persistKey?: string;
    onComplete?: (bondId: string) => void;
}

export function useBondWizard(emisorId: string, options: UseBondWizardOptions = {}) {
    const { persistKey = 'bondWizardData', onComplete } = options;

    const [currentStep, setCurrentStep] = useState(1);
    const [steps, setSteps] = useState<Record<number, WizardStep>>({
        1: { isValid: false, data: {} },
        2: { isValid: false, data: {} },
        3: { isValid: false, data: {} },
        4: { isValid: false, data: {} },
    });

    const { createBond, isCreating, error, createdBondId } = useCreateBond({
        onSuccess: onComplete,
    });

    // Cargar datos persistidos
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(persistKey);
            if (saved) {
                try {
                    const parsedData = JSON.parse(saved);
                    setSteps(parsedData.steps || steps);
                    setCurrentStep(parsedData.currentStep || 1);
                } catch (e) {
                    console.warn('Error parsing saved wizard data:', e);
                }
            }
        }
    }, [persistKey, steps]);

    // Persistir datos
    const persistData = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(persistKey, JSON.stringify({
                steps,
                currentStep,
            }));
        }
    }, [steps, currentStep, persistKey]);

    // Actualizar step
    const updateStep = useCallback((stepNumber: number, data: any, isValid: boolean) => {
        setSteps(prev => ({
            ...prev,
            [stepNumber]: { data, isValid }
        }));
        persistData();
    }, [persistData]);

    // Navegación
    const goToStep = useCallback((stepNumber: number) => {
        if (stepNumber >= 1 && stepNumber <= 4) {
            setCurrentStep(stepNumber);
            persistData();
        }
    }, [persistData]);

    const nextStep = useCallback(() => {
        if (currentStep < 4 && steps[currentStep]?.isValid) {
            setCurrentStep(prev => prev + 1);
            persistData();
        }
    }, [currentStep, steps, persistData]);

    const previousStep = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            persistData();
        }
    }, [currentStep, persistData]);

    // Validación y envío
    const canProceed = useCallback((step: number) => {
        return steps[step]?.isValid || false;
    }, [steps]);

    const submitBond = useCallback(async () => {
        // Validar que todos los steps estén completos
        const allValid = Object.values(steps).every(step => step.isValid);
        if (!allValid) {
            throw new Error('Faltan datos requeridos en el formulario');
        }

        // Consolidar datos de todos los steps
        const bondData = {
            ...steps[1].data,
            ...steps[2].data,
            ...steps[3].data,
            emisorId,
        };

        const result = await createBond(bondData);

        // Limpiar datos persistidos
        if (typeof window !== 'undefined') {
            localStorage.removeItem(persistKey);
        }

        return result;
    }, [steps, emisorId, createBond, persistKey]);

    return {
        // Estado actual
        currentStep,
        steps,

        // Navegación
        goToStep,
        nextStep,
        previousStep,
        canProceed,

        // Gestión de datos
        updateStep,

        // Envío
        submitBond,
        isCreating,
        error,
        createdBondId,

        // Utilidades
        progress: (currentStep / 4) * 100,
        isLastStep: currentStep === 4,
        isFirstStep: currentStep === 1,
    };
}