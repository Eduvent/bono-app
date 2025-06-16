// app/emisor/create-bond/page.tsx - VERSIÓN MIGRADA
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  ArrowRight,
  Check,
  PlaneIcon as PaperPlane,
  Plus,
} from 'lucide-react';

// Importar los nuevos componentes dinámicos
import { Step2Dynamic } from './components/Step2Dynamic';
import { Step3Dynamic } from './components/Step3Dynamic';

// Interfaces actualizadas para incluir períodos de gracia
interface GracePeriodConfig {
  couponNumber: number;
  graceType: 'T' | 'P' | 'S';
}

interface BondData {
  step1?: {
    nombreInterno: string;
    codigoISIN: string;
    valorNominal: string;
    valorComercial: string;
    numAnios: string;
    fechaEmision: string;
    frecuenciaCupon: string;
    baseDias: string;
  };
  step2?: {
    tipoTasa: string;
    periodicidadCapitalizacion: string;
    tasaAnual: string;
    indexadoInflacion: boolean;
    inflacionAnual: string;
    primaVencimiento: string;
    impuestoRenta: string;
    // 🆕 Nuevos campos para períodos de gracia
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
  const [currentStep, setCurrentStep] = useState(1);
  const [bondData, setBondData] = useState<BondData>({});
  const [flowsCalculated, setFlowsCalculated] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🆕 Estado para validación mejorada
  const [stepValidation, setStepValidation] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'emisor') {
      router.push('/auth/login');
      return;
    }

    // Load saved data
    const savedData = localStorage.getItem('bondWizardData');
    if (savedData) {
      setBondData(JSON.parse(savedData));
    }
  }, [router]);

  const saveData = (stepData: any, step: number) => {
    const newData = { ...bondData, [`step${step}`]: stepData };
    setBondData(newData);
    localStorage.setItem('bondWizardData', JSON.stringify(newData));

    // 🆕 Actualizar validación del paso
    validateStep(step, stepData);
  };

  // 🆕 Función de validación mejorada
  const validateStep = (step: number, data: any) => {
    let isValid = false;

    switch (step) {
      case 1:
        isValid = !!(data?.nombreInterno && data?.valorNominal && data?.valorComercial);
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

  const getProgressPercentage = () => (currentStep / 4) * 100;

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return stepValidation.step1;
      case 2:
        return stepValidation.step2;
      case 3:
        return stepValidation.step3;
      case 4:
        return stepValidation.step4;
      default:
        return false;
    }
  };

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

  const handleSubmit = async () => {
    if (!canProceedToNext()) return;

    setIsSubmitting(true);

    try {
      // 🆕 Preparar datos para API - incluir períodos de gracia
      const bondPayload = {
        // Datos básicos del Step 1
        nombreInterno: bondData.step1?.nombreInterno,
        codigoISIN: bondData.step1?.codigoISIN,
        valorNominal: parseFloat(bondData.step1?.valorNominal || '0'),
        valorComercial: parseFloat(bondData.step1?.valorComercial || '0'),
        numAnios: parseInt(bondData.step1?.numAnios || '1'),
        fechaEmision: bondData.step1?.fechaEmision,
        frecuenciaCupon: bondData.step1?.frecuenciaCupon,
        baseDias: parseInt(bondData.step1?.baseDias || '360'),

        // Datos financieros del Step 2 (incluyendo períodos de gracia)
        tipoTasa: bondData.step2?.tipoTasa,
        periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion,
        tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0'),
        indexadoInflacion: bondData.step2?.indexadoInflacion || false,
        inflacionAnual: parseFloat(bondData.step2?.inflacionAnual || '0'),
        primaVencimiento: parseFloat(bondData.step2?.primaVencimiento || '0'),
        impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30'),

        // 🆕 Nuevos campos de períodos de gracia
        numGracePeriods: bondData.step2?.numGracePeriods || 0,
        gracePeriodsConfig: bondData.step2?.gracePeriodsConfig || [],

        // Datos de costes del Step 3
        costes: {
          estructuracionPct: parseFloat(bondData.step3?.estructuracionEmisor || '0'),
          colocacionPct: parseFloat(bondData.step3?.colocacionEmisor || '0'),
          flotacionPct: parseFloat(bondData.step3?.flotacionEmisor || '0'),
          cavaliPct: parseFloat(bondData.step3?.cavaliEmisor || '0'),
        },

        // Información del emisor (desde localStorage o contexto)
        emisorId: localStorage.getItem('userId') || 'default-emisor-id',
      };

      console.log('🚀 Enviando datos del bono:', bondPayload);

      // TODO: Implementar llamada a API real
      // const response = await fetch('/api/bonds', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(bondPayload),
      // });

      // if (!response.ok) {
      //   throw new Error('Error al crear el bono');
      // }

      // const result = await response.json();
      // console.log('✅ Bono creado:', result);

      // Simular API call por ahora
      await new Promise(resolve => setTimeout(resolve, 2000));

      localStorage.removeItem('bondWizardData');
      router.push('/emisor/dashboard');

    } catch (error) {
      console.error('❌ Error al crear el bono:', error);
      alert('Error al crear el bono. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

            {/* Form Content */}
            <div className="px-6 pb-6">
              {currentStep === 1 && <Step1 bondData={bondData} saveData={saveData} />}
              {currentStep === 2 && (
                  // 🆕 Usar el nuevo componente dinámico
                  <Step2Dynamic bondData={bondData} saveData={saveData} />
              )}
              {currentStep === 3 && (
                  // 🆕 Usar el nuevo componente dinámico
                  <Step3Dynamic bondData={bondData} saveData={saveData} />
              )}
              {currentStep === 4 && (
                  <Step4
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
                        disabled={!canProceedToNext() || isSubmitting}
                        className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                            canProceedToNext() && !isSubmitting
                                ? 'bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {isSubmitting ? (
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

// 🔄 STEP1 - Mantenemos el componente existente por ahora
function Step1({
                 bondData,
                 saveData,
               }: {
  bondData: BondData;
  saveData: (data: any, step: number) => void;
}) {
  // ... (mantener implementación existente del Step1)
  return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Datos Generales</h2>
        {/* Implementación del Step1 existente */}
        <p className="text-gray-400">
          📝 Este paso mantiene la implementación existente por ahora...
        </p>
      </div>
  );
}

// 🔄 STEP4 - Mantenemos el componente existente por ahora
function Step4({
                 bondData,
                 flowsCalculated,
                 setFlowsCalculated,
                 confirmationChecked,
                 setConfirmationChecked,
                 activeTab,
                 setActiveTab,
               }: any) {
  // ... (mantener implementación existente del Step4)
  return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Revisión y Publicación</h2>
        {/* Implementación del Step4 existente */}
        <p className="text-gray-400">
          📊 Este paso mantiene la implementación existente por ahora...
        </p>
      </div>
  );
}