// app/emisor/create-bond/components/Step4Dynamic.tsx - DISEÑO ORIGINAL CORREGIDO
'use client';

import { useState } from 'react';
import { ChevronDown, Calculator, CheckCircle } from 'lucide-react';

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
    };
    step2?: {
        tipoTasa?: string;
        tasaAnual?: string;
        indexadoInflacion?: boolean;
        inflacionAnual?: string;
        primaVencimiento?: string;
        impuestoRenta?: string;
    };
    step3?: {
        estructuracionEmisor?: string;
        colocacionEmisor?: string;
        flotacionEmisor?: string;
        cavaliEmisor?: string;
        emisorTotalAbs?: string;
        bonistaTotalAbs?: string;
        totalCostsAbs?: string;
    };
}

interface Step4Props {
    bondData: BondData;
    flowsCalculated: boolean;
    setFlowsCalculated: (value: boolean) => void;
    confirmationChecked: boolean;
    setConfirmationChecked: (value: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function Step4Dynamic({
                                 bondData,
                                 flowsCalculated,
                                 setFlowsCalculated,
                                 confirmationChecked,
                                 setConfirmationChecked,
                                 activeTab,
                                 setActiveTab,
                             }: Step4Props) {
    const [isCalculating, setIsCalculating] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        datos: true,
        condiciones: false,
        costes: false,
    });

    const handleCalculateFlows = () => {
        setIsCalculating(true);
        setTimeout(() => {
            setFlowsCalculated(true);
            setIsCalculating(false);
        }, 1500);
    };

    const toggleSection = (section: string) => {
        setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0);
    };

    const getBondName = () => {
        return bondData.step1?.nombreInterno || bondData.step1?.name || "N/A";
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Publicación</h2>

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
                                    <p className="font-medium">{bondData.step1?.codigoIsin || "N/A"}</p>
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
                                    <p className="font-medium">{bondData.step1?.fechaEmision || "N/A"}</p>
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
                        <h3 className="text-lg font-medium">Condiciones</h3>
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
                                    <p className="font-medium capitalize">{bondData.step2?.tipoTasa || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Tasa de Interés</p>
                                    <p className="font-medium">{bondData.step2?.tasaAnual || "0"}% anual</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Frecuencia de Pago</p>
                                    <p className="font-medium capitalize">{bondData.step1?.frecuenciaCupon || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Prima al Vencimiento</p>
                                    <p className="font-medium">{bondData.step2?.primaVencimiento || "0"}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Costes */}
                <div className="border border-[#2A2A2A] rounded-lg mb-4 overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleSection("costes")}>
                        <h3 className="text-lg font-medium">Costes</h3>
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

            {/* Calculate Flows Section */}
            <div className="mb-8">
                <button
                    onClick={handleCalculateFlows}
                    disabled={isCalculating || flowsCalculated}
                    className={`w-full py-3 border rounded-lg transition flex items-center justify-center mb-6 ${
                        flowsCalculated
                            ? "bg-[#1A3A1A] border-[#39FF14] text-[#39FF14]"
                            : "bg-[#1E1E1E] border-[#2A2A2A] hover:bg-[#252525]"
                    }`}
                >
                    {isCalculating ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Calculando...
                        </>
                    ) : flowsCalculated ? (
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

                {flowsCalculated && (
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
                                <p className="text-lg font-semibold mb-4">Resumen de Indicadores Clave (Emisor)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                        <p className="text-gray-400 text-xs mb-1">Precio Neto Recibido Emisor</p>
                                        <p className="text-[#39FF14] font-medium text-lg">1,026.90</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                        <p className="text-gray-400 text-xs mb-1">Costes Iniciales Totales (Emisor)</p>
                                        <p className="text-[#39FF14] font-medium text-lg">23.10</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                        <p className="text-gray-400 text-xs mb-1">Duración</p>
                                        <p className="text-[#39FF14] font-medium text-lg">4.45 años</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                        <p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p>
                                        <p className="text-[#39FF14] font-medium text-lg">18.176%</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                        <p className="text-gray-400 text-xs mb-1">TCEA Emisor (c/Escudo)</p>
                                        <p className="text-[#39FF14] font-medium text-lg">15.556%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "flows" && (
                            <div>
                                <p className="text-lg font-semibold mb-4">Flujo de Caja Proyectado (Emisor)</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse min-w-[800px]">
                                        <thead>
                                        <tr className="bg-[#1A1A1A] text-gray-400 text-xs">
                                            <th className="py-2 px-3 text-center font-medium">Nº</th>
                                            <th className="py-2 px-3 text-left font-medium">Fecha</th>
                                            <th className="py-2 px-3 text-right font-medium">Cupón (Int.)</th>
                                            <th className="py-2 px-3 text-right font-medium">Amort.</th>
                                            <th className="py-2 px-3 text-right font-medium">Flujo Emisor</th>
                                        </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                        <tr className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                                            <td className="py-2 px-3 text-center">0</td>
                                            <td className="py-2 px-3 text-left">01/06/2025</td>
                                            <td className="py-2 px-3 text-right">-</td>
                                            <td className="py-2 px-3 text-right">-</td>
                                            <td className="py-2 px-3 text-right text-green-500">+1,026.90</td>
                                        </tr>
                                        <tr className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                                            <td className="py-2 px-3 text-center">1</td>
                                            <td className="py-2 px-3 text-left">28/11/2025</td>
                                            <td className="py-2 px-3 text-right text-red-500">(41.15)</td>
                                            <td className="py-2 px-3 text-right">0.00</td>
                                            <td className="py-2 px-3 text-right text-red-500">(41.15)</td>
                                        </tr>
                                        <tr className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                                            <td className="py-2 px-3 text-center">2</td>
                                            <td className="py-2 px-3 text-left">27/05/2026</td>
                                            <td className="py-2 px-3 text-right text-red-500">(43.15)</td>
                                            <td className="py-2 px-3 text-right">0.00</td>
                                            <td className="py-2 px-3 text-right text-red-500">(43.15)</td>
                                        </tr>
                                        <tr className="hover:bg-[#1E1E1E]">
                                            <td className="py-2 px-3 text-center">10</td>
                                            <td className="py-2 px-3 text-left">06/05/2030</td>
                                            <td className="py-2 px-3 text-right text-red-500">(63.18)</td>
                                            <td className="py-2 px-3 text-right text-red-500">(1,610.51)</td>
                                            <td className="py-2 px-3 text-right text-red-500">(1,683.69)</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "analytics" && (
                            <div>
                                <p className="text-lg font-semibold mb-4">Análisis de Rentabilidad y Riesgo (Emisor)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                                        <p className="text-gray-400 text-sm mb-1">VAN Emisor (c/Escudo)</p>
                                        <p className="text-[#39FF14] font-medium text-xl">693.37</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                                        <p className="text-gray-400 text-sm mb-1">TIR Emisor (bruta)</p>
                                        <p className="text-[#39FF14] font-medium text-xl">18.450%</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                                        <p className="text-gray-400 text-sm mb-1">Duración Modificada</p>
                                        <p className="text-[#39FF14] font-medium text-xl">4.35</p>
                                    </div>
                                    <div className="bg-[#1E1E1E] rounded-lg p-4">
                                        <p className="text-gray-400 text-sm mb-1">Total Ratios Decisión</p>
                                        <p className="text-[#39FF14] font-medium text-xl">26.84</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmation Section */}
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
                        He revisado y acepto todos los datos proporcionados para la emisión del bono. Entiendo que una vez
                        publicado, estos datos no podrán ser modificados.
                    </label>
                </div>
            </div>
        </div>
    );
}