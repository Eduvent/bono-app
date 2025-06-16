"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Calculator, FileText, BarChart3, Settings,
  Download, RefreshCw, Share2, Edit, Play, Pause, Stop
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useCalculations } from "@/lib/hooks/useCalculations"
import { useCashFlows } from "@/lib/hooks/useCashFlows"
import { useBondStatus } from "@/lib/hooks/useBondStatus"
import useSWR from 'swr'

interface BondPageProps {
  params: { bondId: string }
  searchParams: { created?: string; tab?: string }
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BondPage({ params, searchParams }: BondPageProps) {
  const { bondId } = params;
  const router = useRouter();

  // Estados locales
  const [activeTab, setActiveTab] = useState(searchParams.tab || "overview");
  const [showSuccessMessage, setShowSuccessMessage] = useState(!!searchParams.created);

  // Hooks de autenticación y datos
  const { user } = useAuth({ requireRole: 'EMISOR' });

  // Obtener datos básicos del bono
  const { data: bondData, error: bondError, mutate: refreshBond } = useSWR(
      bondId ? `/api/bonds/${bondId}` : null,
      fetcher
  );

  // Hooks de cálculos y flujos
  const {
    calculate,
    isCalculating,
    lastResult,
    hasFlows,
    status: calcStatus,
    needsRecalculation
  } = useCalculations(bondId, {
    autoCalculate: false
  });

  const {
    flows,
    isLoading: flowsLoading,
    downloadCSV,
    recalculate: recalculateFlows
  } = useCashFlows(bondId, {
    role: 'emisor',
    autoCalculate: false
  });

  const {
    updateStatus,
    publishBond,
    pauseBond,
    isUpdating
  } = useBondStatus(bondId);

  // Ocultar mensaje de éxito después de 5 segundos
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  if (bondError) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">Error cargando bono: {bondError.message}</p>
            <button
                onClick={() => router.push('/emisor/dashboard')}
                className="bg-[#39FF14] text-black px-4 py-2 rounded-lg"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
    );
  }

  if (!bondData) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14]"></div>
        </div>
    );
  }

  const handleCalculateFlows = async () => {
    try {
      await calculate({ recalculate: true, saveResults: true });
      await refreshBond(); // Actualizar datos del bono
    } catch (error) {
      console.error('Error calculating flows:', error);
    }
  };

  const handlePublishBond = async () => {
    try {
      await publishBond();
      await refreshBond();
    } catch (error) {
      console.error('Error publishing bond:', error);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "N/A";
    return `${(value * 100).toFixed(3)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'paused': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
      <div className="min-h-screen bg-[#0D0D0D] text-white">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black bg-opacity-75 backdrop-blur-md border-b border-[#2A2A2A]">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                    onClick={() => router.push("/emisor/dashboard")}
                    className="p-2 text-gray-400 hover:text-white transition"
                >
                  <ArrowLeft size={20} />
                </button>

                <div>
                  <h1 className="text-xl font-semibold">{bondData.name}</h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-sm text-gray-400">{bondData.codigoIsin}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(bondData.status)}`}>
                    {bondData.status}
                  </span>
                    {needsRecalculation && (
                        <span className="px-2 py-1 rounded-full text-xs text-yellow-400 bg-yellow-400/10">
                      Requiere recálculo
                    </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {bondData.status === 'DRAFT' && hasFlows && (
                    <button
                        onClick={handlePublishBond}
                        disabled={isUpdating}
                        className="flex items-center bg-[#39FF14] text-black px-4 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                    >
                      <Play size={16} className="mr-2" />
                      {isUpdating ? 'Publicando...' : 'Publicar'}
                    </button>
                )}

                {bondData.status === 'ACTIVE' && (
                    <button
                        onClick={pauseBond}
                        disabled={isUpdating}
                        className="flex items-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                    >
                      <Pause size={16} className="mr-2" />
                      Pausar
                    </button>
                )}

                <button className="p-2 text-gray-400 hover:text-white transition">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Success Message */}
        {showSuccessMessage && (
            <div className="bg-green-900/20 border-b border-green-500/30 px-6 py-3">
              <p className="text-green-400 text-sm">
                ✅ Bono creado exitosamente. Ahora puedes calcular los flujos de caja.
              </p>
            </div>
        )}

        <main className="container mx-auto px-6 py-8">
          {/* Resumen rápido */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-gray-400 text-sm mb-1">Valor Nominal</p>
              <p className="text-xl font-bold">{formatCurrency(bondData.calculationInputs?.valorNominal)}</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-gray-400 text-sm mb-1">Plazo</p>
              <p className="text-xl font-bold">
                {bondData.calculationInputs?.numAnios} años
              </p>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-gray-400 text-sm mb-1">TCEA Emisor</p>
              <p className="text-xl font-bold">
                {formatPercent(lastResult?.metricas?.tceaEmisor)}
              </p>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-gray-400 text-sm mb-1">Flujos Calculados</p>
              <p className="text-xl font-bold">{flows?.length || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-[#2A2A2A]">
              {[
                { id: 'overview', label: 'Resumen', icon: FileText },
                { id: 'calculations', label: 'Cálculos', icon: Calculator },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'settings', label: 'Configuración', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                  <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center px-4 py-3 transition ${
                          activeTab === id
                              ? "border-b-2 border-[#39FF14] text-[#39FF14]"
                              : "text-gray-400 hover:text-white"
                      }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {label}
                  </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
              <BondOverview bondData={bondData} />
          )}

          {activeTab === 'calculations' && (
              <BondCalculations
                  bondId={bondId}
                  hasFlows={hasFlows}
                  isCalculating={isCalculating}
                  flows={flows}
                  flowsLoading={flowsLoading}
                  lastResult={lastResult}
                  onCalculate={handleCalculateFlows}
                  onDownloadCSV={downloadCSV}
              />
          )}

          {activeTab === 'analytics' && lastResult && (
              <BondAnalytics metrics={lastResult.metricas} flows={flows} />
          )}

          {activeTab === 'settings' && (
              <BondSettings bondData={bondData} onUpdate={refreshBond} />
          )}
        </main>
      </div>
  );
}

// Componente para mostrar resumen del bono
function BondOverview({ bondData }: { bondData: any }) {
  return (
      <div className="space-y-6">
        {/* Información básica */}
        <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#2A2A2A]">
          <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Nombre</p>
              <p className="font-medium">{bondData.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Código ISIN</p>
              <p className="font-medium">{bondData.codigoIsin}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fecha de Emisión</p>
              <p className="font-medium">
                {new Date(bondData.calculationInputs?.fechaEmision).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Frecuencia de Cupón</p>
              <p className="font-medium capitalize">
                {bondData.calculationInputs?.frecuenciaCupon}
              </p>
            </div>
          </div>
        </div>

        {/* Configuración financiera */}
        <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#2A2A2A]">
          <h3 className="text-lg font-semibold mb-4">Configuración Financiera</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Tasa Anual</p>
              <p className="font-medium">
                {((bondData.calculationInputs?.tasaAnual || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Tasa de Descuento</p>
              <p className="font-medium">
                {((bondData.calculationInputs?.tasaDescuento || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Impuesto a la Renta</p>
              <p className="font-medium">
                {((bondData.calculationInputs?.impuestoRenta || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Costes */}
        {bondData.costs && (
            <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#2A2A2A]">
              <h3 className="text-lg font-semibold mb-4">Costes y Comisiones</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Estructuración</p>
                  <p className="font-medium">
                    {((bondData.costs.estructuracionPorcentaje || 0) * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Colocación</p>
                  <p className="font-medium">
                    {((bondData.costs.colocacionPorcentaje || 0) * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Flotación</p>
                  <p className="font-medium">
                    {((bondData.costs.flotacionPorcentaje || 0) * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">CAVALI</p>
                  <p className="font-medium">
                    {((bondData.costs.cavaliPorcentaje || 0) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

// Otros componentes similares...
function BondCalculations({ /* props */ }) {
  // Implementar similar al Step4Migrated que ya tienes
  return <div>Componente de cálculos...</div>;
}

function BondAnalytics({ /* props */ }) {
  // Implementar gráficos y análisis
  return <div>Componente de analytics...</div>;
}

function BondSettings({ /* props */ }) {
  // Implementar configuración
  return <div>Componente de configuración...</div>;
}