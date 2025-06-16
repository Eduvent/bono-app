// app/emisor/create-bond/page.tsx - VERSIÓN FINAL CORREGIDA
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  ArrowRight,
  Check,
  PlaneIcon as PaperPlane,
} from 'lucide-react';

// Importar componentes dinámicos CORRECTOS
import { Step1Dynamic } from './components/Step1Dynamic';
import { Step2Dynamic } from './components/Step2Dynamic';
import { Step3Dynamic } from './components/Step3Dynamic';
import { Step4Dynamic } from './components/Step4Dynamic';

// Importar hooks
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateBond } from '@/lib/hooks/useCreateBond';

// Función helper para generar CUID válido (para desarrollo)
function generateValidCUID(): string {
  // Generar un CUID básico válido para desarrollo
  // En producción, esto debería venir del backend de autenticación real
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `cl${timestamp}${randomPart}`.substring(0, 25); // CUIDs tienen ~25 caracteres
}

interface GracePeriodConfig {
  couponNumber: number;
  graceType: 'T' | 'P' | 'S';
}

interface BondData {
  step1?: {
    name: string;
    codigoIsin: string;
    valorNominal: string;
    valorComercial: string;
    numAnios: string;
    fechaEmision: string;
    frecuenciaCupon: string;
    diasPorAno: string;
  };
  step2?: {
    tipoTasa: string;
    periodicidadCapitalizacion: string;
    tasaAnual: string;
    indexadoInflacion: boolean;
    inflacionAnual: string;
    primaVencimiento: string;
    impuestoRenta: string;
    numGracePeriods: number;
    gracePeriodsConfig: GracePeriodConfig[];
  };
  step3?: {
    estructuracionEmisor: string;
    colocacionEmisor: string;
    flotacionEmisor: string;
    cavaliEmisor: string;
    emisorTotalAbs: string;
    bonistaTotalAbs: string;
    totalCostsAbs: string;
    flotacionBonista: string;
    cavaliBonista: string;
  };
}

