// app/emisor/create-bond/components/Step4Dynamic.tsx

'use client';

import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Calculator, FileText, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useCalculations } from '@/lib/hooks/useCalculations'; // Hook simulado
import { useCashFlows } from '@/lib/hooks/useCashFlows';
import {formatCurrency} from "@/utils/format"; // Hook simulado

interface BondData {
    step1?: any;
    step2?: any;
    step3?: any;
}

interface Step4Props {
    bondData: BondData;
    bondId?: string; // ID del bono creado en backend tras los primeros pasos
}

/**
 * Componente para mostrar la tabla de flujos calculados
 */
function TablaFlujosCalculados({ flujos, isLoading, bondName }: { flujos: any[], isLoading: boolean, bondName?: string }) {
    if (isLoading) {
        return <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin mr-2" size={20} />Cargando flujos...</div>;
    }
    if (!flujos || flujos.length === 0) {
        return <div className="text-center py-8 text-gray-400">No hay flujos calculados.</div>;
    }
    const formatCurrency = (amount: number | null) => amount === null ? "-" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES');

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Flujos de Caja - {bondName || 'Bono'}</h3>
                <span className="text-sm text-gray-400">{flujos.length} períodos</span>
            </div>
            <div className="overflow-x-auto bg-[#151515] border border-[#2A2A2A] rounded-xl">
                <table className="min-w-[1200px] w-full text-sm">
                    <thead className="bg-[#1A1A1A] text-[#CCCCCC]">
                    <tr>
                        {/* Headers de la tabla */}
                        <th className="sticky left-0 bg-[#1A1A1A] z-10 py-3 px-4 text-left">Nº</th>
                        <th className="py-3 px-4 text-left">Fecha</th>
                        <th className="py-3 px-4 text-right">Infl. Anual</th>
                        <th className="py-3 px-4 text-right">Bono Indexado</th>
                        <th className="py-3 px-4 text-right">Cupón</th>
                        <th className="py-3 px-4 text-right">Amort.</th>
                        <th className="py-3 px-4 text-right">Escudo Fiscal</th>
                        <th className="py-3 px-4 text-right">Flujo Emisor</th>
                        <th className="py-3 px-4 text-right">Flujo c/Escudo</th>
                    </tr>
                    </thead>
                    <tbody>
                    {flujos.map((flujo, index) => (
                        <tr key={flujo.periodo} className={`border-b border-[#2A2A2A] hover:bg-[#1A1A1A] ${index % 2 === 0 ? 'bg-[#0F0F0F]' : ''}`}>
                            <td className="sticky left-0 bg-inherit z-10 py-2 px-4 font-medium">{flujo.periodo}</td>
                            <td className="py-2 px-4">{formatDate(flujo.fecha)}</td>
                            <td className="py-2 px-4 text-right">{flujo.inflacionAnual ? `${(flujo.inflacionAnual * 100).toFixed(2)}%` : '-'}</td>
                            <td className="py-2 px-4 text-right">{formatCurrency(flujo.bonoIndexado)}</td>
                            <td className="py-2 px-4 text-right text-red-400">{formatCurrency(flujo.cupon)}</td>
                            <td className="py-2 px-4 text-right text-red-400">{formatCurrency(flujo.amortizacion)}</td>
                            <td className="py-2 px-4 text-right text-green-400">{formatCurrency(flujo.escudoFiscal)}</td>
                            <td className={`py-2 px-4 text-right font-medium ${(flujo.flujoEmisor || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(flujo.flujoEmisor)}</td>
                            <td className={`py-2 px-4 text-right font-medium ${(flujo.flujoEmisorConEscudo || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(flujo.flujoEmisorConEscudo)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Componente para mostrar métricas financieras calculadas
 */
function MetricasFinancieras({ metricas }: { metricas: any }) {
    if (!metricas) return null;
    const formatPercent = (value: number) => `${(value * 100).toFixed(3)}%`;
    const formatCurrency = (value: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium mb-4 text-[#39FF14]">📊 Métricas del Emisor</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1E1E1E] rounded-lg p-4"><p className="text-gray-400 text-sm mb-1">VAN Emisor</p><p className="text-xl font-bold">{formatCurrency(metricas.emisor.van)}</p></div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4"><p className="text-gray-400 text-sm mb-1">TCEA (bruta)</p><p className="text-xl font-bold">{formatPercent(metricas.emisor.tceaEmisor)}</p></div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4"><p className="text-gray-400 text-sm mb-1">TCEA c/Escudo</p><p className="text-xl font-bold text-green-400">{formatPercent(metricas.emisor.tceaEmisorConEscudo)}</p></div>
                    <div className="bg-[#1E1E1E] rounded-lg p-4"><p className="text-gray-400 text-sm mb-1">Duración Mod.</p><p className="text-xl font-bold">{metricas.emisor.duracionModificada.toFixed(2)}</p></div>
                </div>
            </div>
            {/* ... otras métricas como las del bonista si se desea ... */}
        </div>
    );
}

/**
 * Componente Principal del Step 4
 */
export function Step4Dynamic({ bondData, bondId }: Step4Props) {
    const [activeTab, setActiveTab] = useState("resumen");
    const [confirmationChecked, setConfirmationChecked] = useState(false);

    // Hooks de API/Cálculos
    const {
        calculate,
        isCalculating,
        calculationError,
        lastResult,
        needsRecalculation,
        hasFlows,
        status
    } = useCalculations(bondId, { autoCalculate: false });

    const {
        flows: emisorFlows,
        isLoading: isLoadingFlows,
        error: flowsError,
        downloadCSV
    } = useCashFlows(bondId, { role: 'emisor', autoCalculate: false });

    // Estado para saber si el usuario ha hecho clic en calcular y debemos mostrar resultados
    const [shouldShowResults, setShouldShowResults] = useState(false);

    const handleCalculate = async () => {
        if (!bondId) return;
        setShouldShowResults(false);
        try {
            await calculate({ recalculate: true, saveResults: true });
            setShouldShowResults(true);
        } catch (error) {
            console.error("Calculation failed:", error);
        }
    };

    // Sincronizar con el estado del hook
    useEffect(() => {
        if (hasFlows && lastResult?.success) {
            setShouldShowResults(true);
        }
    }, [hasFlows, lastResult]);

    // Función para renderizar los detalles en el acordeón
    const renderDetail = (label: string, value: any) => (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="font-medium">{value || 'N/A'}</p>
        </div>
    );

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Publicación</h2>

            {/* Acordeón para Revisar Datos */}
            <Accordion type="multiple" defaultValue={['item-1']} className="w-full mb-8">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-medium">Datos Generales</AccordionTrigger>
                    <AccordionContent className="p-4 bg-[#1A1A1A] rounded-b-lg">
                        <div className="grid grid-cols-2 gap-4">
                            {renderDetail("Nombre Interno", bondData.step1?.nombreInterno)}
                            {renderDetail("Valor Nominal", formatCurrency(bondData.step1?.valorNominal))}
                            {renderDetail("Valor Comercial", formatCurrency(bondData.step1?.valorComercial))}
                            {renderDetail("Nº de Años", bondData.step1?.numAnios)}
                            {renderDetail("Frecuencia de Cupón", bondData.step1?.frecuenciaCupon)}
                            {renderDetail("Fecha de Emisión", bondData.step1?.fechaEmision)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-medium">Condiciones Financieras</AccordionTrigger>
                    <AccordionContent className="p-4 bg-[#1A1A1A] rounded-b-lg">
                        <div className="grid grid-cols-2 gap-4">
                            {renderDetail("Tipo de Tasa", bondData.step2?.tipoTasa)}
                            {renderDetail("Tasa Anual", `${bondData.step2?.tasaAnual || 0}%`)}
                            {renderDetail("Indexado a Inflación", bondData.step2?.indexadoInflacion ? 'Sí' : 'No')}
                            {bondData.step2?.indexadoInflacion && renderDetail("Inflación Anual Esperada", `${bondData.step2?.inflacionAnual || 0}%`)}
                            {renderDetail("Períodos de Gracia Iniciales", bondData.step2?.numGracePeriods)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-medium">Costes y Comisiones</AccordionTrigger>
                    <AccordionContent className="p-4 bg-[#1A1A1A] rounded-b-lg">
                        <div className="grid grid-cols-2 gap-4">
                            {renderDetail("Total Costes Emisor", formatCurrency(bondData.step3?.emisorTotalAbs))}
                            {renderDetail("Total Costes Bonista", formatCurrency(bondData.step3?.bonistaTotalAbs))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Sección de Cálculo de Flujos */}
            <div className="mb-8 p-6 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <h3 className="text-lg font-medium mb-4">Cálculo de Flujos de Caja</h3>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCalculate}
                        disabled={!bondId || isCalculating}
                        className={`flex items-center px-4 py-2 rounded-lg transition ${
                            !bondId || isCalculating ? "bg-gray-600 cursor-not-allowed" : "bg-[#39FF14] text-black hover:shadow-neon"
                        }`}
                    >
                        {isCalculating ? <Loader2 className="animate-spin mr-2" /> : <Calculator className="mr-2" />}
                        {hasFlows ? "Recalcular Flujos" : "Calcular Flujos"}
                    </button>
                    {hasFlows && (
                        <button onClick={() => downloadCSV()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <Download className="mr-2" /> Descargar CSV
                        </button>
                    )}
                </div>
                {needsRecalculation && <p className="text-yellow-400 text-xs mt-2">Hay cambios pendientes. Se recomienda recalcular.</p>}
                {(calculationError || flowsError) && <p className="text-red-400 text-xs mt-2">{calculationError || flowsError}</p>}
            </div>

            {/* Resultados (Tabs) */}
            {shouldShowResults && (
                <div>
                    <div className="flex border-b border-[#2A2A2A] mb-6">
                        <button onClick={() => setActiveTab("flujos")} className={`px-4 py-2 transition ${activeTab === "flujos" ? "border-b-2 border-[#39FF14] text-[#39FF14]" : "text-gray-400"}`}>Tabla de Flujos</button>
                        <button onClick={() => setActiveTab("metricas")} className={`px-4 py-2 transition ${activeTab === "metricas" ? "border-b-2 border-[#39FF14] text-[#39FF14]" : "text-gray-400"}`}>Métricas Financieras</button>
                    </div>

                    {activeTab === "flujos" && <TablaFlujosCalculados flujos={emisorFlows} isLoading={isLoadingFlows} bondName={bondData.step1?.nombreInterno} />}
                    {activeTab === "metricas" && <MetricasFinancieras metricas={lastResult?.metricas} />}
                </div>
            )}
            {(isCalculating || isLoadingFlows) && !shouldShowResults && <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin mr-2" /><span>Generando resultados...</span></div>}

            {/* Confirmación Final */}
            <div className="mt-8 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-start">
                    <input type="checkbox" id="confirmation-checkbox" checked={confirmationChecked} onChange={(e) => setConfirmationChecked(e.target.checked)} className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-[#39FF14] focus:ring-[#39FF14] bg-gray-700" />
                    <label htmlFor="confirmation-checkbox" className="text-gray-300 text-sm">
                        He revisado y acepto todos los datos proporcionados. Los cálculos han sido verificados y entiendo que una vez publicado, el bono no podrá ser modificado.
                    </label>
                </div>
                {confirmationChecked && hasFlows && <div className="mt-3 flex items-center text-green-400 text-sm"><CheckCircle className="mr-2" />Listo para publicar.</div>}
            </div>
        </div>
    );
}