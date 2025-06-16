// app/emisor/create-bond/page.tsx - VERSIÓN COMPLETAMENTE INTEGRADA
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

// Importar TODOS los componentes dinámicos
import { Step1Dynamic } from './components/Step1Dynamic';
import { Step2Dynamic } from './components/Step2Dynamic';
import { Step3Dynamic } from './components/Step3Dynamic';
import { Step4Dynamic } from './components/Step4Dynamic';

// Importar hooks
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreateBond } from '@/lib/hooks/useCreateBond';

// Interfaces actualizadas para incluir períodos de gracia
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
  const { user, isLoading: authLoading } = useAuth({ requireRole: 'EMISOR' });

  // Estados del wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [bondData, setBondData] = useState<BondData>({});
  const [flowsCalculated, setFlowsCalculated] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Estado para validación mejorada
  const [stepValidation, setStepValidation] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  // Hook para crear bono
  const { createBond, isCreating, error: createError } = useCreateBond({
    onSuccess: (bondId) => {
      localStorage.removeItem('bondWizardData');
      router.push(`/emisor/bond/${bondId}?created=true`);
    },
    onError: (error) => {
      console.error('❌ Error creando bono:', error);
      alert(`Error al crear el bono: ${error}`);
    },
  });

  // Cargar datos guardados
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const savedData = localStorage.getItem('bondWizardData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setBondData(parsed.bondData || {});
        setCurrentStep(parsed.currentStep || 1);
      } catch (error) {
        console.warn('Error parsing saved wizard data:', error);
      }
    }
  }, [user, authLoading, router]);

  // Guardar datos automáticamente
  const saveData = (stepData: any, step: number) => {
    const newData = { ...bondData, [`step${step}`]: stepData };
    setBondData(newData);

    // Guardar en localStorage
    localStorage.setItem('bondWizardData', JSON.stringify({
      bondData: newData,
      currentStep,
    }));

    // Validar el paso
    validateStep(step, stepData);
  };

  // Función de validación mejorada
  const validateStep = (step: number, data: any) => {
    let isValid = false;

    switch (step) {
      case 1:
        isValid = !!(data?.name && data?.valorNominal && data?.valorComercial && data?.numAnios);
        break;
      case 2:
        isValid = !!(data?.tasaAnual && data?.primaVencimiento && data?.impuestoRenta);
        break;
      case 3:
        isValid = !!(data?.estructuracionEmisor);
        break;
      case 4:
        isValid = flowsCalculated && confirmationChecked;
        break;
    }

    setStepValidation(prev => ({ ...prev, [`step${step}`]: isValid }));
  };

  // Utilidades
  const getProgressPercentage = () => (currentStep / 4) * 100;

  const canProceedToNext = () => {
    return stepValidation[`step${currentStep}` as keyof typeof stepValidation];
  };

  // Navegación
  const handleNext = () => {
    if (canProceedToNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Envío del bono
  const handleSubmit = async () => {
    if (!canProceedToNext() || !user?.emisorProfile?.id) return;

    try {
      // Transformar datos del wizard al formato de la API
      const bondPayload = {
        // Step 1: Datos básicos (corregir nombres de campos)
        name: bondData.step1?.name,
        codigoIsin: bondData.step1?.codigoIsin,
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
        tasaDescuento: parseFloat(bondData.step2?.tasaAnual || '0') / 100, // Por ahora igual
        inflacionSerie: bondData.step2?.indexadoInflacion
            ? Array(parseInt(bondData.step1?.numAnios || '1')).fill(parseFloat(bondData.step2?.inflacionAnual || '0') / 100)
            : Array(parseInt(bondData.step1?.numAnios || '1')).fill(0),
        primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0') / 100,
        impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30') / 100,

        // Step 2: Períodos de gracia transformados
        graciaSerie: bondData.step2?.gracePeriodsConfig?.map(config => config.graceType) || [],

        // Step 3: Costes (corregir nombres de campos)
        estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0') / 100,
        colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0') / 100,
        flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0') / 100,
        cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0') / 100,

        // Metadata
        emisorId: user.emisorProfile.id,
      };

      console.log('🚀 Enviando datos del bono:', bondPayload);

      await createBond(bondPayload);

    } catch (error) {
      console.error('❌ Error al crear el bono:', error);
    }
  };

  // Loading state
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
              <p className="text-gray-400">
                Complete la información necesaria para configurar su nuevo bono
              </p>
            </div>

            {/* Progress Section */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Progreso: {getProgressPercentage().toFixed(0)}%
                </div>
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
                      <span
                          className={`text-xs font-medium ${
                              step <= currentStep ? 'text-[#39FF14]' : 'text-gray-500'
                          }`}
                      >
                    {['Datos', 'Finanzas', 'Costes', 'Revisión'][step - 1]}
                  </span>
                    </div>
                ))}
              </div>
            </div>

            {/* Form Content - USAR TODOS LOS COMPONENTES DINÁMICOS */}
            <div className="px-6 pb-6">
              {currentStep === 1 && (
                  <Step1Dynamic bondData={bondData} saveData={saveData} />
              )}
              {currentStep === 2 && (
                  <Step2Dynamic bondData={bondData} saveData={saveData} />
              )}
              {currentStep === 3 && (
                  <Step3Dynamic bondData={bondData} saveData={saveData} />
              )}
              {currentStep === 4 && (
                  <Step4Dynamic
                      bondData={bondData}
                      flowsCalculated={flowsCalculated}
                      setFlowsCalculated={setFlowsCalculated}
                      confirmationChecked={confirmationChecked}
                      setConfirmationChecked={setConfirmationChecked}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                  />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10">
                <button
                    onClick={
                      currentStep === 1 ? () => router.push('/emisor/dashboard') : handlePrevious
                    }
                    className="px-6 py-3 border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#1A1A1A] transition flex items-center"
                >
                  <ArrowLeft className="mr-2" size={16} />
                  {currentStep === 1 ? 'Cancelar' : 'Anterior'}
                </button>

                {currentStep < 4 ? (
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
                ) : (
                    <button
                        onClick={handleSubmit}
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
                            Publicando...
                          </>
                      ) : (
                          <>
                            Publicar Bono
                            <PaperPlane className="ml-2" size={16} />
                          </>
                      )}
                    </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}