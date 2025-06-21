"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from '@/lib/hooks/useAuth'
import { useBondDetails } from '@/lib/hooks/useBondDetails'
import { ArrowLeft, Download } from "lucide-react"
import Chart from "chart.js/auto"
import { formatCurrency, formatDate, formatPercent } from "@/utils/format"

export default function BondDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bondId = params.bondId as string
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })
  
  const [activeTab, setActiveTab] = useState<"summary" | "flows" | "analytics">("summary")
  const [loading, setLoading] = useState(true)

  // Referencias para gráficos
  const costChartRef = useRef<HTMLCanvasElement>(null)
  const flowChartRef = useRef<HTMLCanvasElement>(null)
  const costChartInstance = useRef<Chart | null>(null)
  const flowChartInstance = useRef<Chart | null>(null)

  // Hook para datos reales del bono
  const { bondDetails, loading: bondLoading, error: bondError } = useBondDetails(bondId)

  // Funciones de formateo seguro para manejar valores nulos
  const safeFormatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00'
    return formatCurrency(value)
  }

  const safeFormatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '0.000%'
    return formatPercent(value)
  }

  const safeFormatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'N/A') return 'N/A'
    return formatDate(dateString)
  }

  const safeFormatNumber = (value: number | null | undefined, decimals: number = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00'
    return value.toFixed(decimals)
  }

  // 📊 INICIALIZAR GRÁFICOS
  useEffect(() => {
    if (!bondDetails) return
    
    // Limpiar gráficos existentes
    if (costChartInstance.current) {
      costChartInstance.current.destroy()
      costChartInstance.current = null
    }
    if (flowChartInstance.current) {
      flowChartInstance.current.destroy()
      flowChartInstance.current = null
    }

    // Gráfico de costes
    if (activeTab === "summary" && costChartRef.current && bondDetails.costs) {
      const ctx = costChartRef.current.getContext("2d")
      if (ctx) {
        const totalCosts = bondDetails.costs.placement + bondDetails.costs.flotation + bondDetails.costs.cavali
        const placementPercent = totalCosts > 0 ? (bondDetails.costs.placement / totalCosts) * 100 : 0
        const flotationPercent = totalCosts > 0 ? (bondDetails.costs.flotation / totalCosts) * 100 : 0
        const cavaliPercent = totalCosts > 0 ? (bondDetails.costs.cavali / totalCosts) * 100 : 0

        costChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: [
              `Colocación (${placementPercent.toFixed(2)}%)`,
              `Flotación (${flotationPercent.toFixed(2)}%)`,
              `Cavali (${cavaliPercent.toFixed(2)}%)`,
            ],
            datasets: [
              {
                data: [placementPercent, flotationPercent, cavaliPercent],
                backgroundColor: ["#39FF14", "#00B3E6", "#9966FF"],
                borderWidth: 1,
                borderColor: "#151515",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "#CCCCCC",
                  font: { family: "Inter", size: 11 },
                  padding: 15,
                },
              },
            },
            cutout: "65%",
          },
        })
      }
    }

    // Gráfico de flujos
    if (activeTab === "analytics" && flowChartRef.current && bondDetails.flows.length > 0) {
      const ctx = flowChartRef.current.getContext("2d")
      if (ctx) {
        const periods = bondDetails.flows.map((flow) => flow.period.toString())
        const investorFlows = bondDetails.flows.map((flow) => flow.investorFlow || 0)
        const indexedBonds = bondDetails.flows.map((flow) => flow.indexedBond || 0)

        flowChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: periods,
            datasets: [
              {
                label: "Flujo Bonista",
                type: "bar",
                data: investorFlows,
                backgroundColor: "#39FF14",
                order: 1,
              },
              {
                label: "Bono Indexado",
                type: "line",
                data: indexedBonds,
                borderColor: "#FF33FF",
                borderWidth: 2,
                pointBackgroundColor: "#FF33FF",
                fill: false,
                tension: 0.1,
                yAxisID: "y1",
                order: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                title: { display: true, text: "Periodo", color: "#CCCCCC" },
                grid: { color: "rgba(42, 42, 42, 0.5)" },
                ticks: { color: "#CCCCCC" },
              },
              y: {
                position: "left",
                title: { display: true, text: "Flujo Bonista (USD)", color: "#CCCCCC" },
                grid: { color: "rgba(42, 42, 42, 0.5)" },
                ticks: { color: "#CCCCCC" },
              },
              y1: {
                position: "right",
                title: { display: true, text: "Bono Indexado (USD)", color: "#CCCCCC" },
                grid: { drawOnChartArea: false },
                ticks: { color: "#CCCCCC" },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: { color: "#CCCCCC", font: { family: "Inter" } },
              },
            },
          },
        })
      }
    }
  }, [bondDetails, activeTab])

  // Cleanup gráficos al desmontar
  useEffect(() => {
    return () => {
      if (costChartInstance.current) {
        costChartInstance.current.destroy()
      }
      if (flowChartInstance.current) {
        flowChartInstance.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (!bondLoading) {
      setLoading(false)
    }
  }, [bondLoading])

  // Loading state
  if (loading || bondLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
          <p className="text-white mt-4">Cargando detalles del bono...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (bondError || !bondDetails) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
            <ArrowLeft className="text-red-500" size={64} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error al cargar el bono</h2>
          <p className="text-gray-400 mb-6">{bondError || 'No se pudo cargar la información del bono'}</p>
          <button
            onClick={() => router.push("/inversionista/dashboard")}
            className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="bg-[#151515] py-4 border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-white text-xl font-semibold">BonoApp</span>
          </div>
          <button
            onClick={() => router.push("/inversionista/dashboard")}
            className="flex items-center text-gray-400 hover:text-[#39FF14] transition-colors cursor-pointer"
          >
            <ArrowLeft className="mr-2" size={16} />
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <h1 className="text-2xl font-bold mr-3">Detalle de Mi Bono: {bondDetails.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                bondDetails.status === "ACTIVE" ? "bg-[#39FF14] text-black" : "bg-red-500 text-white"
              }`}
            >
              {bondDetails.status === "ACTIVE" ? "Activo" : "Vencido"}
            </span>
          </div>
        </div>

        <div className="mb-6 border-b border-[#2A2A2A]">
          <div className="flex">
            <button
              onClick={() => setActiveTab("summary")}
              className={`tab-button-detail ${activeTab === "summary" ? "active-tab-detail" : ""}`}
            >
              Resumen de Inversión
            </button>
            <button
              onClick={() => setActiveTab("flows")}
              className={`tab-button-detail ${activeTab === "flows" ? "active-tab-detail" : ""}`}
            >
              Mis Flujos
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`tab-button-detail ${activeTab === "analytics" ? "active-tab-detail" : ""}`}
            >
              Análisis de Mi Inversión
            </button>
          </div>
        </div>

        {/* Pestaña Resumen */}
        {activeTab === "summary" && (
          <div>
            <div className="bg-[#151515] rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Datos Contractuales del Bono</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Nombre:</span>
                    <span className="font-medium">{bondDetails.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Emisor:</span>
                    <span className="font-medium">{bondDetails.issuer}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Moneda:</span>
                    <span className="font-medium">{bondDetails.currency}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Valor Nominal:</span>
                    <span className="font-medium">{safeFormatCurrency(bondDetails.nominalValue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Fecha Emisión:</span>
                    <span className="font-medium">{safeFormatDate(bondDetails.issueDate)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Fecha Vencimiento:</span>
                    <span className="font-medium">{safeFormatDate(bondDetails.maturityDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Tasa de Interés:</span>
                    <span className="font-medium">
                      {safeFormatNumber(bondDetails.interestRate, 3)}% anual ({bondDetails.interestRateType})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Frecuencia de Pago:</span>
                    <span className="font-medium">{bondDetails.paymentFrequency}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Indexado a Inflación:</span>
                    <span className="font-medium">
                      {bondDetails.inflationIndexed ? `Sí (Anual ${safeFormatNumber(bondDetails.inflationRate, 2)}%)` : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Prima al Vencimiento:</span>
                    <span className="font-medium">USD {safeFormatNumber(bondDetails.maturityPremium, 2)} (Recibida)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1E1E1E] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Mi Inversión en este Bono</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna 1: Detalles de Compra y Costes */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-[#39FF14] mb-3">Detalles de Compra</h3>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Fecha de Compra:</span>
                    <span className="font-medium">{safeFormatDate(bondDetails.purchaseDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Desembolso Inicial:</span>
                    <span className="font-medium text-red-400">- {safeFormatCurrency(bondDetails.initialDisbursement)}</span>
                  </div>

                  <div className="pt-3">
                    <h4 className="text-md font-medium mb-2 text-gray-300">Desglose de Mis Costes:</h4>
                    <div className="h-[180px] w-full max-w-xs mx-auto relative">
                      <canvas ref={costChartRef}></canvas>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-3 pt-2 border-t border-[#2A2A2A]">
                      <span className="text-gray-400 font-medium">Total Costes Pagados:</span>
                      <span className="font-semibold text-[#39FF14]">
                        {safeFormatCurrency(bondDetails.costs.placement + bondDetails.costs.flotation + bondDetails.costs.cavali)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Columna 2: Rendimiento y Estado */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-[#39FF14] mb-3">Rendimiento y Estado</h3>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">TREA (al comprar):</span>
                    <span className="font-medium text-[#39FF14]">{safeFormatPercent(bondDetails.trea)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Valor de Mercado Hoy:</span>
                    <span className="font-medium">{safeFormatCurrency(bondDetails.marketValueToday)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Ganancia No Realizada:</span>
                    <span className="font-medium text-[#39FF14]">
                      + {safeFormatCurrency(bondDetails.unrealizedGain)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Cupones Cobrados:</span>
                    <span className="font-medium">{safeFormatCurrency(bondDetails.collectedCoupons)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Próximo Cupón:</span>
                    <span className="font-medium">
                      {safeFormatDate(bondDetails.nextCouponDate)} • {safeFormatCurrency(bondDetails.nextCouponAmount)}
                    </span>
                  </div>
                </div>

                {/* Columna 3: Indicadores de Riesgo */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-[#39FF14] mb-3">Indicadores de Riesgo</h3>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Duración</div>
                    <div className="text-lg font-semibold">{safeFormatNumber(bondDetails.duration)} años</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Convexidad</div>
                    <div className="text-lg font-semibold">{safeFormatNumber(bondDetails.convexity)}</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Duración Modificada</div>
                    <div className="text-lg font-semibold">{safeFormatNumber(bondDetails.modifiedDuration)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña Mis Flujos */}
        {activeTab === "flows" && (
          <div className="bg-[#151515] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Mis Flujos de Caja Proyectados</h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center text-sm">
                  <span className="mr-2">📄</span> Exportar CSV
                </button>
                <button className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center text-sm">
                  <span className="mr-2">📊</span> Exportar XLSX
                </button>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#151515] to-transparent pointer-events-none z-10"></div>
              <table className="w-full border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-[#1A1A1A] text-gray-400 text-xs">
                    <th className="py-2 px-3 text-center font-medium sticky left-0 bg-[#1A1A1A] z-10">Nº</th>
                    <th className="py-2 px-3 text-left font-medium">Fecha</th>
                    <th className="py-2 px-3 text-right font-medium">Infl. Anual</th>
                    <th className="py-2 px-3 text-right font-medium">Infl. Sem.</th>
                    <th className="py-2 px-3 text-center font-medium">P. Gracia</th>
                    <th className="py-2 px-3 text-right font-medium">Bono Indexado</th>
                    <th className="py-2 px-3 text-right font-medium">Cupón (Int.)</th>
                    <th className="py-2 px-3 text-right font-medium">Amort.</th>
                    <th className="py-2 px-3 text-right font-medium">Prima Rec.</th>
                    <th className="py-2 px-3 text-right font-medium">Flujo Bonista</th>
                    <th className="py-2 px-3 text-right font-medium">Flujo Act.</th>
                    <th className="py-2 px-3 text-right font-medium">FA × Plazo</th>
                    <th className="py-2 px-3 text-right font-medium">Factor p/Conv.</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {bondDetails.flows.map((flow) => (
                    <tr key={flow.period} className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                      <td className="py-2 px-3 text-center sticky left-0 bg-[#151515] hover:bg-[#1E1E1E] z-10">
                        {flow.period}
                      </td>
                      <td className="py-2 px-3 text-left">{safeFormatDate(flow.date)}</td>
                      <td className="py-2 px-3 text-right">
                        {flow.annualInflation !== null ? `${safeFormatNumber(flow.annualInflation, 2)}%` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.semesterInflation !== null ? `${safeFormatNumber(flow.semesterInflation, 3)}%` : "-"}
                      </td>
                      <td className="py-2 px-3 text-center">{flow.gracePeriod || "-"}</td>
                      <td className="py-2 px-3 text-right">
                        {flow.indexedBond !== null ? safeFormatCurrency(flow.indexedBond) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.coupon && flow.coupon > 0 ? "text-[#39FF14]" : ""}`}>
                        {flow.coupon !== null ? safeFormatCurrency(flow.coupon) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.amortization && flow.amortization > 0 ? "text-[#39FF14]" : ""}`}>
                        {flow.amortization !== null ? safeFormatCurrency(flow.amortization) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.premium && flow.premium > 0 ? "text-[#39FF14]" : ""}`}>
                        {flow.premium !== null ? safeFormatCurrency(flow.premium) : "-"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right ${flow.investorFlow && flow.investorFlow > 0 ? "text-[#39FF14]" : flow.investorFlow && flow.investorFlow < 0 ? "text-red-400" : ""}`}
                      >
                        {flow.investorFlow !== null ? safeFormatCurrency(flow.investorFlow) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.actualizedFlow !== null ? safeFormatCurrency(flow.actualizedFlow) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.faByTerm !== null ? safeFormatCurrency(flow.faByTerm) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.convexityFactor !== null ? safeFormatCurrency(flow.convexityFactor) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pestaña Análisis de Mi Inversión */}
        {activeTab === "analytics" && (
          <div className="bg-[#151515] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Análisis de Mi Inversión</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">VAN de Mi Inversión</p>
                <p className="text-[#39FF14] font-medium text-xl">{safeFormatCurrency(bondDetails.unrealizedGain)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">TREA (TIR)</p>
                <p className="text-[#39FF14] font-medium text-xl">{safeFormatPercent(bondDetails.trea)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Duración Modificada</p>
                <p className="text-[#39FF14] font-medium text-xl">{safeFormatNumber(bondDetails.modifiedDuration)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Ratios Decisión</p>
                <p className="text-[#39FF14] font-medium text-xl">
                  {safeFormatNumber(bondDetails.duration + bondDetails.convexity)}
                </p>
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-2">Nota sobre Indicadores:</h4>
              <p className="text-sm text-gray-400">
                El VAN (Valor Actual Neto) indica la ganancia o pérdida de valor presente de su inversión, usando la
                tasa de descuento del mercado (COK). La TREA (Tasa de Rendimiento Efectivo Anual) o TIR es su
                rentabilidad anualizada. La Duración y Convexidad miden la sensibilidad del valor de su bono a cambios
                en las tasas de interés.
              </p>
            </div>
            <h2 className="text-xl font-semibold mb-6">Gráfico: Mis Flujos de Cupón vs. Evolución del Bono Indexado</h2>
            <div className="h-[400px]">
              <canvas ref={flowChartRef}></canvas>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
