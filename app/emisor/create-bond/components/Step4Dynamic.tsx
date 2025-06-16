// examples/step4-migration.tsx

/**
 * Ejemplo de migración del Step 4 del create-bond
 * Muestra cómo integrar los nuevos hooks con los componentes existentes
 *
 * ANTES: Datos estáticos hardcodeados
 * DESPUÉS: Datos dinámicos desde API con hooks
 */

import { useState, useEffect } from 'react';
import { Loader2, Calculator, FileText, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useCalculations } from '@/lib/hooks/useCalculations';
import { useCashFlows } from '@/lib/hooks/useCashFlows';

interface BondData {
    step1?: any;
    step2?: any;
    step3?: any;
    step4?: any;
}

interface Step4Props {
    bondData: BondData;
    flowsCalculated: boolean;
    setFlowsCalculated: (value: boolean) => void;
    confirmationChecked: boolean;
    setConfirmationChecked: (value: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    bondId?: string; // 🆕 Agregamos bondId para poder calcular
}

/**
 * Componente Step4 MIGRADO para usar APIs
 */
export function Step4Migrated({
                                  bondData,
                                  flowsCalculated,
                                  setFlowsCalculated,
                                  confirmationChecked,
                                  setConfirmationChecked,
                                  activeTab,
                                  setActiveTab,
                                  bondId, // 🆕 ID del bono (viene del backend después de crear)
                              }: Step4Props) {
    // 🆕 Hooks para cálculos y flujos
    const {
        calculate,
        isCalculating,
        calculationError,
        lastResult,
        canCalculate,
        needsRecalculation,
        hasFlows,
        status
    } = useCalculations(bondId, {
        autoCalculate: false, // No auto-calcular, esperar click del usuario
        onSuccess: (result) => {
            console.log('✅ Cálculos completados:', result);
            setFlowsCalculated(true);
        },
        onError: (error) => {
            console.error('❌ Error en cálculos:', error);
            setFlowsCalculated(false);
        }
    });

    const {
        flows: emisorFlows,
        isLoading: isLoadingFlows,
        error: flowsError,
        downloadCSV,
        recalculate: recalculateFlows
    } = useCashFlows(bondId, {
        role: 'emisor',
        autoCalculate: false, // Solo cargar si ya existen
    });

    // 🆕 Estado para mostrar diferentes tipos de contenido
    const [showingResults, setShowingResults] = useState(false);

    // 🆕 Función para manejar el cálculo
    const handleCalculateFlows = async () => {
        if (!bondId) {
            console.error('No hay bondId para calcular');
            return;
        }

        try {
            setShowingResults(false);
            await calculate({
                recalculate: needsRecalculation,
                saveResults: true
            });
            setShowingResults(true);
        } catch (error) {
            console.error('Error calculando flujos:', error);
        }
    };

    // 🆕 Efecto para sincronizar estado local con hooks
    useEffect(() => {
        if (hasFlows && lastResult?.success) {
            setFlowsCalculated(true);
            setShowingResults(true);
        }
    }, [hasFlows, lastResult, setFlowsCalculated]);

    const formatCurrency = (amount: string | number | null | undefined) => {
        if (amount === null || amount === undefined) return "$0.00";
        const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Publicación</h2>

            {/* 🆕 Estado de cálculos */}
            {bondId && (
                <div className="mb-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                        <Calculator className="mr-2" size={20} />
                        Estado de Cálculos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${canCalculate ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm">
                {canCalculate ? 'Listo para calcular' : 'No se puede calcular'}
              </span>
                        </div>

                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${hasFlows ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <span className="text-sm">
                {hasFlows ? `${status?.calculation.flowsCount || 0} flujos calculados` : 'Sin flujos calculados'}
              </span>
                        </div>

                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${needsRecalculation ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-sm">
                {needsRecalculation ? 'Necesita recálculo' : 'Actualizado'}
              </span>
                        </div>
                    </div>

                    {/* Razones para recálculo */}
                    {needsRecalculation && status?.calculation.reasons && (
                        <div className="text-xs text-yellow-400 mb-3">
                            <strong>Razones:</strong> {status.calculation.reasons.join(', ')}
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCalculateFlows}
                            disabled={!canCalculate || isCalculating}
                            className={`flex items-center px-4 py-2 rounded-lg transition ${
                                canCalculate && !isCalculating
                                    ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                            {isCalculating ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={16} />
                                    Calculando...
                                </>
                            ) : (
                                <>
                                    <Calculator className="mr-2" size={16} />
                                    {needsRecalculation ? 'Recalcular' : 'Calcular'} Flujos
                                </>
                            )}
                        </button>

                        {hasFlows && (
                            <button
                                onClick={downloadCSV}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                <Download className="mr-2" size={16} />
                                Descargar CSV
                            </button>
                        )}

                        {hasFlows && (
                            <button
                                onClick={recalculateFlows}
                                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                            >
                                <RefreshCw className="mr-2" size={16} />
                                Refrescar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Manejo de errores */}
            {(calculationError || flowsError) && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center mb-2">
                        <AlertCircle className="text-red-400 mr-2" size={20} />
                        <h4 className="text-red-400 font-medium">Error en Cálculos</h4>
                    </div>
                    <p className="text-red-300 text-sm">
                        {calculationError || flowsError}
                    </p>
                </div>
            )}

            {/* Tabs de contenido */}
            <div className="mb-6">
                <div className="flex border-b border-[#2A2A2A]">
                    <button
                        onClick={() => setActiveTab("resumen")}
                        className={`px-4 py-2 transition ${
                            activeTab === "resumen"
                                ? "border-b-2 border-[#39FF14] text-[#39FF14]"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Resumen
                    </button>

                    <button
                        onClick={() => setActiveTab("flujos")}
                        className={`px-4 py-2 transition ${
                            activeTab === "flujos"
                                ? "border-b-2 border-[#39FF14] text-[#39FF14]"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Tabla de Flujos
                    </button>

                    <button
                        onClick={() => setActiveTab("metricas")}
                        className={`px-4 py-2 transition ${
                            activeTab === "metricas"
                                ? "border-b-2 border-[#39FF14] text-[#39FF14]"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        Métricas Financieras
                    </button>
                </div>
            </div>

            {/* Contenido de tabs */}
            {activeTab === "resumen" && (
                <RevisarDatos bondData={bondData} />
            )}

            {activeTab === "flujos" && showingResults && (
                <TablaFlujosCalculados
                    flujos={emisorFlows}
                    isLoading={isLoadingFlows}
                    bondName={status?.bondName}
                />
            )}

            {activeTab === "metricas" && lastResult && (
                <MetricasFinancieras metricas={lastResult.metricas} />
            )}

            {/* Loading state para flujos */}
            {activeTab === "flujos" && (isLoadingFlows || isCalculating) && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin mr-2" size={24} />
                    <span>Cargando flujos de caja...</span>
                </div>
            )}

            {/* Estado vacío para flujos */}
            {activeTab === "flujos" && !showingResults && !isCalculating && !isLoadingFlows && (
                <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Calcule los flujos para ver la tabla de datos</p>
                </div>
            )}

            {/* Confirmación final */}
            <div className="mt-8 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-start">
                    <input
                        type="checkbox"
                        id="confirmation-checkbox"
                        checked={confirmationChecked}
                        onChange={(e) => setConfirmationChecked(e.target.checked)}
                        className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-[#39FF14] focus:ring-[#39FF14] bg-gray-700"
                    />
                    <label htmlFor="confirmation-checkbox" className="text-gray-300 text-sm">
                        He revisado y acepto todos los datos proporcionados para la emisión del bono.
                        Los cálculos financieros han sido verificados y entiendo que una vez publicado,
                        estos datos no podrán ser modificados.
                    </label>
                </div>

                {/* 🆕 Mostrar estado de validación */}
                {confirmationChecked && flowsCalculated && (
                    <div className="mt-3 flex items-center text-green-400 text-sm">
                        <CheckCircle size={16} className="mr-2" />
                        Listo para publicar
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Componente para mostrar datos de revisión (sin cambios)
 */
function RevisarDatos({ bondData }: { bondData: BondData }) {
    // ... lógica existente para mostrar acordeón de datos
    return (
        <div className="space-y-4">
            <p className="text-gray-400">
                Datos del bono: {JSON.stringify(bondData, null, 2)}
            </p>
        </div>
    );
}

/**
 * 🆕 Componente para mostrar tabla de flujos calculados
 */
function TablaFlujosCalculados({
                                   flujos,
                                   isLoading,
                                   bondName
                               }: {
    flujos: any[],
    isLoading: boolean,
    bondName?: string
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin mr-2" size={20} />
                Cargando flujos...
            </div>
        );
    }

    if (!flujos || flujos.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                No hay flujos calculados
            </div>
        );
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return "-";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES');
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                    Flujos de Caja - {bondName || 'Bono'}
                </h3>
                <span className="text-sm text-gray-400">
          {flujos.length} períodos
        </span>
            </div>

            <div className="overflow-x-auto bg-[#151515] border border-[#2A2A2A] rounded-xl">
                <table className="min-w-[1000px] w-full text-sm">
                    <thead className="bg-[#1A1A1A] text-[#CCCCCC]">
                    <tr>
                        <th className="sticky left-0 bg-[#1A1A1A] z-10 py-3 px-4 text-left">Período</th>
                        <th className="py-3 px-4 text-left">Fecha</th>
                        <th className="py-3 px-4 text-right">Inflación</th>
                        <th className="py-3 px-4 text-right">Bono Indexado</th>
                        <th className="py-3 px-4 text-right">Cupón</th>
                        <th className="py-3 px-4 text-right">Amortización</th>
                        <th className="py-3 px-4 text-right">Escudo Fiscal</th>
                        <th className="py-3 px-4 text-right">Flujo Emisor</th>
                        <th className="py-3 px-4 text-right">Flujo c/Escudo</th>
                    </tr>
                    </thead>
                    <tbody>
                    {flujos.map((flujo, index) => (
                        <tr
                            key={flujo.periodo}
                            className={`border-b border-[#2A2A2A] hover:bg-[#1A1A1A] ${
                                index % 2 === 0 ? 'bg-[#0F0F0F]' : ''
                            }`}
                        >
                            <td className="sticky left-0 bg-inherit z-10 py-2 px-4 font-medium">
                                {flujo.periodo}
                            </td>
                            <td className="py-2 px-4">
                                {formatDate(flujo.fecha)}
                            </td>
                            <td className="py-2 px-4 text-right">
                                {flujo.inflacionAnual ? `${(flujo.inflacionAnual * 100).toFixed(2)}%` : '-'}
                            </td>
                            <td className="py-2 px-4 text-right">
                                {formatCurrency(flujo.bonoIndexado)}
                            </td>
                            <td className="py-2 px-4 text-right text-red-400">
                                {formatCurrency(flujo.cupon)}
                            </td>
                            <td className="py-2 px-4 text-right text-red-400">
                                {formatCurrency(flujo.amortizacion)}
                            </td>
                            <td className="py-2 px-4 text-right text-green-400">
                                {formatCurrency(flujo.escudoFiscal)}
                            </td>
                            <td className={`py-2 px-4 text-right font-medium ${
                                (flujo.flujoEmisor || 0) > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {formatCurrency(flujo.flujoEmisor)}
                            </td>
                            <td className={`py-2 px-4 text-right font-medium ${
                                (flujo.flujoEmisorConEscudo || 0) > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {formatCurrency(flujo.flujoEmisorConEscudo)}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * 🆕 Componente para mostrar métricas financieras
 */
function MetricasFinancieras({ metricas }: { metricas: any }) {
    const formatPercent = (value: number) => `${(value * 100).toFixed(3)}%`;
    const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(value);

    return (
        <div className="space-y-6">
            {/* Métricas del Emisor */}
            <div>
                <h3 className="text-lg font-medium mb-4 text-[#39FF14]">
                    📊 Métricas del Emisor
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">VAN Emisor</p>
                        <p className="text-xl font-bold">{formatCurrency(metricas.emisor.van)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">TCEA (bruta)</p>
                        <p className="text-xl font-bold">{formatPercent(metricas.emisor.tceaEmisor)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">TCEA c/Escudo</p>
                        <p className="text-xl font-bold text-green-400">{formatPercent(metricas.emisor.tceaEmisorConEscudo)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Duración Mod.</p>
                        <p className="text-xl font-bold">{metricas.emisor.duracionModificada.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Métricas del Inversionista */}
            <div>
                <h3 className="text-lg font-medium mb-4 text-blue-400">
                    💼 Métricas del Inversionista
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">VAN Inversión</p>
                        <p className="text-xl font-bold">{formatCurrency(metricas.bonista.van)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">TREA</p>
                        <p className="text-xl font-bold text-blue-400">{formatPercent(metricas.bonista.treaBonista)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Convexidad</p>
                        <p className="text-xl font-bold">{metricas.bonista.convexidad.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Total Ratios</p>
                        <p className="text-xl font-bold">{metricas.bonista.totalRatiosDecision.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Información adicional */}
            <div className="bg-[#1A1A1A] rounded-lg p-4">
                <h4 className="font-semibold mb-2">📈 Interpretación de Métricas</h4>
                <div className="text-sm text-gray-400 space-y-2">
                    <p><strong>VAN:</strong> Valor Actual Neto - representa la ganancia/pérdida en valor presente</p>
                    <p><strong>TCEA:</strong> Tasa de Costo Efectivo Anual del emisor (con/sin escudo fiscal)</p>
                    <p><strong>TREA:</strong> Tasa de Rendimiento Efectivo Anual del inversionista</p>
                    <p><strong>Duración:</strong> Sensibilidad del precio del bono a cambios en tasas de interés</p>
                    <p><strong>Convexidad:</strong> Medida de la curvatura en la relación precio-rendimiento</p>
                </div>
            </div>
        </div>
    );
}

export default Step4Migrated;