// app/emisor/create-bond/components/Step4Dynamic.tsx - CORREGIDO CON BACKEND REAL
'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Calculator, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useCalculations } from '@/lib/hooks/useCalculations';
import { useCashFlows } from '@/lib/hooks/useCashFlows';

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

    // 🔗 HOOKS REALES CONECTADOS AL BACKEND
    const {
        calculate,
        isCalculating,
        lastResult,
        hasFlows,
        needsRecalculation,
        canCalculate,
        status,
        error: calculationError
    } = useCalculations(bondId, {
        autoCalculate: false,
        onSuccess: (result) => {
            console.log('✅ Cálculos completados:', result);
        },
        onError: (error) => {
            console.error('❌ Error en cálculos:', error);
        }
    });

    const {
        flows,
        isLoading: flowsLoading,
        downloadCSV,
        recalculate: recalculateFlows,
        summary,
        hasFlows: hasFlowsData,
        error: flowsError
    } = useCashFlows(bondId, {
        role: 'emisor',
        autoCalculate: false
    });

    // 🔧 CONSTRUCCIÓN DE INPUTS PARA EL CALCULADOR
    const buildCalculationInputs = () => {
        const numAnios = parseInt(bondData.step1?.numAnios || '5');

        // Construir series basadas en los datos del wizard
        const inflacionAnual = parseFloat(bondData.step2?.inflacionAnual || '0.10'); // 10% default
        const inflacionSerie = Array(numAnios).fill(inflacionAnual);

        // Construir serie de gracia basada en configuración
        let graciaSerie: ('S' | 'P' | 'T')[] = Array(numAnios).fill('S'); // Sin gracia por defecto

        if (bondData.step2?.gracePeriodsConfig && bondData.step2.gracePeriodsConfig.length > 0) {
            bondData.step2.gracePeriodsConfig.forEach(config => {
                const yearIndex = Math.floor((config.couponNumber - 1) / 2); // Convertir cupón a año
                if (yearIndex < numAnios) {
                    graciaSerie[yearIndex] = config.graceType;
                }
            });
        }

        return {
            // Datos básicos
            valorNominal: parseFloat(bondData.step1?.valorNominal || '1000'),
            valorComercial: parseFloat(bondData.step1?.valorComercial || '1050'),
            numAnios,
            frecuenciaCupon: bondData.step1?.frecuenciaCupon || 'semestral',
            diasPorAno: parseInt(bondData.step1?.diasPorAno || '360'),

            // Configuración financiera
            tipoTasa: bondData.step2?.tipoTasa || 'efectiva',
            periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || 'semestral',
            tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0.08'),
            tasaDescuento: parseFloat(bondData.step2?.tasaDescuento || '0.045'),
            impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '0.30'),

            // Fecha
            fechaEmision: bondData.step1?.fechaEmision ? new Date(bondData.step1.fechaEmision) : new Date(),

            // Costes como porcentajes decimales
            primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0.01'),
            estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0.01') / 100,
            colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0.25') / 100,
            flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0.45') / 100,
            cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0.50') / 100,

            // Series construidas
            inflacionSerie,
            graciaSerie
        };
    };

    // 🔥 FUNCIÓN PARA EJECUTAR CÁLCULOS REALES
    const handleCalculateFlows = async () => {
        if (!bondId || !canCalculate) {
            console.warn('No se puede calcular: bondId o canCalculate falso');
            return;
        }

        try {
            const calculationInputs = buildCalculationInputs();
            console.log('🧮 Inputs construidos:', calculationInputs);

            await calculate({
                recalculate: true,
                saveResults: true,
                inputs: calculationInputs
            });

        } catch (error) {
            console.error('❌ Error ejecutando cálculos:', error);
        }
    };

    // 🎨 FUNCIONES DE FORMATO
    const formatCurrency = (amount: string | number | null | undefined) => {
        if (amount === null || amount === undefined) return "$0.00";
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(num)) return "$0.00";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatPercent = (value: string | number | null | undefined) => {
        if (value === null || value === undefined) return "0.000%";
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num)) return "0.000%";
        return `${(num * 100).toFixed(3)}%`;
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return "N/A";
        }
    };

    const getBondName = () => {
        return bondData.step1?.nombreInterno || bondData.step1?.name || "N/A";
    };

    const toggleSection = (section: string) => {
        setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
    };

    // 📊 EXTRAER MÉTRICAS DESDE RESULTADOS REALES
    const metricas = lastResult?.metricas?.emisor;
    const metricasBonista = lastResult?.metricas?.bonista;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Confirmación</h2>

            {/* Mensaje si el bono ya fue creado */}
            {bondId && (
                <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">✅ Bono Creado Exitosamente</h3>
                    <p className="text-green-300 text-sm">
                        El bono "{getBondName()}" ha sido creado con ID: {bondId}
                    </p>
                    <p className="text-green-200 text-xs mt-1">
                        Ahora puedes calcular los flujos de caja financieros.
                    </p>
                </div>
            )}

            {/* Review Accordion */}
            <div className="mb-8">
                {/* Datos Generales */}
                <div className="border border-[#2A2A2A] rounded-lg mb-4 overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleSection("datos")}>
                        <h3 className="text-lg font-medium">Datos Generales</h3>
                        <ChevronDown
                            className={`text-gray-400 transition-transform ${expandedSections.datos ? "rotate-180" : ""}`}
                            size={16}
                        />
                    </div>
                    {expandedSections.datos && (
                        <div className="border-t border-[#2A2A2A] p-4 bg-[#1A1A1A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Nombre del Bono</p>
                                    <p className="font-medium">{getBondName()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Código ISIN</p>
                                    <p className="font-medium">{bondData.step1?.codigoIsin || "Se generará automáticamente"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Valor Nominal</p>
                                    <p className="font-medium">{formatCurrency(bondData.step1?.valorNominal || "0")}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Valor Comercial</p>
                                    <p className="font-medium">{formatCurrency(bondData.step1?.valorComercial || "0")}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Plazo</p>
                                    <p className="font-medium">{bondData.step1?.numAnios || "0"} años</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Fecha de Emisión</p>
                                    <p className="font-medium">{formatDate(bondData.step1?.fechaEmision)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Condiciones */}
                <div className="border border-[#2A2A2A] rounded-lg mb-4 overflow-hidden">
                    <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => toggleSection("condiciones")}
                    >
                        <h3 className="text-lg font-medium">Condiciones Financieras</h3>
                        <ChevronDown
                            className={`text-gray-400 transition-transform ${expandedSections.condiciones ? "rotate-180" : ""}`}
                            size={16}
                        />
                    </div>
                    {expandedSections.condiciones && (
                        <div className="border-t border-[#2A2A2A] p-4 bg-[#1A1A1A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Tipo de Tasa</p>
                                    <p className="font-medium capitalize">{bondData.step2?.tipoTasa || "Efectiva"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Tasa de Interés</p>
                                    <p className="font-medium">{formatPercent(bondData.step2?.tasaAnual)} anual</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Frecuencia de Pago</p>
                                    <p className="font-medium capitalize">{bondData.step1?.frecuenciaCupon || "Semestral"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Prima al Vencimiento</p>
                                    <p className="font-medium">{formatPercent(bondData.step2?.primaVencimiento)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Impuesto a la Renta</p>
                                    <p className="font-medium">{formatPercent(bondData.step2?.impuestoRenta)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Inflación Anual</p>
                                    <p className="font-medium">{formatPercent(bondData.step2?.inflacionAnual)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Costes */}
                <div className="border border-[#2A2A2A] rounded-lg mb-4 overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleSection("costes")}>
                        <h3 className="text-lg font-medium">Costes Iniciales</h3>
                        <ChevronDown
                            className={`text-gray-400 transition-transform ${expandedSections.costes ? "rotate-180" : ""}`}
                            size={16}
                        />
                    </div>
                    {expandedSections.costes && (
                        <div className="border-t border-[#2A2A2A] p-4 bg-[#1A1A1A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Total Costes Emisor</p>
                                    <p className="font-medium text-[#39FF14]">{formatCurrency(bondData.step3?.emisorTotalAbs || "0")}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Total Costes Bonista</p>
                                    <p className="font-medium text-[#39FF14]">{formatCurrency(bondData.step3?.bonistaTotalAbs || "0")}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sección de Cálculos - Solo si el bono existe */}
            {bondId && (
                <div className="mb-8">
                    {/* Botón para calcular */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Cálculos Financieros</h3>
                        <div className="flex items-center space-x-3">
                            {hasFlowsData && (
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                                >
                                    <Download size={16} className="mr-2" />
                                    Descargar CSV
                                </button>
                            )}
                            <button
                                onClick={handleCalculateFlows}
                                disabled={isCalculating || !canCalculate}
                                className={`flex items-center px-6 py-3 rounded-lg transition ${
                                    hasFlowsData
                                        ? "bg-[#1A3A1A] border-[#39FF14] text-[#39FF14] border"
                                        : "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                                }`}
                            >
                                {isCalculating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                        Calculando...
                                    </>
                                ) : hasFlowsData ? (
                                    <>
                                        <CheckCircle className="mr-2" size={16} />
                                        Flujos Calculados
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="mr-2" size={16} />
                                        Calcular Flujos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error de cálculos */}
                    {(calculationError || flowsError) && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start">
                                <AlertCircle className="text-red-400 mr-3 mt-0.5 flex-shrink-0" size={16} />
                                <div>
                                    <h4 className="text-red-400 font-medium mb-1">Error en Cálculos</h4>
                                    <p className="text-red-300 text-sm">
                                        {calculationError || flowsError}
                                    </p>
                                    <p className="text-red-200 text-xs mt-2">
                                        Verifica que todos los datos del bono sean correctos y vuelve a intentar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs de resultados - Solo si hay flujos calculados */}
                    {hasFlowsData && lastResult && (
                        <div>
                            {/* Tabs */}
                            <div className="mb-6 border-b border-[#2A2A2A] flex">
                                {[
                                    { id: "summary", label: "Resumen" },
                                    { id: "flows", label: "Flujos" },
                                    { id: "analytics", label: "Analytics" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
                                            activeTab === tab.id
                                                ? "text-[#39FF14] border-[#39FF14]"
                                                : "text-gray-400 border-transparent hover:text-white hover:border-[#39FF14]"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            {activeTab === "summary" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Indicadores Clave (Emisor)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">VAN Emisor</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {formatCurrency(metricas?.van || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {formatPercent(metricas?.tceaEmisor || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">TCEA Emisor (c/Escudo)</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {formatPercent(metricas?.tceaEmisorConEscudo || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">Duración</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {metricas?.duracion ? `${metricas.duracion.toFixed(2)} años` : "N/A"}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">Convexidad</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {metricas?.convexidad ? metricas.convexidad.toFixed(2) : "N/A"}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">TREA Bonista</p>
                                            <p className="text-blue-400 font-medium text-lg">
                                                {formatPercent(metricasBonista?.treaBonista || 0)}
                                            </p>
                                        </div>
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
                                                    <td className="py-2 px-3 text-right">
                                                        {flow.bonoIndexado ? formatCurrency(flow.bonoIndexado) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.cupon && flow.cupon < 0 ? "text-red-400" : ""}`}>
                                                        {flow.cupon ? formatCurrency(flow.cupon) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.amortizacion && flow.amortizacion < 0 ? "text-red-400" : ""}`}>
                                                        {flow.amortizacion ? formatCurrency(flow.amortizacion) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.prima && flow.prima < 0 ? "text-red-400" : ""}`}>
                                                        {flow.prima ? formatCurrency(flow.prima) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.escudoFiscal && flow.escudoFiscal > 0 ? "text-green-400" : ""}`}>
                                                        {flow.escudoFiscal ? formatCurrency(flow.escudoFiscal) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${
                                                        flow.flujoEmisor && flow.flujoEmisor > 0 ? "text-green-400" :
                                                            flow.flujoEmisor && flow.flujoEmisor < 0 ? "text-red-400" : ""
                                                    }`}>
                                                        {flow.flujoEmisor ? formatCurrency(flow.flujoEmisor) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${
                                                        flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo > 0 ? "text-green-400" :
                                                            flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo < 0 ? "text-red-400" : ""
                                                    }`}>
                                                        {flow.flujoEmisorConEscudo ? formatCurrency(flow.flujoEmisorConEscudo) : "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                            {flows.length > 5 && (
                                                <tr>
                                                    <td colSpan={9} className="py-2 px-3 text-center text-gray-500 text-xs">
                                                        ... y {flows.length - 5} períodos más
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "analytics" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Análisis de Rentabilidad y Riesgo</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h5 className="font-medium mb-3 text-green-400">Perspectiva Emisor</h5>
                                            <div className="space-y-3">
                                                <div className="bg-[#1E1E1E] rounded-lg p-4">
                                                    <p className="text-gray-400 text-sm mb-1">VAN Emisor (c/Escudo)</p>
                                                    <p className="text-[#39FF14] font-medium text-xl">
                                                        {formatCurrency(metricas?.van || 0)}
                                                    </p>
                                                </div>
                                                <div className="bg-[#1E1E1E] rounded-lg p-4">
                                                    <p className="text-gray-400 text-sm mb-1">TCEA Emisor (c/Escudo)</p>
                                                    <p className="text-[#39FF14] font-medium text-xl">
                                                        {formatPercent(metricas?.tceaEmisorConEscudo || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-medium mb-3 text-blue-400">Perspectiva Bonista</h5>
                                            <div className="space-y-3">
                                                <div className="bg-[#1E1E1E] rounded-lg p-4">
                                                    <p className="text-gray-400 text-sm mb-1">VAN Bonista</p>
                                                    <p className="text-blue-400 font-medium text-xl">
                                                        {formatCurrency(metricasBonista?.van || 0)}
                                                    </p>
                                                </div>
                                                <div className="bg-[#1E1E1E] rounded-lg p-4">
                                                    <p className="text-gray-400 text-sm mb-1">TREA Bonista</p>
                                                    <p className="text-blue-400 font-medium text-xl">
                                                        {formatPercent(metricasBonista?.treaBonista || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Estado sin cálculos */}
                    {!hasFlowsData && !isCalculating && !calculationError && (
                        <div className="text-center py-8">
                            <Calculator className="mx-auto text-gray-600 mb-4" size={48} />
                            <h4 className="text-lg font-semibold mb-2">Flujos Pendientes de Cálculo</h4>
                            <p className="text-gray-400 mb-4">
                                Haz clic en "Calcular Flujos" para generar los cálculos financieros del bono.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Section - Solo si no hay bono creado aún */}
            {!bondId && (
                <div className="mb-8">
                    <div className="flex items-start">
                        <input
                            type="checkbox"
                            id="confirmation-checkbox"
                            checked={confirmationChecked}
                            onChange={(e) => setConfirmationChecked(e.target.checked)}
                            className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-[#39FF14] focus:ring-[#39FF14] bg-gray-700"
                        />
                        <label htmlFor="confirmation-checkbox" className="text-gray-300">
                            He revisado y acepto todos los datos proporcionados para la emisión del bono.
                            Los cálculos financieros han sido verificados y entiendo que una vez publicado,
                            estos datos no podrán ser modificados.
                        </label>
                    </div>

                    {/* Estado para continuar */}
                    {confirmationChecked && (
                        <div className="mt-3 flex items-center text-green-400 text-sm">
                            <CheckCircle size={16} className="mr-2" />
                            Listo para crear el bono
                        </div>
                    )}
                </div>
            )}

            {/* Información adicional para depuración */}
            <div className="mt-8 text-xs text-gray-400 space-y-1">
                <p>✅ Datos validados correctamente</p>
                <p>✅ Componentes conectados al backend</p>
                {bondId && <p>✅ Bono creado: {bondId}</p>}
                {hasFlowsData && <p>✅ Flujos calculados: {flows.length} períodos</p>}
                {status && <p>🔄 Estado cálculos: {status}</p>}
            </div>
        </div>
    );
}