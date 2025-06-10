"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Chart from "chart.js/auto"
import { formatCurrency, formatDate, formatPercent } from "@/utils/format"

interface BondDetailProps {
  params: {
    bondId: string
  }
}

interface BondData {
  id: string
  name: string
  status: "draft" | "active" | "expired"
  issuer: string
  currency: string
  nominalValue: number
  issueDate: string
  maturityDate: string
  interestRateType: string
  interestRate: number
  paymentFrequency: string
  daysPerYear: number
  amortizationMethod: string
  annualDiscountRate: number
  netPriceReceived: number
  totalInitialCosts: number
  duration: number
  convexity: number
  grossTCEA: number
  shieldedTCEA: number
  costs: {
    premium: number
    structuring: number
    placement: number
    other: number
  }
  flows: Array<{
    period: number
    date: string
    annualInflation: number | null
    semesterInflation: number | null
    gracePeriod: string | null
    indexedBond: number | null
    coupon: number | null
    amortization: number | null
    premium: number | null
    shield: number | null
    issuerFlow: number | null
    issuerFlowWithShield: number | null
  }>
}

export default function BondDetailPage({ params }: BondDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"summary" | "flows" | "analytics">("summary")
  const [bondData, setBondData] = useState<BondData | null>(null)
  const [loading, setLoading] = useState(true)

  const costChartRef = useRef<HTMLCanvasElement>(null)
  const flowChartRef = useRef<HTMLCanvasElement>(null)
  const costChartInstance = useRef<Chart | null>(null)
  const flowChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    // In a real app, this would fetch data from an API
    // For now, we'll simulate loading and then set mock data
    const fetchBondData = async () => {
      setLoading(true)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Mock data for the bond
      const mockBondData: BondData = {
        id: params.bondId,
        name: "Bono VAC - Americano",
        status: "active",
        issuer: "Empresa Ejemplo S.A.C.",
        currency: "PEN (Soles)",
        nominalValue: 1000,
        issueDate: "2025-06-01",
        maturityDate: "2030-05-06",
        interestRateType: "Efectiva",
        interestRate: 8.0,
        paymentFrequency: "Semestral",
        daysPerYear: 360,
        amortizationMethod: "Americano (Bullet)",
        annualDiscountRate: 4.5,
        netPriceReceived: 1026.9,
        totalInitialCosts: 23.1,
        duration: 4.45,
        convexity: 22.39,
        grossTCEA: 18.176,
        shieldedTCEA: 15.556,
        costs: {
          premium: 10.0,
          structuring: 10.0,
          placement: 2.5,
          other: 0.6,
        },
        flows: [
          {
            period: 0,
            date: "2025-06-01",
            annualInflation: null,
            semesterInflation: null,
            gracePeriod: null,
            indexedBond: null,
            coupon: null,
            amortization: null,
            premium: null,
            shield: null,
            issuerFlow: 1026.9,
            issuerFlowWithShield: 1026.9,
          },
          {
            period: 1,
            date: "2025-11-28",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1048.81,
            coupon: -41.15,
            amortization: 0,
            premium: 0,
            shield: 12.34,
            issuerFlow: -41.15,
            issuerFlowWithShield: -28.81,
          },
          {
            period: 2,
            date: "2026-05-27",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1100.0,
            coupon: -43.15,
            amortization: 0,
            premium: 0,
            shield: 12.95,
            issuerFlow: -43.15,
            issuerFlowWithShield: -30.2,
          },
          {
            period: 3,
            date: "2026-11-23",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1153.69,
            coupon: -45.26,
            amortization: 0,
            premium: 0,
            shield: 13.58,
            issuerFlow: -45.26,
            issuerFlowWithShield: -31.68,
          },
          {
            period: 4,
            date: "2027-05-22",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1210.0,
            coupon: -47.47,
            amortization: 0,
            premium: 0,
            shield: 14.24,
            issuerFlow: -47.47,
            issuerFlowWithShield: -33.23,
          },
          {
            period: 5,
            date: "2027-11-18",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1269.06,
            coupon: -49.79,
            amortization: 0,
            premium: 0,
            shield: 14.94,
            issuerFlow: -49.79,
            issuerFlowWithShield: -34.85,
          },
          {
            period: 6,
            date: "2028-05-16",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1331.0,
            coupon: -52.22,
            amortization: 0,
            premium: 0,
            shield: 15.67,
            issuerFlow: -52.22,
            issuerFlowWithShield: -36.55,
          },
          {
            period: 7,
            date: "2028-11-12",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1395.96,
            coupon: -54.76,
            amortization: 0,
            premium: 0,
            shield: 16.43,
            issuerFlow: -54.76,
            issuerFlowWithShield: -38.33,
          },
          {
            period: 8,
            date: "2029-05-11",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1464.1,
            coupon: -57.44,
            amortization: 0,
            premium: 0,
            shield: 17.23,
            issuerFlow: -57.44,
            issuerFlowWithShield: -40.21,
          },
          {
            period: 9,
            date: "2029-11-07",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1535.56,
            coupon: -60.24,
            amortization: 0,
            premium: 0,
            shield: 18.07,
            issuerFlow: -60.24,
            issuerFlowWithShield: -42.17,
          },
          {
            period: 10,
            date: "2030-05-06",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1610.51,
            coupon: -63.18,
            amortization: -1610.51,
            premium: -10.0,
            shield: 18.95,
            issuerFlow: -1683.69,
            issuerFlowWithShield: -1664.74,
          },
        ],
      }

      setBondData(mockBondData)
      setLoading(false)
    }

    fetchBondData()
  }, [params.bondId])

  useEffect(() => {
    if (!bondData) return

    // Initialize cost chart when data is available and we're on the summary tab
    if (activeTab === "summary" && costChartRef.current) {
      if (costChartInstance.current) {
        costChartInstance.current.destroy()
      }

      const ctx = costChartRef.current.getContext("2d")
      if (ctx) {
        costChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: [
              `Prima (${bondData.costs.premium.toFixed(2)})`,
              `Estructuración (${bondData.costs.structuring.toFixed(2)})`,
              `Colocación Emisor (${bondData.costs.placement.toFixed(2)})`,
              `Otros Costes (${bondData.costs.other.toFixed(2)})`,
            ],
            datasets: [
              {
                data: [
                  bondData.costs.premium,
                  bondData.costs.structuring,
                  bondData.costs.placement,
                  bondData.costs.other,
                ],
                backgroundColor: ["#39FF14", "#00B3E6", "#9966FF", "#FF6633"],
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
                  font: {
                    family: "Inter",
                    size: 11,
                  },
                  padding: 15,
                },
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.raw.toFixed(2)}`,
                },
              },
            },
            cutout: "65%",
          },
        })
      }
    }

    // Initialize flow chart when data is available and we're on the analytics tab
    if (activeTab === "analytics" && flowChartRef.current) {
      if (flowChartInstance.current) {
        flowChartInstance.current.destroy()
      }

      const ctx = flowChartRef.current.getContext("2d")
      if (ctx) {
        const periods = bondData.flows.map((flow) => flow.period.toString())
        const issuerFlows = bondData.flows.map((flow) => flow.issuerFlowWithShield || 0)
        const indexedBonds = bondData.flows.map((flow) => flow.indexedBond || 0)

        flowChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: periods,
            datasets: [
              {
                label: "Flujo Emisor c/Escudo",
                type: "bar",
                data: issuerFlows,
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
                title: {
                  display: true,
                  text: "Periodo",
                  color: "#CCCCCC",
                },
                grid: {
                  color: "rgba(42, 42, 42, 0.5)",
                },
                ticks: {
                  color: "#CCCCCC",
                },
              },
              y: {
                position: "left",
                title: {
                  display: true,
                  text: "Flujo Emisor (PEN)",
                  color: "#CCCCCC",
                },
                grid: {
                  color: "rgba(42, 42, 42, 0.5)",
                },
                ticks: {
                  color: "#CCCCCC",
                  callback: (value) => value.toLocaleString(),
                },
              },
              y1: {
                position: "right",
                title: {
                  display: true,
                  text: "Bono Indexado (PEN)",
                  color: "#CCCCCC",
                },
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  color: "#CCCCCC",
                  callback: (value) => value.toLocaleString(),
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "#CCCCCC",
                  font: {
                    family: "Inter",
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString()}`,
                },
              },
            },
          },
        })
      }
    }
  }, [bondData, activeTab])

  const handleBackToDashboard = () => {
    router.push("/emisor/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
          <p className="text-white mt-4">Cargando detalles del bono...</p>
        </div>
      </div>
    )
  }

  if (!bondData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl">No se encontró información para este bono.</p>
          <button
            onClick={handleBackToDashboard}
            className="mt-4 px-4 py-2 bg-[#39FF14] text-black rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="bg-black bg-opacity-75 backdrop-blur-md py-4 fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-white text-xl font-semibold">BonoApp</span>
          </div>
          <button
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="mr-1" size={16} />
            Volver al Dashboard
          </button>
        </div>
      </div>

      <main className="container mx-auto px-6 pt-24 pb-8">
        <div id="bond-header" className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <h1 className="text-2xl font-bold mr-3">{bondData.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                bondData.status === "active"
                  ? "bg-[#39FF14] text-black"
                  : bondData.status === "draft"
                    ? "bg-yellow-500 text-black"
                    : "bg-red-500 text-white"
              }`}
            >
              {bondData.status === "active" ? "Activo" : bondData.status === "draft" ? "Borrador" : "Vencido"}
            </span>
          </div>
        </div>

        <div id="bond-tabs" className="mb-6 border-b border-[#2A2A2A]">
          <div className="flex">
            <button
              onClick={() => setActiveTab("summary")}
              className={`tab-button-detail ${activeTab === "summary" ? "active-tab-detail" : ""}`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab("flows")}
              className={`tab-button-detail ${activeTab === "flows" ? "active-tab-detail" : ""}`}
            >
              Flujos
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`tab-button-detail ${activeTab === "analytics" ? "active-tab-detail" : ""}`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Pestaña Resumen */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos Principales */}
            <div id="key-facts" className="bg-[#151515] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Datos Principales del Bono</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Emisor</span>
                  <span className="font-medium">{bondData.issuer}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Moneda</span>
                  <span className="font-medium">{bondData.currency}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Valor Nominal</span>
                  <span className="font-medium">{formatCurrency(bondData.nominalValue)}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fecha de Emisión</span>
                  <span className="font-medium">{formatDate(bondData.issueDate)}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fecha de Vencimiento</span>
                  <span className="font-medium">{formatDate(bondData.maturityDate)}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tipo de Tasa</span>
                  <span className="font-medium">{bondData.interestRateType}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tasa de Interés</span>
                  <span className="font-medium">{bondData.interestRate.toFixed(3)}% anual</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Frecuencia de Pago</span>
                  <span className="font-medium">{bondData.paymentFrequency}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Días por Año</span>
                  <span className="font-medium">{bondData.daysPerYear}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Método de Amortización</span>
                  <span className="font-medium">{bondData.amortizationMethod}</span>
                </div>
                <div className="border-b border-[#2A2A2A]"></div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tasa Anual de Descuento</span>
                  <span className="font-medium">{bondData.annualDiscountRate.toFixed(3)}%</span>
                </div>
              </div>
            </div>

            {/* KPIs y Gráfico de Costes */}
            <div className="space-y-6">
              <div id="kpi-summary-section" className="bg-[#151515] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Indicadores Clave (Emisor)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Precio Neto Recibido Emisor</p>
                    <p className="text-[#39FF14] font-medium text-lg">{formatCurrency(bondData.netPriceReceived)}</p>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Costes Iniciales Totales (Emisor)</p>
                    <p className="text-[#39FF14] font-medium text-lg">{formatCurrency(bondData.totalInitialCosts)}</p>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Duración</p>
                    <p className="text-[#39FF14] font-medium text-lg">{bondData.duration.toFixed(2)} años</p>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Convexidad</p>
                    <p className="text-[#39FF14] font-medium text-lg">{bondData.convexity.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p>
                    <p className="text-[#39FF14] font-medium text-lg">{formatPercent(bondData.grossTCEA)}</p>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">TCEA Emisor (c/Escudo)</p>
                    <p className="text-[#39FF14] font-medium text-lg">{formatPercent(bondData.shieldedTCEA)}</p>
                  </div>
                </div>
              </div>

              {/* GRÁFICO DE COSTES INTEGRADO AQUÍ */}
              <div id="cost-breakdown-chart-container" className="bg-[#151515] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Desglose de Costes Emisor</h2>
                <div className="h-[250px] sm:h-[300px] relative mb-6">
                  <canvas ref={costChartRef}></canvas>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-[#2A2A2A]">
                  <span className="text-gray-400">Total Costes Emisor</span>
                  <span className="font-medium text-[#39FF14]">{formatCurrency(bondData.totalInitialCosts)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña Flujos */}
        {activeTab === "flows" && (
          <div className="bg-[#151515] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Flujos de Caja Proyectados (Emisor)</h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center">
                  <span className="mr-2">📄</span> Exportar CSV
                </button>
                <button className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center">
                  <span className="mr-2">📊</span> Exportar XLSX
                </button>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#151515] to-transparent pointer-events-none z-10"></div>
              <table className="w-full border-collapse min-w-[1200px]">
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
                    <th className="py-2 px-3 text-right font-medium">Prima</th>
                    <th className="py-2 px-3 text-right font-medium">Escudo</th>
                    <th className="py-2 px-3 text-right font-medium">Flujo Emisor</th>
                    <th className="py-2 px-3 text-right font-medium">Flujo Emisor c/Escudo</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {bondData.flows.map((flow) => (
                    <tr key={flow.period} className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                      <td className="py-2 px-3 text-center sticky left-0 bg-[#151515] hover:bg-[#1E1E1E] z-10">
                        {flow.period}
                      </td>
                      <td className="py-2 px-3 text-left">{formatDate(flow.date)}</td>
                      <td className="py-2 px-3 text-right">
                        {flow.annualInflation !== null ? `${flow.annualInflation.toFixed(2)}%` : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.semesterInflation !== null ? `${flow.semesterInflation.toFixed(3)}%` : "-"}
                      </td>
                      <td className="py-2 px-3 text-center">{flow.gracePeriod || "-"}</td>
                      <td className="py-2 px-3 text-right">
                        {flow.indexedBond !== null ? formatCurrency(flow.indexedBond) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.coupon && flow.coupon < 0 ? "text-red-500" : ""}`}>
                        {flow.coupon !== null ? formatCurrency(flow.coupon) : "-"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right ${flow.amortization && flow.amortization < 0 ? "text-red-500" : ""}`}
                      >
                        {flow.amortization !== null ? formatCurrency(flow.amortization) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.premium && flow.premium < 0 ? "text-red-500" : ""}`}>
                        {flow.premium !== null ? formatCurrency(flow.premium) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.shield && flow.shield > 0 ? "text-green-500" : ""}`}>
                        {flow.shield !== null ? formatCurrency(flow.shield) : "-"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right ${flow.issuerFlow && flow.issuerFlow > 0 ? "text-green-500" : flow.issuerFlow && flow.issuerFlow < 0 ? "text-red-500" : ""}`}
                      >
                        {flow.issuerFlow !== null ? formatCurrency(flow.issuerFlow) : "-"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right ${flow.issuerFlowWithShield && flow.issuerFlowWithShield > 0 ? "text-green-500" : flow.issuerFlowWithShield && flow.issuerFlowWithShield < 0 ? "text-red-500" : ""}`}
                      >
                        {flow.issuerFlowWithShield !== null ? formatCurrency(flow.issuerFlowWithShield) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pestaña Analytics */}
        {activeTab === "analytics" && (
          <div className="bg-[#151515] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6">Análisis de Rentabilidad y Riesgo (Emisor)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">VAN Emisor (c/Escudo)</p>
                <p className="text-[#39FF14] font-medium text-xl">693.37</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">TIR Emisor (bruta)</p>
                <p className="text-[#39FF14] font-medium text-xl">{formatPercent(bondData.grossTCEA)}</p>
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
            <div className="bg-[#1A1A1A] rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-2">Nota sobre Analytics:</h4>
              <p className="text-sm text-gray-400">
                El VAN (Valor Actual Neto) representa el valor presente de los flujos de caja futuros del emisor,
                descontados a la tasa de costo de oportunidad, menos la inversión inicial. La TIR (Tasa Interna de
                Retorno) es la tasa de descuento que hace que el VAN de todos los flujos de caja sea igual a cero.
              </p>
            </div>
            <h2 className="text-xl font-semibold mb-6">Gráfico Flujo Emisor vs. Bono Indexado</h2>
            <div className="h-[400px]">
              <canvas ref={flowChartRef}></canvas>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
