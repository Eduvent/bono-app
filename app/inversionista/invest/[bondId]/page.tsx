"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  Calculator,
  Check,
  CheckCircle,
  Info,
  Bell,
  UserCircle,
  ArrowRight,
  Loader2,
} from "lucide-react"

interface BondDetails {
  id: string
  name: string
  isinCode: string
  issuer: string
  currency: string
  nominalValue: number
  commercialPrice: number
  issueDate: string
  maturityDate: string
  couponRate: number
  paymentFrequency: string
  rateType: string
  inflationIndexed: boolean
  inflationRate: number
  maturityPremium: number
}

interface InvestmentCosts {
  flotation: number
  cavali: number
  total: number
}

interface FlowProjection {
  period: number
  date: string
  inflationAnnual: number
  inflationSemestral: number
  gracePeriod: boolean
  indexedBond: number
  coupon: number
  amortization: number
  premium: number
  investorFlow: number
  actualizedFlow: number
  flowTimePlazo: number
  convexityFactor: number
}

interface KPIs {
  estimatedTREA: number
  duration: number
  convexity: number
  estimatedVAN: number
}

export default function InvestBondWizard() {
  const router = useRouter()
  const params = useParams()
  const bondId = params.bondId as string

  const [currentStep, setCurrentStep] = useState(1)
  const [inversionistaData, setInversionistaData] = useState<any>(null)
  const [flowsCalculated, setFlowsCalculated] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Sample bond data - in real app, this would be fetched based on bondId
  const bondDetails: BondDetails = {
    id: bondId,
    name: "Bono Corporativo XYZ",
    isinCode: "PE123456789",
    issuer: "Corporación Financiera XYZ",
    currency: "PEN (S/)",
    nominalValue: 1000.0,
    commercialPrice: 1050.0,
    issueDate: "15/05/2023",
    maturityDate: "15/05/2028",
    couponRate: 7.25,
    paymentFrequency: "Semestral",
    rateType: "Efectiva",
    inflationIndexed: true,
    inflationRate: 3.2,
    maturityPremium: 1.5,
  }

  const investmentCosts: InvestmentCosts = {
    flotation: 7.88,
    cavali: 2.1,
    total: 9.98,
  }

  const totalDisbursement = bondDetails.commercialPrice + investmentCosts.total

  const kpis: KPIs = {
    estimatedTREA: 8.45,
    duration: 4.23,
    convexity: 21.45,
    estimatedVAN: 1124.67,
  }

  const flowProjections: FlowProjection[] = [
    {
      period: 0,
      date: "15/05/2023",
      inflationAnnual: 0,
      inflationSemestral: 0,
      gracePeriod: false,
      indexedBond: 0,
      coupon: 0,
      amortization: 0,
      premium: 0,
      investorFlow: -1059.98,
      actualizedFlow: -1059.98,
      flowTimePlazo: 0,
      convexityFactor: 0,
    },
    {
      period: 1,
      date: "15/11/2023",
      inflationAnnual: 3.2,
      inflationSemestral: 1.58,
      gracePeriod: false,
      indexedBond: 1015.8,
      coupon: 36.82,
      amortization: 0,
      premium: 0,
      investorFlow: 36.82,
      actualizedFlow: 35.47,
      flowTimePlazo: 17.74,
      convexityFactor: 8.87,
    },
    {
      period: 2,
      date: "15/05/2024",
      inflationAnnual: 3.2,
      inflationSemestral: 1.58,
      gracePeriod: false,
      indexedBond: 1031.86,
      coupon: 37.41,
      amortization: 0,
      premium: 0,
      investorFlow: 37.41,
      actualizedFlow: 34.75,
      flowTimePlazo: 34.75,
      convexityFactor: 34.75,
    },
    {
      period: 3,
      date: "15/11/2024",
      inflationAnnual: 3.2,
      inflationSemestral: 1.58,
      gracePeriod: false,
      indexedBond: 1048.17,
      coupon: 38.0,
      amortization: 0,
      premium: 0,
      investorFlow: 38.0,
      actualizedFlow: 34.05,
      flowTimePlazo: 51.08,
      convexityFactor: 76.61,
    },
    {
      period: 10,
      date: "15/05/2028",
      inflationAnnual: 3.2,
      inflationSemestral: 1.58,
      gracePeriod: false,
      indexedBond: 1173.85,
      coupon: 42.55,
      amortization: 1173.85,
      premium: 17.61,
      investorFlow: 1234.01,
      actualizedFlow: 955.38,
      flowTimePlazo: 4776.9,
      convexityFactor: 23884.5,
    },
  ]

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "inversionista") {
      router.push("/auth/login")
      return
    }

    const profile = localStorage.getItem("inversionistaProfile")
    if (profile) {
      setInversionistaData(JSON.parse(profile))
    }
  }, [router])

  const handleCalculateFlows = () => {
    setIsCalculating(true)

    setTimeout(() => {
      setFlowsCalculated(true)
      setIsCalculating(false)

      // Scroll to flows section
      const flowsSection = document.getElementById("cash-flow-projection")
      if (flowsSection) {
        flowsSection.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 1500)
  }

  const handleContinueToConfirmation = () => {
    setCurrentStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleConfirmPurchase = () => {
    setIsProcessing(true)

    setTimeout(() => {
      setShowSuccessToast(true)

      setTimeout(() => {
        setShowSuccessToast(false)

        setTimeout(() => {
          router.push("/inversionista/dashboard")
        }, 500)
      }, 5000)
    }, 2000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount)
  }

  if (!inversionistaData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
          <p className="text-white mt-4">Cargando información de inversión...</p>
        </div>
      </div>
    )
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
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition">
              <Bell size={20} />
            </button>
            <button className="text-gray-400 hover:text-white transition flex items-center">
              <UserCircle size={20} className="mr-1" />
              Usuario
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-8">
        <div className="bg-[#151515] rounded-xl w-full max-w-[1200px] mx-auto overflow-hidden">
          {/* Wizard Header */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={() => (currentStep === 1 ? router.push("/inversionista/dashboard") : setCurrentStep(1))}
              className="text-gray-400 hover:text-white transition flex items-center"
            >
              <ArrowLeft className="mr-2" size={16} />
              {currentStep === 1 ? "Cancelar" : "Volver a Revisión de Flujos"}
            </button>
            <h1 className="text-xl font-bold text-center">
              {currentStep === 1 ? "Revisar y Comprar: " : "Confirmar Compra: "}
              {bondDetails.name}
            </h1>
            <div className="w-24"></div>
          </div>

          {/* Progress Section */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">
                Paso {currentStep} de 2{currentStep === 2 ? ": Confirmar Compra" : ""}
              </div>
            </div>
            <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#39FF14] transition-all duration-500 ${currentStep === 1 ? "w-1/2" : "w-full"}`}
              ></div>
            </div>

            {currentStep === 2 && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#39FF14] flex items-center justify-center text-black font-medium">
                    <Check size={12} />
                  </div>
                  <span className="ml-2 text-white">Revisión</span>
                </div>
                <div className="flex-1 mx-4 border-t border-dashed border-[#39FF14]"></div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#39FF14] flex items-center justify-center text-black font-medium">
                    2
                  </div>
                  <span className="ml-2 text-white">Confirmación</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Bond Review */}
          {currentStep === 1 && (
            <>
              {/* Bond Details Section */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bond Information */}
                  <div className="lg:col-span-2 bg-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Información del Bono</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Nombre del Bono / Código ISIN</span>
                        <span className="font-medium">
                          {bondDetails.name} / {bondDetails.isinCode}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Emisor / Moneda</span>
                        <span className="font-medium">
                          {bondDetails.issuer} / {bondDetails.currency}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Valor Nominal (unidad)</span>
                        <span className="font-medium">{formatCurrency(bondDetails.nominalValue)}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Fecha Emisión / Fecha Vencimiento</span>
                        <span className="font-medium">
                          {bondDetails.issueDate} / {bondDetails.maturityDate}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Tasa Cupón / Frecuencia de Pago</span>
                        <span className="font-medium">
                          {bondDetails.couponRate}% / {bondDetails.paymentFrequency}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Tipo de Tasa / Indexado a Inflación</span>
                        <span className="font-medium">
                          {bondDetails.rateType} /{" "}
                          {bondDetails.inflationIndexed ? `Sí (${bondDetails.inflationRate}%)` : "No"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Prima al Vencimiento</span>
                        <span className="font-medium">{bondDetails.maturityPremium}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Investment Card */}
                  <div className="bg-[#1E1E1E] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Su Inversión</h2>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#AAAAAA]">Precio Comercial Unitario:</span>
                        <span className="font-medium">{formatCurrency(bondDetails.commercialPrice)}</span>
                      </div>

                      <div className="border-t border-[#2A2A2A] pt-4 mt-4">
                        <h3 className="text-sm font-medium mb-3">Costes de Transacción Estimados:</h3>

                        <div className="flex justify-between items-center mb-2 pl-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#AAAAAA] rounded-full mr-2"></div>
                            <span className="text-[#AAAAAA]">Flotación (0.75%)</span>
                          </div>
                          <span>{formatCurrency(investmentCosts.flotation)}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2 pl-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#AAAAAA] rounded-full mr-2"></div>
                            <span className="text-[#AAAAAA]">CAVALI (0.20%)</span>
                          </div>
                          <span>{formatCurrency(investmentCosts.cavali)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm border-t border-[#2A2A2A] pt-3 mt-3">
                          <span className="font-medium">Total Costes Bonista:</span>
                          <span className="font-medium">{formatCurrency(investmentCosts.total)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-lg font-semibold mt-6 pt-3 border-t border-[#2A2A2A]">
                        <span>Desembolso Total Estimado:</span>
                        <span className="text-[#39FF14]">{formatCurrency(totalDisbursement)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCalculateFlows}
                      disabled={isCalculating}
                      className="w-full bg-[#39FF14] text-black font-medium py-3 px-4 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition mt-4 flex items-center justify-center disabled:opacity-50"
                    >
                      {isCalculating ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={16} />
                          Calculando...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2" size={16} />
                          Calcular Mis Flujos y Rendimiento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cash Flow Projection */}
              {flowsCalculated && (
                <div id="cash-flow-projection" className="px-6 pb-6">
                  <h2 className="text-xl font-semibold mb-4">Proyección de Flujos y Rendimiento</h2>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#1E1E1E] rounded-xl p-4">
                      <div className="text-[#AAAAAA] text-sm mb-1">TREA Estimada</div>
                      <div className="text-xl font-bold">{kpis.estimatedTREA}%</div>
                    </div>

                    <div className="bg-[#1E1E1E] rounded-xl p-4">
                      <div className="text-[#AAAAAA] text-sm mb-1">Duración</div>
                      <div className="text-xl font-bold">{kpis.duration} años</div>
                    </div>

                    <div className="bg-[#1E1E1E] rounded-xl p-4">
                      <div className="text-[#AAAAAA] text-sm mb-1">Convexidad</div>
                      <div className="text-xl font-bold">{kpis.convexity}</div>
                    </div>

                    <div className="bg-[#1E1E1E] rounded-xl p-4">
                      <div className="flex items-center text-[#AAAAAA] text-sm mb-1">
                        VAN Estimado
                        <button
                          className="ml-1 text-gray-400 hover:text-white"
                          title="Valor Actual Neto calculado con la tasa de descuento actual del mercado"
                        >
                          <Info size={12} />
                        </button>
                      </div>
                      <div className="text-xl font-bold">{formatCurrency(kpis.estimatedVAN)}</div>
                    </div>
                  </div>

                  {/* Flow Table */}
                  <div className="overflow-x-auto bg-[#151515] border border-[#2A2A2A] rounded-xl">
                    <table className="min-w-[1200px] w-full text-sm">
                      <thead className="bg-[#1A1A1A] text-[#CCCCCC]">
                        <tr>
                          <th className="sticky left-0 bg-[#1A1A1A] z-10 py-3 px-4 text-left">Nº</th>
                          <th className="py-3 px-4 text-left">Fecha</th>
                          <th className="py-3 px-4 text-left">Infl. Anual (%)</th>
                          <th className="py-3 px-4 text-left">Infl. Sem. (%)</th>
                          <th className="py-3 px-4 text-left">Plazo de Gracia</th>
                          <th className="py-3 px-4 text-left">Bono Indexado</th>
                          <th className="py-3 px-4 text-left">Cupón (Interés)</th>
                          <th className="py-3 px-4 text-left">Amort.</th>
                          <th className="py-3 px-4 text-left">Prima</th>
                          <th className="py-3 px-4 text-left">Flujo Bonista</th>
                          <th className="py-3 px-4 text-left">Flujo Act.</th>
                          <th className="py-3 px-4 text-left">FA × Plazo</th>
                          <th className="py-3 px-4 text-left">Factor p/Convexidad</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#CCCCCC]">
                        {flowProjections.map((flow, index) => (
                          <tr
                            key={flow.period}
                            className={`border-t border-[#2A2A2A] ${index % 2 === 1 ? "bg-[#1E1E1E]" : ""}`}
                          >
                            <td
                              className={`sticky left-0 z-10 py-3 px-4 font-medium ${index % 2 === 1 ? "bg-[#1E1E1E]" : "bg-[#151515]"}`}
                            >
                              {flow.period}
                            </td>
                            <td className="py-3 px-4">{flow.date}</td>
                            <td className="py-3 px-4">
                              {flow.inflationAnnual > 0 ? flow.inflationAnnual.toFixed(2) : "-"}
                            </td>
                            <td className="py-3 px-4">
                              {flow.inflationSemestral > 0 ? flow.inflationSemestral.toFixed(2) : "-"}
                            </td>
                            <td className="py-3 px-4">{flow.gracePeriod ? "S" : "-"}</td>
                            <td className="py-3 px-4">{flow.indexedBond > 0 ? flow.indexedBond.toFixed(2) : "-"}</td>
                            <td className="py-3 px-4">{flow.coupon > 0 ? flow.coupon.toFixed(2) : "-"}</td>
                            <td className="py-3 px-4">{flow.amortization > 0 ? flow.amortization.toFixed(2) : "-"}</td>
                            <td className="py-3 px-4">{flow.premium > 0 ? flow.premium.toFixed(2) : "-"}</td>
                            <td className={`py-3 px-4 ${flow.investorFlow < 0 ? "text-red-500" : ""}`}>
                              {flow.investorFlow.toFixed(2)}
                            </td>
                            <td className="py-3 px-4">{flow.actualizedFlow.toFixed(2)}</td>
                            <td className="py-3 px-4">{flow.flowTimePlazo.toFixed(2)}</td>
                            <td className="py-3 px-4">{flow.convexityFactor.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="px-6 pb-6 mt-8 flex flex-col sm:flex-row justify-between">
                <button
                  onClick={() => router.push("/inversionista/dashboard")}
                  className="px-6 py-3 border border-[#2A2A2A] bg-[#2A2A2A] rounded-lg text-white hover:bg-[#1A1A1A] transition mb-4 sm:mb-0"
                >
                  <ArrowLeft className="mr-2 inline" size={16} />
                  Anterior
                </button>

                <button
                  onClick={handleContinueToConfirmation}
                  disabled={!flowsCalculated}
                  className={`px-6 py-3 font-medium rounded-lg transition ${
                    flowsCalculated
                      ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Continuar a Confirmación
                  <ArrowRight className="ml-2 inline" size={16} />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Confirmation */}
          {currentStep === 2 && (
            <>
              <div className="px-6 pb-6">
                <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                  <h2 className="text-xl font-semibold mb-4">Resumen Final de la Compra</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bond Details */}
                    <div>
                      <h3 className="text-lg font-medium mb-3 text-[#39FF14]">Bono Seleccionado</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA]">Nombre:</span>
                          <span className="font-medium">{bondDetails.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA]">Código ISIN:</span>
                          <span className="font-medium">{bondDetails.isinCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA]">Emisor:</span>
                          <span className="font-medium">{bondDetails.issuer}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mt-6 mb-3 text-[#39FF14]">Flujos Clave Proyectados</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA]">Total Cupones a Recibir:</span>
                          <span className="font-medium">S/ 362.87</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA]">Pago Final:</span>
                          <span className="font-medium">S/ 1,234.01</span>
                        </div>
                        <div className="flex flex-col mt-1">
                          <span className="text-xs text-[#AAAAAA]">Desglose del Pago Final:</span>
                          <div className="flex justify-between pl-4 mt-1">
                            <span className="text-xs text-[#AAAAAA]">- Amortización:</span>
                            <span className="text-xs">S/ 1,173.85</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className="text-xs text-[#AAAAAA]">- Último Cupón:</span>
                            <span className="text-xs">S/ 42.55</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className="text-xs text-[#AAAAAA]">- Prima Recibida:</span>
                            <span className="text-xs">S/ 17.61</span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-medium mt-6 mb-3 text-[#39FF14]">Indicadores de Inversión</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#151515] p-3 rounded-lg">
                          <div className="text-[#AAAAAA] text-xs">TREA Estimada</div>
                          <div className="text-lg font-semibold">{kpis.estimatedTREA}%</div>
                        </div>
                        <div className="bg-[#151515] p-3 rounded-lg">
                          <div className="text-[#AAAAAA] text-xs">Duración</div>
                          <div className="text-lg font-semibold">{kpis.duration} años</div>
                        </div>
                        <div className="bg-[#151515] p-3 rounded-lg">
                          <div className="text-[#AAAAAA] text-xs">Convexidad</div>
                          <div className="text-lg font-semibold">{kpis.convexity}</div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div>
                      <div className="bg-[#151515] p-6 rounded-xl border border-[#2A2A2A]">
                        <h3 className="text-lg font-medium mb-4 text-center">Desembolso Total</h3>
                        <div className="text-center mb-6">
                          <span className="text-3xl font-bold text-[#39FF14]">{formatCurrency(totalDisbursement)}</span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Valor Comercial del Bono:</span>
                            <span className="font-medium">{formatCurrency(bondDetails.commercialPrice)}</span>
                          </div>
                          <div className="pt-3 border-t border-[#2A2A2A]">
                            <div className="flex justify-between text-[#AAAAAA]">
                              <span>Flotación (0.75%):</span>
                              <span>{formatCurrency(investmentCosts.flotation)}</span>
                            </div>
                            <div className="flex justify-between text-[#AAAAAA] mt-1">
                              <span>CAVALI (0.20%):</span>
                              <span>{formatCurrency(investmentCosts.cavali)}</span>
                            </div>
                            <div className="flex justify-between mt-3 pt-3 border-t border-[#2A2A2A]">
                              <span>Total Costes Bonista:</span>
                              <span className="font-medium">{formatCurrency(investmentCosts.total)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                          <div className="flex items-start">
                            <Info className="text-[#39FF14] mt-1 mr-2 flex-shrink-0" size={16} />
                            <p className="text-sm text-[#AAAAAA]">
                              Al confirmar esta compra, el monto total será debitado de su cuenta y el bono será
                              registrado en su portafolio de inversiones.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              id="confirm-checkbox"
                              checked={confirmationChecked}
                              onChange={(e) => setConfirmationChecked(e.target.checked)}
                              className="mt-1 mr-2 h-4 w-4 rounded border-gray-300 text-[#39FF14] focus:ring-[#39FF14] bg-gray-700"
                            />
                            <label htmlFor="confirm-checkbox" className="text-sm">
                              He revisado los detalles y confirmo mi intención de comprar este bono.
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="px-6 pb-6 mt-4 flex flex-col sm:flex-row justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-[#2A2A2A] bg-[#2A2A2A] rounded-lg text-white hover:bg-[#1A1A1A] transition mb-4 sm:mb-0 flex items-center justify-center"
                >
                  <ArrowLeft className="mr-2" size={16} />
                  Anterior
                </button>

                <button
                  onClick={handleConfirmPurchase}
                  disabled={!confirmationChecked || isProcessing}
                  className={`px-6 py-3 font-medium rounded-lg transition flex items-center justify-center ${
                    confirmationChecked && !isProcessing
                      ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar Compra"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-[#39FF14] text-black px-6 py-4 rounded-lg shadow-[0_0_8px_rgba(57,255,20,0.47)] flex items-center transform transition-all duration-500">
          <CheckCircle className="text-xl mr-3" size={20} />
          <div>
            <p className="font-medium">¡Compra realizada con éxito!</p>
            <p className="text-sm">El bono ha sido añadido a 'Mis Bonos'</p>
          </div>
        </div>
      )}
    </div>
  )
}
