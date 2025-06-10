"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  ArrowRight,
  Check,
  Calculator,
  PlaneIcon as PaperPlane,
  CheckCircle,
  Info,
  ChevronDown,
  Plus,
  Minus,
  Calendar,
  Percent,
  DollarSign,
} from "lucide-react"

interface BondData {
  step1?: {
    nombreInterno: string
    codigoISIN: string
    valorNominal: string
    valorComercial: string
    numAnios: string
    fechaEmision: string
    frecuenciaCupon: string
    baseDias: string
  }
  step2?: {
    tipoTasa: string
    periodicidadCapitalizacion: string
    tasaAnual: string
    indexadoInflacion: boolean
    inflacionAnual: string
    primaVencimiento: string
    impuestoRenta: string
  }
  step3?: {
    estructuracionEmisor: string
    colocacionEmisor: string
    flotacionEmisor: string
    cavaliEmisor: string
    emisorTotalAbs: string
    bonistaTotalAbs: string
    totalCostsAbs: string
  }
}

export default function CreateBondWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [bondData, setBondData] = useState<BondData>({})
  const [flowsCalculated, setFlowsCalculated] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "emisor") {
      router.push("/auth/login")
      return
    }

    // Load saved data
    const savedData = localStorage.getItem("bondWizardData")
    if (savedData) {
      setBondData(JSON.parse(savedData))
    }
  }, [router])

  const saveData = (stepData: any, step: number) => {
    const newData = { ...bondData, [`step${step}`]: stepData }
    setBondData(newData)
    localStorage.setItem("bondWizardData", JSON.stringify(newData))
  }

  const getProgressPercentage = () => (currentStep / 4) * 100

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return bondData.step1?.nombreInterno && bondData.step1?.valorNominal && bondData.step1?.valorComercial
      case 2:
        return bondData.step2?.tasaAnual && bondData.step2?.primaVencimiento && bondData.step2?.impuestoRenta
      case 3:
        return bondData.step3?.estructuracionEmisor
      case 4:
        return flowsCalculated && confirmationChecked
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceedToNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!canProceedToNext()) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      localStorage.removeItem("bondWizardData")
      router.push("/emisor/dashboard")
    }, 2000)
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
            onClick={() => router.push("/emisor/dashboard")}
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
            <p className="text-gray-400">Complete la información necesaria para configurar su nuevo bono</p>
          </div>

          {/* Progress Section */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Progreso: {getProgressPercentage().toFixed(0)}%</div>
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
                        ? "bg-[#39FF14] text-black"
                        : step === currentStep
                          ? "bg-[#39FF14] text-black"
                          : "bg-[#2A2A2A] text-gray-500"
                    }`}
                  >
                    {step < currentStep ? <Check size={12} /> : step}
                  </div>
                  <span className={`text-xs font-medium ${step <= currentStep ? "text-[#39FF14]" : "text-gray-500"}`}>
                    {["Datos", "Finanzas", "Costes", "Revisión"][step - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 pb-6">
            {currentStep === 1 && <Step1 bondData={bondData} saveData={saveData} />}
            {currentStep === 2 && <Step2 bondData={bondData} saveData={saveData} />}
            {currentStep === 3 && <Step3 bondData={bondData} saveData={saveData} />}
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
                onClick={currentStep === 1 ? () => router.push("/emisor/dashboard") : handlePrevious}
                className="px-6 py-3 border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#1A1A1A] transition flex items-center"
              >
                <ArrowLeft className="mr-2" size={16} />
                {currentStep === 1 ? "Cancelar" : "Anterior"}
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                    canProceedToNext()
                      ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
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
                      ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
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
  )
}

// Step 1 Component
function Step1({ bondData, saveData }: { bondData: BondData; saveData: (data: any, step: number) => void }) {
  const [formData, setFormData] = useState({
    nombreInterno: bondData.step1?.nombreInterno || "",
    codigoISIN: bondData.step1?.codigoISIN || "",
    valorNominal: bondData.step1?.valorNominal || "",
    valorComercial: bondData.step1?.valorComercial || "",
    numAnios: bondData.step1?.numAnios || "5",
    fechaEmision: bondData.step1?.fechaEmision || new Date().toISOString().split("T")[0],
    frecuenciaCupon: bondData.step1?.frecuenciaCupon || "semestral",
    baseDias: bondData.step1?.baseDias || "360",
  })

  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    setErrors({ ...errors, [field]: false })
    saveData({ ...formData, [field]: value }, 1)
  }

  const validateField = (field: string) => {
    const requiredFields = ["nombreInterno", "valorNominal", "valorComercial"]
    if (requiredFields.includes(field) && !formData[field as keyof typeof formData]) {
      setErrors({ ...errors, [field]: true })
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Datos Generales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Nombre interno</label>
          <input
            type="text"
            value={formData.nombreInterno}
            onChange={(e) => handleChange("nombreInterno", e.target.value)}
            onBlur={() => validateField("nombreInterno")}
            className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
              errors.nombreInterno ? "border-red-500" : "border-[#2A2A2A]"
            }`}
            placeholder="Ej. Bono Corporativo Alpha"
          />
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">
            Código ISIN <span className="text-gray-500">(opcional)</span>
          </label>
          <input
            type="text"
            value={formData.codigoISIN}
            onChange={(e) => handleChange("codigoISIN", e.target.value)}
            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
            placeholder="Ej. US0378331005"
          />
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Valor nominal</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="number"
              value={formData.valorNominal}
              onChange={(e) => handleChange("valorNominal", e.target.value)}
              onBlur={() => validateField("valorNominal")}
              className={`w-full bg-transparent text-white border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                errors.valorNominal ? "border-red-500" : "border-[#2A2A2A]"
              }`}
              placeholder="1,000,000.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Valor comercial inicial</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="number"
              value={formData.valorComercial}
              onChange={(e) => handleChange("valorComercial", e.target.value)}
              onBlur={() => validateField("valorComercial")}
              className={`w-full bg-transparent text-white border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                errors.valorComercial ? "border-red-500" : "border-[#2A2A2A]"
              }`}
              placeholder="1,000,000.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Nº de años</label>
          <div className="flex">
            <button
              type="button"
              onClick={() => {
                const newValue = Math.max(1, Number.parseInt(formData.numAnios) - 1).toString()
                handleChange("numAnios", newValue)
              }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-l-lg px-4 flex items-center justify-center hover:bg-[#252525] transition"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              value={formData.numAnios}
              onChange={(e) => handleChange("numAnios", e.target.value)}
              className="w-full bg-transparent text-white border-y border-[#2A2A2A] px-4 py-3 focus:outline-none focus:border-[#39FF14] transition text-center"
              min="1"
            />
            <button
              type="button"
              onClick={() => {
                const newValue = (Number.parseInt(formData.numAnios) + 1).toString()
                handleChange("numAnios", newValue)
              }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-r-lg px-4 flex items-center justify-center hover:bg-[#252525] transition"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Fecha de emisión</label>
          <div className="relative">
            <input
              type="date"
              value={formData.fechaEmision}
              onChange={(e) => handleChange("fechaEmision", e.target.value)}
              className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
            />
            <Calendar
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Frecuencia cupón</label>
          <div className="relative">
            <select
              value={formData.frecuenciaCupon}
              onChange={(e) => handleChange("frecuenciaCupon", e.target.value)}
              className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition appearance-none"
            >
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="cuatrimestral">Cuatrimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Base días-año</label>
          <div className="flex gap-4 mt-2">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name="baseDias"
                value="360"
                checked={formData.baseDias === "360"}
                onChange={(e) => handleChange("baseDias", e.target.value)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border border-[#2A2A2A] rounded-full mr-2 peer-checked:border-[#39FF14] peer-checked:bg-[#39FF14] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-black peer-checked:opacity-100 opacity-0" />
              </div>
              <span>360 días</span>
            </label>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                name="baseDias"
                value="365"
                checked={formData.baseDias === "365"}
                onChange={(e) => handleChange("baseDias", e.target.value)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border border-[#2A2A2A] rounded-full mr-2 peer-checked:border-[#39FF14] peer-checked:bg-[#39FF14] flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-black peer-checked:opacity-100 opacity-0" />
              </div>
              <span>365 días</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 2 Component
function Step2({ bondData, saveData }: { bondData: BondData; saveData: (data: any, step: number) => void }) {
  const [formData, setFormData] = useState({
    tipoTasa: bondData.step2?.tipoTasa || "efectiva",
    periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || "semestral",
    tasaAnual: bondData.step2?.tasaAnual || "",
    indexadoInflacion: bondData.step2?.indexadoInflacion || false,
    inflacionAnual: bondData.step2?.inflacionAnual || "",
    primaVencimiento: bondData.step2?.primaVencimiento || "",
    impuestoRenta: bondData.step2?.impuestoRenta || "30",
  })

  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const handleChange = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value })
    setErrors({ ...errors, [field]: false })
    saveData({ ...formData, [field]: value }, 2)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Condiciones Financieras</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Tipo de tasa</label>
          <div className="relative">
            <select
              value={formData.tipoTasa}
              onChange={(e) => handleChange("tipoTasa", e.target.value)}
              className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition appearance-none"
            >
              <option value="efectiva">Efectiva</option>
              <option value="nominal">Nominal</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
          {formData.tipoTasa === "nominal" && (
            <div className="mt-2 text-xs text-gray-400 flex items-center">
              <Info className="mr-1" size={12} />
              Fórmula de conversión: TEA = (1 + TNA/m)^m - 1
            </div>
          )}
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Periodicidad de capitalización</label>
          <div className="relative">
            <select
              value={formData.periodicidadCapitalizacion}
              onChange={(e) => handleChange("periodicidadCapitalizacion", e.target.value)}
              className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition appearance-none"
            >
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral</option>
              <option value="trimestral">Trimestral</option>
              <option value="cuatrimestral">Cuatrimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Tasa anual (%)</label>
          <div className="relative">
            <input
              type="number"
              value={formData.tasaAnual}
              onChange={(e) => handleChange("tasaAnual", e.target.value)}
              className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                errors.tasaAnual ? "border-red-500" : "border-[#2A2A2A]"
              }`}
              placeholder="5.50"
              step="0.01"
            />
            <Percent
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Indexado a Inflación</label>
          <div className="flex items-center mt-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.indexadoInflacion}
                onChange={(e) => handleChange("indexadoInflacion", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#888] after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#39FF1422] peer-checked:after:bg-[#39FF14]" />
            </label>
          </div>
        </div>

        {formData.indexadoInflacion && (
          <div>
            <label className="block text-[#AAAAAA] text-sm mb-2">Inflación anual esperada (%)</label>
            <div className="relative">
              <input
                type="number"
                value={formData.inflacionAnual}
                onChange={(e) => handleChange("inflacionAnual", e.target.value)}
                className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition"
                placeholder="3.20"
                step="0.01"
              />
              <Percent
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
                size={16}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Prima al vencimiento (%)</label>
          <div className="relative">
            <input
              type="number"
              value={formData.primaVencimiento}
              onChange={(e) => handleChange("primaVencimiento", e.target.value)}
              className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                errors.primaVencimiento ? "border-red-500" : "border-[#2A2A2A]"
              }`}
              placeholder="2.00"
              step="0.01"
            />
            <Percent
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#AAAAAA] text-sm mb-2">Impuesto a la renta (%)</label>
          <div className="relative">
            <input
              type="number"
              value={formData.impuestoRenta}
              onChange={(e) => handleChange("impuestoRenta", e.target.value)}
              className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] transition ${
                errors.impuestoRenta ? "border-red-500" : "border-[#2A2A2A]"
              }`}
              placeholder="30.00"
              step="0.01"
            />
            <Percent
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 3 Component
function Step3({ bondData, saveData }: { bondData: BondData; saveData: (data: any, step: number) => void }) {
  const [formData, setFormData] = useState({
    estructuracionEmisor: bondData.step3?.estructuracionEmisor || "1.00",
    colocacionEmisor: bondData.step3?.colocacionEmisor || "0.25",
    flotacionEmisor: bondData.step3?.flotacionEmisor || "0.225",
    cavaliEmisor: bondData.step3?.cavaliEmisor || "0.25",
  })

  const valorComercial = Number.parseFloat(bondData.step1?.valorComercial || "0")

  const calculateCosts = () => {
    const estructuracionEmisorVal = Number.parseFloat(formData.estructuracionEmisor) || 0
    const colocacionEmisorVal = Number.parseFloat(formData.colocacionEmisor) || 0
    const flotacionEmisorVal = Number.parseFloat(formData.flotacionEmisor) || 0
    const cavaliEmisorVal = Number.parseFloat(formData.cavaliEmisor) || 0

    const flotacionBonistaVal = Math.max(0, 0.45 - flotacionEmisorVal)
    const cavaliBonistaVal = Math.max(0, 0.5 - cavaliEmisorVal)

    const emisorCostAbs =
      ((estructuracionEmisorVal + colocacionEmisorVal + flotacionEmisorVal + cavaliEmisorVal) / 100) * valorComercial

    const bonistaCostAbs = ((flotacionBonistaVal + cavaliBonistaVal) / 100) * valorComercial

    return {
      emisorTotalAbs: emisorCostAbs,
      bonistaTotalAbs: bonistaCostAbs,
      totalCostsAbs: emisorCostAbs + bonistaCostAbs,
      flotacionBonistaVal,
      cavaliBonistaVal,
    }
  }

  const costs = calculateCosts()

  const handleChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    const newCosts = calculateCosts()
    saveData(
      {
        ...newFormData,
        emisorTotalAbs: newCosts.emisorTotalAbs.toString(),
        bonistaTotalAbs: newCosts.bonistaTotalAbs.toString(),
        totalCostsAbs: newCosts.totalCostsAbs.toString(),
      },
      3,
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Costes Iniciales</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full mb-4 min-w-[700px]">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-[#AAAAAA]">
                  <th className="text-left py-3 px-3 font-medium text-sm">Concepto</th>
                  <th className="text-center py-3 px-3 font-medium text-sm">% Total (Mercado)</th>
                  <th className="text-center py-3 px-3 font-medium text-sm">% Emisor (Asumido)</th>
                  <th className="text-center py-3 px-3 font-medium text-sm">% Bonista (Calculado)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#2A2A2A]">
                  <td className="py-4 px-3">Estructuración</td>
                  <td className="py-2 px-3 text-center text-white">1.00%</td>
                  <td className="py-2 px-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.estructuracionEmisor}
                        onChange={(e) => handleChange("estructuracionEmisor", e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                        step="0.01"
                        min="0"
                        max="1"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                        %
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-gray-500">0.00%</td>
                </tr>
                <tr className="border-b border-[#2A2A2A]">
                  <td className="py-4 px-3">Colocación</td>
                  <td className="py-2 px-3 text-center text-white">0.25%</td>
                  <td className="py-2 px-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.colocacionEmisor}
                        onChange={(e) => handleChange("colocacionEmisor", e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                        step="0.01"
                        min="0"
                        max="0.25"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                        %
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-gray-500">0.00%</td>
                </tr>
                <tr className="border-b border-[#2A2A2A]">
                  <td className="py-4 px-3">Flotación</td>
                  <td className="py-2 px-3 text-center text-white">0.45%</td>
                  <td className="py-2 px-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.flotacionEmisor}
                        onChange={(e) => handleChange("flotacionEmisor", e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                        step="0.001"
                        min="0"
                        max="0.45"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                        %
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-white">{costs.flotacionBonistaVal.toFixed(3)}%</td>
                </tr>
                <tr>
                  <td className="py-4 px-3">CAVALI</td>
                  <td className="py-2 px-3 text-center text-white">0.50%</td>
                  <td className="py-2 px-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.cavaliEmisor}
                        onChange={(e) => handleChange("cavaliEmisor", e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                        step="0.01"
                        min="0"
                        max="0.5"
                      />
                      <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                        %
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-white">{costs.cavaliBonistaVal.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#1E1E1E] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen de Costes</h3>
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">Costes Emisor</p>
                <p className="text-[#39FF14] text-2xl font-semibold">{formatCurrency(costs.emisorTotalAbs)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Costes Bonista</p>
                <p className="text-[#39FF14] text-2xl font-semibold">{formatCurrency(costs.bonistaTotalAbs)}</p>
              </div>
              <div className="pt-4 border-t border-[#2A2A2A]">
                <p className="text-gray-400 text-sm mb-1">Total Costes</p>
                <p className="text-[#39FF14] text-2xl font-semibold">{formatCurrency(costs.totalCostsAbs)}</p>
              </div>
              <div className="bg-[#252525] rounded-lg p-4">
                <div className="flex items-center text-sm">
                  <Info className="text-gray-400 mr-2" size={16} />
                  <p>
                    Los costes se calculan sobre el <strong className="text-white">Valor Comercial</strong> del bono:{" "}
                    <span className="text-white">{formatCurrency(valorComercial)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4 Component
function Step4({
  bondData,
  flowsCalculated,
  setFlowsCalculated,
  confirmationChecked,
  setConfirmationChecked,
  activeTab,
  setActiveTab,
}: {
  bondData: BondData
  flowsCalculated: boolean
  setFlowsCalculated: (value: boolean) => void
  confirmationChecked: boolean
  setConfirmationChecked: (value: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    datos: true,
    condiciones: false,
    costes: false,
  })

  const handleCalculateFlows = () => {
    setIsCalculating(true)
    setTimeout(() => {
      setFlowsCalculated(true)
      setIsCalculating(false)
    }, 1500)
  }

  const toggleSection = (section: string) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] })
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? Number.parseFloat(amount) : amount
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num || 0)
  }

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
                  <p className="font-medium">{bondData.step1?.nombreInterno || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Código ISIN</p>
                  <p className="font-medium">{bondData.step1?.codigoISIN || "N/A"}</p>
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
  )
}
