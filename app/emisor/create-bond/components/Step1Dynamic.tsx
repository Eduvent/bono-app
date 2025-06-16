"use client"

import { useState, useEffect } from "react"
import { Calendar, DollarSign } from "lucide-react"

interface Step1Props {
    data: any;
    onUpdate: (data: any, isValid: boolean) => void;
    isValid: boolean;
}

export function Step1Dynamic({ data, onUpdate, isValid }: Step1Props) {
    const [formData, setFormData] = useState({
        name: data.name || "",
        codigoIsin: data.codigoIsin || "",
        valorNominal: data.valorNominal || "",
        valorComercial: data.valorComercial || "",
        numAnios: data.numAnios || "5",
        fechaEmision: data.fechaEmision || new Date().toISOString().split("T")[0],
        frecuenciaCupon: data.frecuenciaCupon || "semestral",
        diasPorAno: data.diasPorAno || 360,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Validación en tiempo real
    useEffect(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Nombre requerido";
        }

        if (!formData.valorNominal || Number(formData.valorNominal) <= 0) {
            newErrors.valorNominal = "Valor nominal debe ser mayor a 0";
        }

        if (!formData.valorComercial || Number(formData.valorComercial) <= 0) {
            newErrors.valorComercial = "Valor comercial debe ser mayor a 0";
        }

        if (!formData.numAnios || Number(formData.numAnios) <= 0) {
            newErrors.numAnios = "Número de años debe ser mayor a 0";
        }

        setErrors(newErrors);

        // Preparar datos para envío
        const processedData = {
            ...formData,
            valorNominal: Number(formData.valorNominal),
            valorComercial: Number(formData.valorComercial),
            numAnios: Number(formData.numAnios),
            diasPorAno: Number(formData.diasPorAno),
        };

        // Actualizar parent
        onUpdate(processedData, Object.keys(newErrors).length === 0);
    }, [formData, onUpdate]);

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Datos Generales del Bono</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre del Bono */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Nombre del Bono *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                            errors.name ? "border-red-500" : "border-[#2A2A2A]"
                        }`}
                        placeholder="Ej. Bono VAC Serie A 2024"
                    />
                    {errors.name && (
                        <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                    )}
                </div>

                {/* Código ISIN */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Código ISIN (opcional)
                    </label>
                    <input
                        type="text"
                        value={formData.codigoIsin}
                        onChange={(e) => handleChange("codigoIsin", e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
                        placeholder="Ej. US1234567890"
                    />
                </div>

                {/* Valor Nominal */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Valor Nominal (USD) *
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.valorNominal}
                            onChange={(e) => handleChange("valorNominal", e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                                errors.valorNominal ? "border-red-500" : "border-[#2A2A2A]"
                            }`}
                            placeholder="1000.00"
                        />
                    </div>
                    {errors.valorNominal && (
                        <p className="text-red-400 text-sm mt-1">{errors.valorNominal}</p>
                    )}
                </div>

                {/* Valor Comercial */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Valor Comercial (USD) *
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.valorComercial}
                            onChange={(e) => handleChange("valorComercial", e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                                errors.valorComercial ? "border-red-500" : "border-[#2A2A2A]"
                            }`}
                            placeholder="1050.00"
                        />
                    </div>
                    {errors.valorComercial && (
                        <p className="text-red-400 text-sm mt-1">{errors.valorComercial}</p>
                    )}
                </div>

                {/* Número de Años */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Plazo (años) *
                    </label>
                    <select
                        value={formData.numAnios}
                        onChange={(e) => handleChange("numAnios", e.target.value)}
                        className={`w-full bg-[#1A1A1A] text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                            errors.numAnios ? "border-red-500" : "border-[#2A2A2A]"
                        }`}
                    >
                        {[1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30].map(year => (
                            <option key={year} value={year}>
                                {year} {year === 1 ? 'año' : 'años'}
                            </option>
                        ))}
                    </select>
                    {errors.numAnios && (
                        <p className="text-red-400 text-sm mt-1">{errors.numAnios}</p>
                    )}
                </div>

                {/* Fecha de Emisión */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Fecha de Emisión *
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="date"
                            value={formData.fechaEmision}
                            onChange={(e) => handleChange("fechaEmision", e.target.value)}
                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
                        />
                    </div>
                </div>

                {/* Frecuencia de Cupón */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Frecuencia de Cupón
                    </label>
                    <select
                        value={formData.frecuenciaCupon}
                        onChange={(e) => handleChange("frecuenciaCupon", e.target.value)}
                        className="w-full bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
                    >
                        <option value="mensual">Mensual</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="cuatrimestral">Cuatrimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                    </select>
                </div>

                {/* Base de Días */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Base de Días
                    </label>
                    <select
                        value={formData.diasPorAno}
                        onChange={(e) => handleChange("diasPorAno", Number(e.target.value))}
                        className="w-full bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
                    >
                        <option value={360}>360 días</option>
                        <option value={365}>365 días</option>
                    </select>
                </div>
            </div>

            {/* Resumen de datos ingresados */}
            {isValid && (
                <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">✅ Datos Válidos</h3>
                    <p className="text-green-300 text-sm">
                        Bono "{formData.name}" por ${Number(formData.valorNominal).toLocaleString()}
                        a {formData.numAnios} años con cupones {formData.frecuenciaCupon}es.
                    </p>
                </div>
            )}
        </div>
    )
}