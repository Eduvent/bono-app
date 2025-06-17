// app/emisor/create-bond/components/Step4Dynamic.tsx
'use client';

import { useState } from 'react';
import { ChevronDown, Calculator, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useCalculations } from '@/lib/hooks/useCalculations';
import { useCashFlows } from '@/lib/hooks/useCashFlows';
import type { EmisorCashFlow } from '@/lib/hooks/useCashFlows'; // Importar tipo si está exportado

interface BondData {
    step1?: {
        name?: string;
        nombreInterno?: string;
        codigoIsin?: string;
        valorNominal?: string;
        valorComercial?: string;
        numAnios?: string;
        fechaEmision?: string;
        frecuenciaCupon?: string;
        diasPorAno?: string;
    };
    step2?: {
        tipoTasa?: string;
        periodicidadCapitalizacion?: string;
        tasaAnual?: string;
        tasaDescuento?: string;
        indexadoInflacion?: boolean;
        inflacionAnual?: string;
        primaVencimiento?: string;
        impuestoRenta?: string;
        numGracePeriods?: number;
        gracePeriodsConfig?: Array<{
            couponNumber: number;
            graceType: 'T' | 'P' | 'S';
        }>;
    };
    step3?: {
        estructuracionEmisor?: string;
        colocacionEmisor?: string;
        flotacionEmisor?: string;
        cavaliEmisor?: string;
        emisorTotalAbs?: string;
        bonistaTotalAbs?: string;
        totalCostsAbs?: string;
        flotacionBonista?: string;
        cavaliBonista?: string;
    };
}

interface Step4Props {
    bondData: BondData;
    bondId?: string | null; // ID del bono creado
}

