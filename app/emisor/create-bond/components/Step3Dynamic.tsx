// app/emisor/create-bond/components/Step3Dynamic.tsx
'use client';

import { useState, useEffect } from 'react';
import { Percent, DollarSign, Calculator, Info, AlertCircle } from 'lucide-react';

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

interface Step3Props {
    bondData: BondData;
    saveData: (data: any, step: number) => void;
}

interface CalculatedCosts {
    emisorTotalAbs: number;
    bonistaTotalAbs: number;
    totalCostsAbs: number;
    flotacionBonista: number;
    cavaliBonista: number;
}

export function Step3Dynamic({ bondData, saveData }: Step3Props) {
    const [formData, setFormData] = useState({
        estructuracionEmisor: bondData.step3?.estructuracionEmisor || '1.00',
        colocacionEmisor: bondData.step3?.colocacionEmisor || '0.25',
        flotacionEmisor: bondData.step3?.flotacionEmisor || '0.225',
        cavaliEmisor: bondData.step3?.cavaliEmisor || '0.25',
    });

    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [calculatedCosts, setCalculatedCosts] = useState<CalculatedCosts>({
        emisorTotalAbs: 0,
        bonistaTotalAbs: 0,
        totalCostsAbs: 0,
        flotacionBonista: 0,
        cavaliBonista: 0,
    });

    const valorComercial = parseFloat(bondData.step1?.valorComercial || '0');

    // Límites máximos para los costes (según normativas típicas)
    const limits = {
        flotacionTotal: 0.45, // 0.45% total entre emisor y bonista
        cavaliTotal: 0.50,   // 0.50% total entre emisor y bonista
    };

    const calculateCosts = (): CalculatedCosts => {
        const estructuracionEmisorVal = parseFloat(formData.estructuracionEmisor) || 0;
        const colocacionEmisorVal = parseFloat(formData.colocacionEmisor) || 0;
        const flotacionEmisorVal = parseFloat(formData.flotacionEmisor) || 0;
        const cavaliEmisorVal = parseFloat(formData.cavaliEmisor) || 0;

        // Calcular costes del bonista (diferencia hasta los límites máximos)
        const flotacionBonistaVal = Math.max(0, limits.flotacionTotal - flotacionEmisorVal);
        const cavaliBonistaVal = Math.max(0, limits.cavaliTotal - cavaliEmisorVal);

        // Costes absolutos del emisor
        const emisorTotalAbs =
            ((estructuracionEmisorVal + colocacionEmisorVal + flotacionEmisorVal + cavaliEmisorVal) / 100) * valorComercial;

        // Costes absolutos del bonista
        const bonistaTotalAbs =
            ((flotacionBonistaVal + cavaliBonistaVal) / 100) * valorComercial;

        return {
            emisorTotalAbs,
            bonistaTotalAbs,
            totalCostsAbs: emisorTotalAbs + bonistaTotalAbs,
            flotacionBonista: flotacionBonistaVal,
            cavaliBonista: cavaliBonistaVal,
        };
    };

    // Recalcular costes cuando cambian los datos
    useEffect(() => {
        const costs = calculateCosts();
        setCalculatedCosts(costs);

        // Guardar datos completos incluyendo cálculos
        const completeData = {
            ...formData,
            emisorTotalAbs: costs.emisorTotalAbs.toFixed(2),
            bonistaTotalAbs: costs.bonistaTotalAbs.toFixed(2),
            totalCostsAbs: costs.totalCostsAbs.toFixed(2),
            flotacionBonista: costs.flotacionBonista.toFixed(3),
            cavaliBonista: costs.cavaliBonista.toFixed(3),
        };

        saveData(completeData, 3);
    }, [formData, valorComercial]);

    const handleChange = (field: string, value: string) => {
        const numValue = parseFloat(value) || 0;

        // Validaciones específicas
        let hasError = false;

        if (field === 'flotacionEmisor' && numValue > limits.flotacionTotal) {
            hasError = true;
        }
        if (field === 'cavaliEmisor' && numValue > limits.cavaliTotal) {
            hasError = true;
        }

        setErrors({ ...errors, [field]: hasError });

        if (!hasError) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const validateField = (field: string) => {
        const value = parseFloat(formData[field as keyof typeof formData]) || 0;

        if (value < 0) {
            setErrors({ ...errors, [field]: true });
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatPercentage = (percentage: number): string => {
        return `${percentage.toFixed(3)}%`;
    };

    const getFieldError = (field: string): string | null => {
        if (field === 'flotacionEmisor' && parseFloat(formData.flotacionEmisor) > limits.flotacionTotal) {
            return `No puede exceder ${limits.flotacionTotal}%`;
        }
        if (field === 'cavaliEmisor' && parseFloat(formData.cavaliEmisor) > limits.cavaliTotal) {
            return `No puede exceder ${limits.cavaliTotal}%`;
        }
        return null;
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Costes y Comisiones</h2>

            {/* Información del valor comercial */}
            <div className="mb-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Valor Comercial del Bono</p>
                        <p className="text-lg font-semibold text-[#39FF14]">
                            {formatCurrency(valorComercial)}
                        </p>
                    </div>
                    <Calculator className="text-gray-500" size={24} />
                </div>
            </div>

            <form>
                <div className="space-y-6">
                    {/* Costes del Emisor */}
                    <div className="border border-[#2A2A2A] rounded-lg p-6">
                        <h3 className="text-lg font-medium mb-4 flex items-center">
                            <DollarSign className="mr-2 text-[#39FF14]" size={20} />
                            Costes del Emisor
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Estructuración */}
                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Estructuración (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.estructuracionEmisor}
                                        onChange={(e) => handleChange('estructuracionEmisor', e.target.value)}
                                        onBlur={() => validateField('estructuracionEmisor')}
                                        className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                            errors.estructuracionEmisor ? 'border-red-500' : 'border-[#2A2A2A]'
                                        }`}
                                        placeholder="1.00"
                                        step="0.001"
                                        min="0"
                                    />
                                    <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency((parseFloat(formData.estructuracionEmisor) || 0) / 100 * valorComercial)}
                                </div>
                            </div>

                            {/* Colocación */}
                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Colocación (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.colocacionEmisor}
                                        onChange={(e) => handleChange('colocacionEmisor', e.target.value)}
                                        onBlur={() => validateField('colocacionEmisor')}
                                        className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                            errors.colocacionEmisor ? 'border-red-500' : 'border-[#2A2A2A]'
                                        }`}
                                        placeholder="0.25"
                                        step="0.001"
                                        min="0"
                                    />
                                    <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency((parseFloat(formData.colocacionEmisor) || 0) / 100 * valorComercial)}
                                </div>
                            </div>

                            {/* Flotación - Emisor */}
                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Flotación - Emisor (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.flotacionEmisor}
                                        onChange={(e) => handleChange('flotacionEmisor', e.target.value)}
                                        onBlur={() => validateField('flotacionEmisor')}
                                        className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                            errors.flotacionEmisor ? 'border-red-500' : 'border-[#2A2A2A]'
                                        }`}
                                        placeholder="0.225"
                                        step="0.001"
                                        min="0"
                                        max={limits.flotacionTotal}
                                    />
                                    <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency((parseFloat(formData.flotacionEmisor) || 0) / 100 * valorComercial)}
                                </div>
                                {getFieldError('flotacionEmisor') && (
                                    <div className="mt-1 text-xs text-red-400 flex items-center">
                                        <AlertCircle size={12} className="mr-1" />
                                        {getFieldError('flotacionEmisor')}
                                    </div>
                                )}
                            </div>

                            {/* CAVALI - Emisor */}
                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    CAVALI - Emisor (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.cavaliEmisor}
                                        onChange={(e) => handleChange('cavaliEmisor', e.target.value)}
                                        onBlur={() => validateField('cavaliEmisor')}
                                        className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                            errors.cavaliEmisor ? 'border-red-500' : 'border-[#2A2A2A]'
                                        }`}
                                        placeholder="0.25"
                                        step="0.001"
                                        min="0"
                                        max={limits.cavaliTotal}
                                    />
                                    <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency((parseFloat(formData.cavaliEmisor) || 0) / 100 * valorComercial)}
                                </div>
                                {getFieldError('cavaliEmisor') && (
                                    <div className="mt-1 text-xs text-red-400 flex items-center">
                                        <AlertCircle size={12} className="mr-1" />
                                        {getFieldError('cavaliEmisor')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Total Emisor */}
                        <div className="mt-6 pt-4 border-t border-[#2A2A2A]">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-lg">Total Costes Emisor:</span>
                                <span className="font-bold text-xl text-[#39FF14]">
                  {formatCurrency(calculatedCosts.emisorTotalAbs)}
                </span>
                            </div>
                        </div>
                    </div>

                    {/* Costes del Bonista (Calculados Automáticamente) */}
                    <div className="border border-[#2A2A2A] rounded-lg p-6 bg-[#1A1A1A]">
                        <h3 className="text-lg font-medium mb-4 flex items-center">
                            <Calculator className="mr-2 text-gray-400" size={20} />
                            Costes del Bonista (Automático)
                        </h3>

                        <div className="mb-4 p-3 bg-[#0D0D0D] rounded-lg border-l-4 border-blue-500">
                            <p className="text-sm text-gray-300">
                                <Info className="inline text-blue-400 mr-2" size={14} />
                                Los costes del bonista se calculan automáticamente como la diferencia entre los límites regulatorios y los costes del emisor.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    Flotación - Bonista (%)
                                </label>
                                <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-gray-300">
                                    {formatPercentage(calculatedCosts.flotacionBonista)}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency(calculatedCosts.flotacionBonista / 100 * valorComercial)}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#AAAAAA] text-sm mb-2">
                                    CAVALI - Bonista (%)
                                </label>
                                <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-gray-300">
                                    {formatPercentage(calculatedCosts.cavaliBonista)}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    Absoluto: {formatCurrency(calculatedCosts.cavaliBonista / 100 * valorComercial)}
                                </div>
                            </div>
                        </div>

                        {/* Total Bonista */}
                        <div className="mt-6 pt-4 border-t border-[#2A2A2A]">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-lg">Total Costes Bonista:</span>
                                <span className="font-bold text-xl text-blue-400">
                  {formatCurrency(calculatedCosts.bonistaTotalAbs)}
                </span>
                            </div>
                        </div>
                    </div>

                    {/* Resumen Total */}
                    <div className="border-2 border-[#39FF14] rounded-lg p-6 bg-[#0A1A0A]">
                        <h3 className="text-xl font-bold mb-4 text-[#39FF14]">Resumen de Costes Totales</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Costes del Emisor:</span>
                                <span className="font-semibold text-[#39FF14]">
                  {formatCurrency(calculatedCosts.emisorTotalAbs)}
                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">Costes del Bonista:</span>
                                <span className="font-semibold text-blue-400">
                  {formatCurrency(calculatedCosts.bonistaTotalAbs)}
                </span>
                            </div>

                            <div className="border-t border-[#2A2A2A] pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold">TOTAL GENERAL:</span>
                                    <span className="text-2xl font-bold text-[#39FF14]">
                    {formatCurrency(calculatedCosts.totalCostsAbs)}
                  </span>
                                </div>
                            </div>

                            <div className="text-center text-sm text-gray-400 mt-2">
                                {((calculatedCosts.totalCostsAbs / valorComercial) * 100).toFixed(3)}% del valor comercial
                            </div>
                        </div>
                    </div>

                    {/* Límites Regulatorios */}
                    <div className="border border-gray-600 rounded-lg p-4 bg-[#1A1A1A]">
                        <h4 className="font-medium mb-3 text-gray-300">Límites Regulatorios</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-400">Flotación Total (Emisor + Bonista): </span>
                                <span className="text-white">{formatPercentage(limits.flotacionTotal)}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">CAVALI Total (Emisor + Bonista): </span>
                                <span className="text-white">{formatPercentage(limits.cavaliTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}