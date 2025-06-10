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
  status: "active" | "expired"
  issuer: string
  currency: string
  nominalValue: number
  issueDate: string
  maturityDate: string
  interestRate: number
  interestRateType: string
  paymentFrequency: string
  inflationIndexed: boolean
  inflationRate: number
  maturityPremium: number
  purchaseDate: string
  initialDisbursement: number
  marketValueToday: number
  unrealizedGain: number
  collectedCoupons: number
  nextCouponDate: string
  nextCouponAmount: number
  duration: number
  convexity: number
  modifiedDuration: number
  trea: number
  costs: {
    placement: number
    flotation: number
    cavali: number
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
    investorFlow: number | null
    actualizedFlow: number | null
    faByTerm: number | null
    convexityFactor: number | null
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
        interestRate: 8.0,
        interestRateType: "Efectiva",
        paymentFrequency: "Semestral",
        inflationIndexed: true,
        inflationRate: 10.0,
        maturityPremium: 10.0,
        purchaseDate: "2025-06-01",
        initialDisbursement: 1059.98,
        marketValueToday: 1753.34,
        unrealizedGain: 693.36,
        collectedCoupons: 0,
        nextCouponDate: "2025-11-28",
        nextCouponAmount: 41.15,
        duration: 4.45,
        convexity: 22.39,
        modifiedDuration: 4.35,
        trea: 17.298,
        costs: {
          placement: 2.5,
          flotation: 4.5,
          cavali: 2.98,
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
            investorFlow: -1059.98,
            actualizedFlow: null,
            faByTerm: null,
            convexityFactor: null,
          },
          {
            period: 1,
            date: "2025-11-28",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1048.81,
            coupon: 41.15,
            amortization: 0,
            premium: 0,
            investorFlow: 41.15,
            actualizedFlow: 40.25,
            faByTerm: 20.12,
            convexityFactor: 80.5,
          },
          {
            period: 2,
            date: "2026-05-27",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1100.0,
            coupon: 43.15,
            amortization: 0,
            premium: 0,
            investorFlow: 43.15,
            actualizedFlow: 41.3,
            faByTerm: 41.3,
            convexityFactor: 247.77,
          },
          {
            period: 3,
            date: "2026-11-23",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1153.69,
            coupon: 45.26,
            amortization: 0,
            premium: 0,
            investorFlow: 45.26,
            actualizedFlow: 42.37,
            faByTerm: 63.55,
            convexityFactor: 508.42,
          },
          {
            period: 4,
            date: "2027-05-22",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1210.0,
            coupon: 47.47,
            amortization: 0,
            premium: 0,
            investorFlow: 47.47,
            actualizedFlow: 43.47,
            faByTerm: 86.94,
            convexityFactor: 869.37,
          },
          {
            period: 5,
            date: "2027-11-18",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1269.06,
            coupon: 49.79,
            amortization: 0,
            premium: 0,
            investorFlow: 49.79,
            actualizedFlow: 44.6,
            faByTerm: 111.49,
            convexityFactor: 1337.94,
          },
          {
            period: 6,
            date: "2028-05-16",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1331.0,
            coupon: 52.22,
            amortization: 0,
            premium: 0,
            investorFlow: 52.22,
            actualizedFlow: 45.76,
            faByTerm: 137.27,
            convexityFactor: 1921.77,
          },
          {
            period: 7,
            date: "2028-11-12",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1395.96,
            coupon: 54.76,
            amortization: 0,
            premium: 0,
            investorFlow: 54.76,
            actualizedFlow: 46.95,
            faByTerm: 164.31,
            convexityFactor: 2628.93,
          },
          {
            period: 8,
            date: "2029-05-11",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1464.1,
            coupon: 57.44,
            amortization: 0,
            premium: 0,
            investorFlow: 57.44,
            actualizedFlow: 48.16,
            faByTerm: 192.66,
            convexityFactor: 3467.86,
          },
          {
            period: 9,
            date: "2029-11-07",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1535.56,
            coupon: 60.24,
            amortization: 0,
            premium: 0,
            investorFlow: 60.24,
            actualizedFlow: 49.42,
            faByTerm: 222.37,
            convexityFactor: 4447.44,
          },
          {
            period: 10,
            date: "2030-05-06",
            annualInflation: 10.0,
            semesterInflation: 4.881,
            gracePeriod: "S",
            indexedBond: 1610.51,
            coupon: 63.18,
            amortization: 1610.51,
            premium: 10.0,
            investorFlow: 1683.69,
            actualizedFlow: 1351.08,
            faByTerm: 6755.4,
            convexityFactor: 148618.76,
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
              `Colocación (${bondData.costs.placement.toFixed(2)})`,
              `Flotación (${bondData.costs.flotation.toFixed(2)})`,
              `CAVALI (${bondData.costs.cavali.toFixed(2)})`,
            ],
            datasets: [
              {
                data: [bondData.costs.placement, bondData.costs.flotation, bondData.costs.cavali],
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
                  font: {
                    family: "Inter",
                    size: 10,
                  },
                  boxWidth: 10,
                  padding: 10,
                },
              },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: S/ ${context.raw}`,
                },
              },
            },
            cutout: "60%",
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
        const coupons = bondData.flows.map((flow) => flow.coupon || 0)
        const indexedBonds = bondData.flows.map((flow) => flow.indexedBond || 0)

        flowChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: periods,
            datasets: [
              {
                label: "Flujo Bonista (Cupón)",
                type: "bar",
                data: coupons,
                backgroundColor: "#39FF14",
                yAxisID: "y_flujos",
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
                yAxisID: "y_indexado",
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
              y_flujos: {
                position: "left",
                title: {
                  display: true,
                  text: "Flujo Cupón (PEN)",
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
              y_indexado: {
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
                  label: (context) => `${context.dataset.label}: S/ ${context.raw.toLocaleString()}`,
                },
              },
            },
          },
        })
      }
    }
  }, [bondData, activeTab])

  const handleBackToDashboard = () => {
    router.push("/inversionista/dashboard")
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
      <div className="bg-[#151515] py-4 border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-white text-xl font-semibold">BonoApp</span>
          </div>
          <button
            onClick={handleBackToDashboard}
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
            <h1 className="text-2xl font-bold mr-3">Detalle de Mi Bono: {bondData.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                bondData.status === "active" ? "bg-[#39FF14] text-black" : "bg-red-500 text-white"
              }`}
            >
              {bondData.status === "active" ? "Activo" : "Vencido"}
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
                    <span className="font-medium">{bondData.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Emisor:</span>
                    <span className="font-medium">{bondData.issuer}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Moneda:</span>
                    <span className="font-medium">{bondData.currency}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Valor Nominal:</span>
                    <span className="font-medium">{formatCurrency(bondData.nominalValue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-36 inline-block">Fecha Emisión:</span>
                    <span className="font-medium">{formatDate(bondData.issueDate)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Fecha Vencimiento:</span>
                    <span className="font-medium">{formatDate(bondData.maturityDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Tasa de Interés:</span>
                    <span className="font-medium">
                      {bondData.interestRate.toFixed(3)}% anual ({bondData.interestRateType})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Frecuencia de Pago:</span>
                    <span className="font-medium">{bondData.paymentFrequency}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Indexado a Inflación:</span>
                    <span className="font-medium">
                      {bondData.inflationIndexed ? `Sí (Anual ${bondData.inflationRate.toFixed(2)}%)` : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Prima al Vencimiento:</span>
                    <span className="font-medium">S/ {bondData.maturityPremium.toFixed(2)} (Recibida)</span>
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
                    <span className="font-medium">{formatDate(bondData.purchaseDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Desembolso Inicial:</span>
                    <span className="font-medium text-red-400">- {formatCurrency(bondData.initialDisbursement)}</span>
                  </div>

                  <div className="pt-3">
                    <h4 className="text-md font-medium mb-2 text-gray-300">Desglose de Mis Costes:</h4>
                    <div className="h-[180px] w-full max-w-xs mx-auto relative">
                      <canvas ref={costChartRef}></canvas>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-3 pt-2 border-t border-[#2A2A2A]">
                      <span className="text-gray-400 font-medium">Total Costes Pagados:</span>
                      <span className="font-semibold text-[#39FF14]">
                        {formatCurrency(bondData.costs.placement + bondData.costs.flotation + bondData.costs.cavali)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Columna 2: Rendimiento y Estado */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-[#39FF14] mb-3">Rendimiento y Estado</h3>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">TREA (al comprar):</span>
                    <span className="font-medium text-[#39FF14]">{formatPercent(bondData.trea)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Valor de Mercado Hoy:</span>
                    <span className="font-medium">{formatCurrency(bondData.marketValueToday)} (Ejemplo)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Ganancia No Realizada:</span>
                    <span className="font-medium text-[#39FF14]">
                      + {formatCurrency(bondData.unrealizedGain)} (Ejemplo)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Cupones Cobrados:</span>
                    <span className="font-medium">{formatCurrency(bondData.collectedCoupons)} (Aún no)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 w-40 inline-block">Próximo Cupón:</span>
                    <span className="font-medium">
                      {formatDate(bondData.nextCouponDate)} • {formatCurrency(bondData.nextCouponAmount)}
                    </span>
                  </div>
                </div>

                {/* Columna 3: Indicadores de Riesgo */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-lg font-semibold text-[#39FF14] mb-3">Indicadores de Riesgo</h3>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Duración</div>
                    <div className="text-lg font-semibold">{bondData.duration.toFixed(2)} años</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Convexidad</div>
                    <div className="text-lg font-semibold">{bondData.convexity.toFixed(2)}</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-lg">
                    <div className="text-gray-400 text-xs">Duración Modificada</div>
                    <div className="text-lg font-semibold">{bondData.modifiedDuration.toFixed(2)}</div>
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
                      <td className={`py-2 px-3 text-right ${flow.coupon ? "text-[#39FF14]" : ""}`}>
                        {flow.coupon !== null ? formatCurrency(flow.coupon) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.amortization ? "text-[#39FF14]" : ""}`}>
                        {flow.amortization !== null ? formatCurrency(flow.amortization) : "-"}
                      </td>
                      <td className={`py-2 px-3 text-right ${flow.premium ? "text-[#39FF14]" : ""}`}>
                        {flow.premium !== null ? formatCurrency(flow.premium) : "-"}
                      </td>
                      <td
                        className={`py-2 px-3 text-right ${flow.investorFlow && flow.investorFlow > 0 ? "text-[#39FF14]" : flow.investorFlow && flow.investorFlow < 0 ? "text-red-400" : ""}`}
                      >
                        {flow.investorFlow !== null ? formatCurrency(flow.investorFlow) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.actualizedFlow !== null ? formatCurrency(flow.actualizedFlow) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.faByTerm !== null ? formatCurrency(flow.faByTerm) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {flow.convexityFactor !== null ? formatCurrency(flow.convexityFactor) : "-"}
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
                <p className="text-[#39FF14] font-medium text-xl">{formatCurrency(bondData.unrealizedGain)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">TREA (TIR)</p>
                <p className="text-[#39FF14] font-medium text-xl">{formatPercent(bondData.trea)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Duración Modificada</p>
                <p className="text-[#39FF14] font-medium text-xl">{bondData.modifiedDuration.toFixed(2)}</p>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Total Ratios Decisión</p>
                <p className="text-[#39FF14] font-medium text-xl">26.84</p>
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