export default function Step4Dynamic({ bondData, bondId }: Step4Props) {
    const [confirmationChecked, setConfirmationChecked] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        datos: true,
        condiciones: false,
        costes: false,
    });

    const {
        calculate,
        isCalculating,
        lastResult,
        hasFlows,
        canCalculate,
        status,
        calculationError
    } = useCalculations(bondId ?? undefined, {
        autoCalculate: true, // Auto-calcular si el bono ya existe
        onSuccess: (result) => console.log('✅ Cálculos en Step4 completados:', result),
        onError: (error) => console.error('❌ Error en cálculos de Step4:', error)
    });

    const {
        flows,
        downloadCSV,
        hasFlows: hasFlowsData,
        error: flowsError
    } = useCashFlows(bondId ?? undefined, {
        role: 'emisor',
        autoCalculate: true // Auto-calcular flujos si el bono ya existe
    });

    // 🔧 CONSTRUCCIÓN DE INPUTS PARA EL CALCULADOR
    const buildCalculationInputs = () => {
        const numAnios = parseInt(bondData.step1?.numAnios || '0');
        if (numAnios <= 0) throw new Error("Número de años no válido");

        // ✅ --- INICIO DE LA CORRECCIÓN ---
        const frecuencia = bondData.step1?.frecuenciaCupon || 'semestral';

        // 1. Calcular dinámicamente los cupones por año
        const couponsPerYearMap: { [key: string]: number } = {
            mensual: 12, bimestral: 6, trimestral: 4,
            cuatrimestral: 3, semestral: 2, anual: 1
        };
        const couponsPerYear = couponsPerYearMap[frecuencia] || 1;

        // 2. Construir la 'graciaSerie' con la longitud correcta (igual a numAnios)
        const graciaSerie = Array<'S' | 'P' | 'T'>(numAnios).fill('S');
        bondData.step2?.gracePeriodsConfig?.forEach((config) => {
            const yearIndex = Math.floor((config.couponNumber - 1) / couponsPerYear);
            if (yearIndex >= 0 && yearIndex < numAnios) {
                graciaSerie[yearIndex] = config.graceType;
            }
        });
        // ✅ --- FIN DE LA CORRECCIÓN ---

        const inflacionAnual = parseFloat(bondData.step2?.inflacionAnual || '0') / 100;
        const inflacionSerie = Array(numAnios).fill(inflacionAnual);

        return {
            valorNominal: parseFloat(bondData.step1?.valorNominal || '1000'),
            valorComercial: parseFloat(bondData.step1?.valorComercial || '1050'),
            numAnios,
            frecuenciaCupon: frecuencia,
            diasPorAno: parseInt(bondData.step1?.diasPorAno || '360'),
            tipoTasa: bondData.step2?.tipoTasa || 'efectiva',
            periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || 'semestral',
            tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0') / 100,
            tasaDescuento: parseFloat(bondData.step2?.tasaDescuento || '0') / 100,
            impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30') / 100,
            fechaEmision: bondData.step1?.fechaEmision ? new Date(bondData.step1.fechaEmision) : new Date(),
            primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0') / 100,
            estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0') / 100,
            colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0') / 100,
            flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0') / 100,
            cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0') / 100,
            inflacionSerie,
            graciaSerie
        };
    };

    const handleCalculateFlows = async () => {
        if (!bondId || !canCalculate) {
            console.warn('No se puede calcular: bondId no existe o canCalculate es falso');
            return;
        }

        try {
            const calculationInputs = buildCalculationInputs();
            console.log('🧮 Enviando inputs para cálculo manual:', calculationInputs);

            await calculate({
                recalculate: true,
                saveResults: true,
                inputs: calculationInputs
            });

        } catch (error) {
            console.error('❌ Error ejecutando cálculos manuales:', error);
        }
    };

    // El resto del JSX y funciones de formato no necesitan cambios
    const formatCurrency = (amount: string | number | null | undefined) => { /*...*/ return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(typeof amount === 'string' ? parseFloat(amount) : amount || 0); };
    const formatPercent = (value: string | number | null | undefined) => { /*...*/ return `${((typeof value === 'string' ? parseFloat(value) : value || 0) * 100).toFixed(3)}%`; };
    const formatDate = (dateString: string | null | undefined) => { /*...*/ try { return new Date(dateString || '').toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "N/A"; } };
    const getBondName = () => bondData.step1?.nombreInterno || bondData.step1?.name || "N/A";
    const toggleSection = (section: string) => setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });

    const metricas = lastResult?.metricas?.emisor;
    const metricasBonista = lastResult?.metricas?.bonista;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Confirmación</h2>

            {bondId && (
                <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">✅ Bono Creado Exitosamente</h3>
                    <p className="text-green-300 text-sm">El bono "{getBondName()}" ha sido creado con ID: {bondId}</p>
                    <p className="text-green-200 text-xs mt-1">Ahora puedes calcular los flujos de caja financieros.</p>
                </div>
            )}

            <div className="mb-8">
                {/* Datos Generales, Condiciones, Costes (JSX sin cambios) ... */}
            </div>

            {bondId && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Cálculos Financieros</h3>
                        <div className="flex items-center space-x-3">
                            {hasFlowsData && (
                                <button onClick={downloadCSV} className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition">
                                    <Download size={16} className="mr-2" />
                                    Descargar CSV
                                </button>
                            )}
                            <button onClick={handleCalculateFlows} disabled={isCalculating || !canCalculate} className={`flex items-center px-6 py-3 rounded-lg transition ${hasFlowsData ? "bg-[#1A3A1A] border-[#39FF14] text-[#39FF14] border" : "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"}`}>
                                {isCalculating ? ( <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />Calculando...</> ) : hasFlowsData ? ( <><CheckCircle className="mr-2" size={16} />Flujos Calculados</> ) : ( <><Calculator className="mr-2" size={16} />Calcular Flujos</> )}
                            </button>
                        </div>
                    </div>

                    {(calculationError || flowsError) && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start">
                                <AlertCircle className="text-red-400 mr-3 mt-0.5 flex-shrink-0" size={16} />
                                <div>
                                    <h4 className="text-red-400 font-medium mb-1">Error en Cálculos</h4>
                                    <p className="text-red-300 text-sm">{calculationError || flowsError}</p>
                                    <p className="text-red-200 text-xs mt-2">Verifica que todos los datos del bono sean correctos y vuelve a intentar.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasFlowsData && lastResult && (
                        <div>
                            <div className="mb-6 border-b border-[#2A2A2A] flex">
                                {[{ id: "summary", label: "Resumen" }, { id: "flows", label: "Flujos" }, { id: "analytics", label: "Analytics" }].map((tab) => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-6 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? "text-[#39FF14] border-[#39FF14]" : "text-gray-400 border-transparent hover:text-white hover:border-[#39FF14]"}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {activeTab === "summary" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Indicadores Clave (Emisor)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">VAN Emisor</p><p className="text-[#39FF14] font-medium text-lg">{formatCurrency(metricas?.van || 0)}</p></div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p><p className="text-[#39FF14] font-medium text-lg">{formatPercent(metricas?.tceaEmisor || 0)}</p></div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">TCEA Emisor (c/Escudo)</p><p className="text-[#39FF14] font-medium text-lg">{formatPercent(metricas?.tceaEmisorConEscudo || 0)}</p></div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">Duración</p><p className="text-[#39FF14] font-medium text-lg">{metricas?.duracion ? `${metricas.duracion.toFixed(2)} años` : "N/A"}</p></div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">Convexidad</p><p className="text-[#39FF14] font-medium text-lg">{metricas?.convexidad ? metricas.convexidad.toFixed(2) : "N/A"}</p></div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4"><p className="text-gray-400 text-xs mb-1">TREA Bonista</p><p className="text-blue-400 font-medium text-lg">{formatPercent(metricasBonista?.treaBonista || 0)}</p></div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "flows" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Flujo de Caja Proyectado (Emisor)</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="bg-[#1A1A1A] text-gray-400 text-xs">
                                                <th className="py-2 px-3 text-center font-medium">Nº</th>
                                                <th className="py-2 px-3 text-left font-medium">Fecha</th>
                                                <th className="py-2 px-3 text-right font-medium">Bono Indexado</th>
                                                <th className="py-2 px-3 text-right font-medium">Cupón</th>
                                                <th className="py-2 px-3 text-right font-medium">Amortización</th>
                                                <th className="py-2 px-3 text-right font-medium">Prima</th>
                                                <th className="py-2 px-3 text-right font-medium">Escudo Fiscal</th>
                                                <th className="py-2 px-3 text-right font-medium">Flujo Emisor</th>
                                                <th className="py-2 px-3 text-right font-medium">Flujo c/Escudo</th>
                                            </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                            {flows.slice(0, 5).map((flow) => (
                                                <tr key={flow.periodo} className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                                                    <td className="py-2 px-3 text-center">{flow.periodo}</td>
                                                    <td className="py-2 px-3 text-left">{formatDate(flow.fecha)}</td>
                                                    <td className="py-2 px-3 text-right">{flow.bonoIndexado ? formatCurrency(flow.bonoIndexado) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.cupon && flow.cupon < 0 ? "text-red-400" : ""}`}>{flow.cupon ? formatCurrency(flow.cupon) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.amortizacion && flow.amortizacion < 0 ? "text-red-400" : ""}`}>{flow.amortizacion ? formatCurrency(flow.amortizacion) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.prima && flow.prima < 0 ? "text-red-400" : ""}`}>{flow.prima ? formatCurrency(flow.prima) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.escudoFiscal && flow.escudoFiscal > 0 ? "text-green-400" : ""}`}>{flow.escudoFiscal ? formatCurrency(flow.escudoFiscal) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.flujoEmisor && flow.flujoEmisor > 0 ? "text-green-400" : flow.flujoEmisor && flow.flujoEmisor < 0 ? "text-red-400" : ""}`}>{flow.flujoEmisor ? formatCurrency(flow.flujoEmisor) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo > 0 ? "text-green-400" : flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo < 0 ? "text-red-400" : ""}`}>{flow.flujoEmisorConEscudo ? formatCurrency(flow.flujoEmisorConEscudo) : "-"}</td>
                                                </tr>
                                            ))}
                                            {flows.length > 5 && ( <tr><td colSpan={9} className="py-2 px-3 text-center text-gray-500 text-xs">... y {flows.length - 5} períodos más</td></tr> )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "analytics" && ( /* JSX sin cambios */ <div>...</div>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}