export default function CreateBondWizard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth({
    requireRole: 'EMISOR',
    redirectTo: '/auth/login'
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [bondData, setBondData] = useState<BondData>({});
  const [createdBondId, setCreatedBondId] = useState<string | null>(null);

  // Hook para crear bono con manejo de errores mejorado
  const { createBond, isCreating, error: createError } = useCreateBond({
    onSuccess: (bondId) => {
      console.log('✅ Bono creado con ID:', bondId);
      setCreatedBondId(bondId);
      setCurrentStep(4); // Avanzar al Step 4
    },
    onError: (error) => {
      console.error('❌ Error creando bono:', error);
      alert(`Error al crear el bono: ${error}`);
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const savedData = localStorage.getItem('bondWizardData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setBondData(parsed);
      } catch (error) {
        console.warn('Error parsing saved wizard data:', error);
      }
    }
  }, [user, authLoading]);

  const saveData = (stepData: any, step: number) => {
    const newData = { ...bondData, [`step${step}`]: stepData };
    setBondData(newData);
    localStorage.setItem('bondWizardData', JSON.stringify(newData));
  };

  const getProgressPercentage = () => (currentStep / 4) * 100;

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return bondData.step1?.name && bondData.step1?.valorNominal && bondData.step1?.valorComercial;
      case 2:
        return bondData.step2?.tasaAnual && bondData.step2?.primaVencimiento && bondData.step2?.impuestoRenta;
      case 3:
        return bondData.step3?.estructuracionEmisor;
      case 4:
        return !!createdBondId;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 3 && canProceedToNext()) {
      handleCreateBond(); // Crear bono al pasar del Step 3 al 4
    } else if (canProceedToNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateBond = async () => {
    if (!user?.emisorProfile?.id) return;

    try {
      // Generar un emisorId válido para desarrollo
      const validEmisorId = user.emisorProfile.id === 'local-emisor'
          ? generateValidCUID()
          : user.emisorProfile.id;

      console.log('📤 Creando bono con emisorId:', validEmisorId);

      // Preparar payload con mapeo correcto de campos
      const bondPayload = {
        // Step 1: Datos básicos
        name: bondData.step1?.name,
        codigoIsin: bondData.step1?.codigoIsin || '',
        valorNominal: parseFloat(bondData.step1?.valorNominal || '0'),
        valorComercial: parseFloat(bondData.step1?.valorComercial || '0'),
        numAnios: parseInt(bondData.step1?.numAnios || '1'),
        fechaEmision: bondData.step1?.fechaEmision,
        frecuenciaCupon: bondData.step1?.frecuenciaCupon,
        diasPorAno: parseInt(bondData.step1?.diasPorAno || '360'),

        // Step 2: Condiciones financieras
        tipoTasa: bondData.step2?.tipoTasa,
        periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion,
        tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0') / 100, // Convertir a decimal
        tasaDescuento: parseFloat(bondData.step2?.tasaAnual || '0') / 100,
        inflacionSerie: bondData.step2?.indexadoInflacion
            ? Array(parseInt(bondData.step1?.numAnios || '1')).fill(parseFloat(bondData.step2?.inflacionAnual || '0') / 100)
            : Array(parseInt(bondData.step1?.numAnios || '1')).fill(0),
        primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0') / 100,
        impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30') / 100,

        // Step 3: Costes (mapeo correcto)
        estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0') / 100,
        colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0') / 100,
        flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0') / 100,
        cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0') / 100,

        // Períodos de gracia
        graciaSerie: bondData.step2?.gracePeriodsConfig?.map(config => config.graceType) || [],

        // Emisor ID válido
        emisorId: validEmisorId,
      };

      console.log('📤 Payload final:', bondPayload);
      await createBond(bondPayload);
    } catch (error) {
      console.error('❌ Error al crear el bono:', error);
    }
  };

  const handleFinalSubmit = () => {
    localStorage.removeItem('bondWizardData');
    router.push(`/emisor/bond/${createdBondId}?created=true`);
  };

  if (authLoading) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
            <p className="text-white mt-4">Cargando...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
        {/* Header */}
        <header className="fixed top-0 left-0 w-full bg-black bg-opacity-75 backdrop-blur-md z-50 py-4">
          <div className="container mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center">
              <ChartLine className="text-[#39FF14] text-2xl mr-2" size={24} />
              <span className="text-white text-xl font-semibold">BonoApp</span>
            </div>
            <button
                onClick={() => router.push('/emisor/dashboard')}
                className="text-gray-400 hover:text-white transition flex items-center"
            >
              <ArrowLeft className="mr-1" size={16} />
              Volver
            </button>
          </div>
        </header>

        <main className="container mx-auto px-6 pt-24 pb-8 flex justify-center">
          <div className="bg-[#151515] rounded-xl w-full max-w-[960px] overflow-hidden">
            {/* Wizard Header */}
            <div className="border-b border-[#2A2A2A] p-6">
              <h1 className="text-2xl font-bold mb-1">Crear Nuevo Bono</h1>
              <p className="text-gray-400">Complete la información necesaria para configurar su nuevo bono</p>
            </div>

            {/* Progress Section */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Progreso: {getProgressPercentage().toFixed(0)}%</div>
                <div className="text-sm text-gray-400">Paso {currentStep} de 4</div>
              </div>
              <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#39FF14] transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              {/* Steps Indicator */}
              <div className="flex justify-between mt-4 pb-6 relative">
                <div className="absolute top-3 left-0 right-0 h-0.5 bg-[#2A2A2A] -z-10" />
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex flex-col items-center z-10">
                      <div
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold mb-2 ${
                              step < currentStep
                                  ? 'bg-[#39FF14] text-black'
                                  : step === currentStep
                                      ? 'bg-[#39FF14] text-black'
                                      : 'bg-[#2A2A2A] text-gray-500'
                          }`}
                      >
                        {step < currentStep ? <Check size={12} /> : step}
                      </div>
                      <span className={`text-xs font-medium ${step <= currentStep ? 'text-[#39FF14]' : 'text-gray-500'}`}>
                                        {['Datos', 'Finanzas', 'Costes', 'Revisión'][step - 1]}
                                    </span>
                    </div>
                ))}
              </div>
            </div>

            {/* Form Content - USAR COMPONENTES DINÁMICOS */}
            <div className="px-6 pb-6">
              {currentStep === 1 && <Step1Dynamic bondData={bondData} saveData={saveData} />}
              {currentStep === 2 && <Step2Dynamic bondData={bondData} saveData={saveData} />}
              {currentStep === 3 && <Step3Dynamic bondData={bondData} saveData={saveData} />}
              {currentStep === 4 && (
                  <Step4Dynamic
                      bondData={{
                        // Mapear correctamente los nombres de campos
                        step1: bondData.step1 ? {
                          ...bondData.step1,
                          nombreInterno: bondData.step1.name // Mapeo para compatibilidad
                        } : undefined,
                        step2: bondData.step2,
                        step3: bondData.step3
                      }}
                      bondId={createdBondId || undefined}
                  />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10">
                <button
                    onClick={currentStep === 1 ? () => router.push('/emisor/dashboard') : handlePrevious}
                    className="px-6 py-3 border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#1A1A1A] transition flex items-center"
                    disabled={isCreating}
                >
                  <ArrowLeft className="mr-2" size={16} />
                  {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                </button>

                {currentStep < 3 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                        className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                            canProceedToNext()
                                ? 'bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      Guardar y Continuar
                      <ArrowRight className="ml-2" size={16} />
                    </button>
                ) : currentStep === 3 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceedToNext() || isCreating}
                        className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                            canProceedToNext() && !isCreating
                                ? 'bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {isCreating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                            Creando Bono...
                          </>
                      ) : (
                          <>
                            Crear Bono
                            <ArrowRight className="ml-2" size={16} />
                          </>
                      )}
                    </button>
                ) : (
                    <button
                        onClick={handleFinalSubmit}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center"
                    >
                      Ir al Dashboard
                      <ArrowRight className="ml-2" size={16} />
                    </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}