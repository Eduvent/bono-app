"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calculator, Download, Play, Pause, Share2, RefreshCw } from "lucide-react"
import Chart from "chart.js/auto"
import { useAuth } from "@/lib/hooks/useAuth"
import { useCalculations } from "@/lib/hooks/useCalculations"
import { useCashFlows } from "@/lib/hooks/useCashFlows"
import { useBondStatus } from "@/lib/hooks/useBondStatus"
import useSWR from 'swr'

interface BondDetailProps {
  params: {
    bondId: string
  }
  searchParams?: { created?: string; tab?: string }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function BondDetailPage({ params, searchParams }: BondDetailProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"summary" | "flows" | "analytics">(
      (searchParams?.tab as any) || "summary"
  )
  const [showSuccessMessage, setShowSuccessMessage] = useState(!!searchParams?.created)

  // Referencias para gráficos
  const costChartRef = useRef<HTMLCanvasElement>(null)
  const flowChartRef = useRef<HTMLCanvasElement>(null)
  const costChartInstance = useRef<Chart | null>(null)
  const flowChartInstance = useRef<Chart | null>(null)

  // 🔗 HOOKS CONECTADOS
  const { user } = useAuth({ requireRole: 'EMISOR' })

  // Obtener datos básicos del bono
  const { data: bondData, error: bondError, mutate: refreshBond } = useSWR(
      params.bondId ? `/api/bonds/${params.bondId}` : null,
      fetcher
  )

  // Hook de cálculos financieros
  const {
    calculate,
    isCalculating,
    lastResult,
    hasFlows,
    needsRecalculation,
    canCalculate
  } = useCalculations(params.bondId, {
    autoCalculate: false,
    onSuccess: (result) => {
      console.log('✅ Cálculos completados:', result)
    }
  })

  // Hook de flujos de caja
  const {
    flows,
    isLoading: flowsLoading,
    downloadCSV,
    recalculate: recalculateFlows,
    summary,
    hasFlows: hasFlowsData
  } = useCashFlows(params.bondId, {
    role: 'emisor',
    autoCalculate: false
  })

  // Hook de estado del bono
  const {
    updateStatus,
    publishBond,
    pauseBond,
    isUpdating
  } = useBondStatus(params.bondId)

  // Ocultar mensaje de éxito después de 5 segundos
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessMessage])

  // 🎨 FUNCIONES DE FORMATO
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "N/A"
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return "N/A"
    return `${(value * 100).toFixed(3)}%`
  }

  // 🔧 FUNCIONES DE ACCIÓN
  const handleCalculateFlows = async () => {
    if (!params.bondId || !canCalculate) return

    try {
      await calculate({
        recalculate: needsRecalculation,
        saveResults: true
      })
      await refreshBond()
    } catch (error) {
      console.error('Error calculando flujos:', error)
    }
  }

  const handleDownloadFlows = async () => {
    try {
      await downloadCSV()
    } catch (error) {
      console.error('Error descargando CSV:', error)
    }
  }

  const handlePublishBond = async () => {
    try {
      await publishBond()
      await refreshBond()
    } catch (error) {
      console.error('Error publishing bond:', error)
    }
  }

  // 📊 INICIALIZAR GRÁFICOS
  useEffect(() => {
    if (!bondData) return

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
    if (activeTab === "summary" && costChartRef.current && bondData.costs) {
      const ctx = costChartRef.current.getContext("2d")
      if (ctx) {
        const costs = bondData.costs
        costChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: [
              `Prima (${((costs.primaVencimiento || 0) * 100).toFixed(2)}%)`,
              `Estructuración (${((costs.estructuracionPorcentaje || 0) * 100).toFixed(2)}%)`,
              `Colocación (${((costs.colocacionPorcentaje || 0) * 100).toFixed(2)}%)`,
              `Otros (${((costs.cavaliPorcentaje || 0) * 100).toFixed(2)}%)`,
            ],
            datasets: [
              {
                data: [
                  (costs.primaVencimiento || 0) * 100,
                  (costs.estructuracionPorcentaje || 0) * 100,
                  (costs.colocacionPorcentaje || 0) * 100,
                  (costs.cavaliPorcentaje || 0) * 100,
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
    if (activeTab === "analytics" && flowChartRef.current && flows.length > 0) {
      const ctx = flowChartRef.current.getContext("2d")
      if (ctx) {
        const periods = flows.map((flow) => flow.periodo.toString())
        const issuerFlows = flows.map((flow) => flow.flujoEmisorConEscudo || 0)
        const indexedBonds = flows.map((flow) => flow.bonoIndexado || 0)

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
                title: { display: true, text: "Periodo", color: "#CCCCCC" },
                grid: { color: "rgba(42, 42, 42, 0.5)" },
                ticks: { color: "#CCCCCC" },
              },
              y: {
                position: "left",
                title: { display: true, text: "Flujo Emisor (USD)", color: "#CCCCCC" },
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
  }, [bondData, activeTab, flows])

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

  // 🔄 ESTADOS DE CARGA Y ERROR
  if (bondError) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">Error cargando bono</p>
            <button
                onClick={() => router.push("/emisor/dashboard")}
                className="mt-4 px-4 py-2 bg-[#39FF14] text-black rounded-lg"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
    )
  }

  if (!bondData) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
            <p className="text-white mt-4">Cargando detalles del bono...</p>
          </div>
        </div>
    )
  }

  // Extraer métricas desde lastResult
  const metricas = lastResult?.metricas?.emisor
  const vanEmisor = metricas?.van || 0
  const tceaEmisor = metricas?.tceaEmisorConEscudo || metricas?.tceaEmisor || 0
  const duracion = metricas?.duracion || 0
  const convexidad = metricas?.convexidad || 0
  const duracionModificada = metricas?.duracionModificada || 0

  return (
      <div className="min-h-screen bg-[#0D0D0D] text-white">
        {/* Header */}
        <div className="bg-black bg-opacity-75 backdrop-blur-md py-4 fixed top-0 left-0 w-full z-50">
          <div className="container mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-white text-xl font-semibold">BonoApp</span>
            </div>
            <div className="flex items-center space-x-4">
              {bondData.status === 'DRAFT' && hasFlowsData && (
                  <button
                      onClick={handlePublishBond}
                      disabled={isUpdating}
                      className="flex items-center bg-[#39FF14] text-black px-4 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                  >
                    <Play size={16} className="mr-2" />
                    {isUpdating ? 'Publicando...' : 'Publicar'}
                  </button>
              )}
              <button
                  onClick={() => router.push("/emisor/dashboard")}
                  className="flex items-center text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="mr-1" size={16} />
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-6 pt-24 pb-8">
          {/* Success Message */}
          {showSuccessMessage && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg px-6 py-3 mb-6">
                <p className="text-green-400 text-sm">
                  ✅ Bono creado exitosamente. Ahora puedes calcular los flujos de caja.
                </p>
              </div>
          )}

          {/* Bond Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <h1 className="text-2xl font-bold mr-3">{bondData.name}</h1>
              <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bondData.status === "ACTIVE"
                          ? "bg-[#39FF14] text-black"
                          : bondData.status === "DRAFT"
                              ? "bg-yellow-500 text-black"
                              : bondData.status === "PAUSED"
                                  ? "bg-orange-500 text-black"
                                  : "bg-red-500 text-white"
                  }`}
              >
              {bondData.status === "ACTIVE" ? "Activo" :
                  bondData.status === "DRAFT" ? "Borrador" :
                      bondData.status === "PAUSED" ? "Pausado" : "Vencido"}
            </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                  onClick={handleCalculateFlows}
                  disabled={isCalculating || !canCalculate}
                  className="flex items-center bg-[#39FF14] text-black px-4 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition disabled:opacity-50"
              >
                <Calculator size={16} className="mr-2" />
                {isCalculating ? 'Calculando...' : 'Calcular Flujos'}
              </button>

              {hasFlowsData && (
                  <button
                      onClick={handleDownloadFlows}
                      className="flex items-center bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    <Download size={16} className="mr-2" />
                    Exportar CSV
                  </button>
              )}

              <button className="p-2 text-gray-400 hover:text-white transition">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-[#2A2A2A]">
            <div className="flex">
              {[
                { id: "summary", label: "Resumen" },
                { id: "flows", label: "Flujos" },
                { id: "analytics", label: "Analytics" },
              ].map((tab) => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                          activeTab === tab.id
                              ? "text-[#39FF14] border-[#39FF14]"
                              : "text-gray-400 border-transparent hover:text-white"
                      }`}
                  >
                    {tab.label}
                  </button>
              ))}
            </div>
          </div>

          {/* Pestaña Resumen */}
          {activeTab === "summary" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Datos Principales */}
                <div className="bg-[#151515] rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Datos Principales del Bono</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Emisor</span>
                      <span className="font-medium">{bondData.emisor?.companyName || "N/A"}</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Moneda</span>
                      <span className="font-medium">USD (Dólares)</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Valor Nominal</span>
                      <span className="font-medium">{formatCurrency(bondData.valorNominal)}</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Fecha de Emisión</span>
                      <span className="font-medium">{formatDate(bondData.fechaEmision)}</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Fecha de Vencimiento</span>
                      <span className="font-medium">
                    {bondData.fechaEmision && bondData.numAnios ?
                        formatDate(new Date(new Date(bondData.fechaEmision).getTime() + bondData.numAnios * 365 * 24 * 60 * 60 * 1000).toISOString())
                        : "N/A"}
                  </span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Tipo de Tasa</span>
                      <span className="font-medium">Efectiva</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Tasa de Interés</span>
                      <span className="font-medium">{formatPercent(bondData.tasaAnual)} anual</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Frecuencia de Pago</span>
                      <span className="font-medium capitalize">{bondData.frecuenciaCupon}</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Días por Año</span>
                      <span className="font-medium">{bondData.diasPorAno}</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Método de Amortización</span>
                      <span className="font-medium">Americano (Bullet)</span>
                    </div>
                    <div className="border-b border-[#2A2A2A]"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Tasa Anual de Descuento</span>
                      <span className="font-medium">{formatPercent(bondData.tasaDescuento)}</span>
                    </div>
                  </div>
                </div>

                {/* KPIs y Gráfico de Costes */}
                <div className="space-y-6">
                  <div className="bg-[#151515] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6">Indicadores Clave (Emisor)</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">Precio Neto Recibido Emisor</p>
                        <p className="text-[#39FF14] font-medium text-lg">{formatCurrency(bondData.valorComercial)}</p>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">VAN Emisor</p>
                        <p className="text-[#39FF14] font-medium text-lg">{formatCurrency(vanEmisor)}</p>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">Duración</p>
                        <p className="text-[#39FF14] font-medium text-lg">
                          {duracion ? `${duracion.toFixed(2)} años` : "N/A"}
                        </p>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">Convexidad</p>
                        <p className="text-[#39FF14] font-medium text-lg">
                          {convexidad ? convexidad.toFixed(2) : "N/A"}
                        </p>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p>
                        <p className="text-[#39FF14] font-medium text-lg">{formatPercent(metricas?.tceaEmisor)}</p>
                      </div>
                      <div className="bg-[#1E1E1E] rounded-lg p-4">
                        <p className="text-gray-400 text-xs mb-1">TCEA Emisor (c/Escudo)</p>
                        <p className="text-[#39FF14] font-medium text-lg">{formatPercent(tceaEmisor)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Costes */}
                  {bondData.costs && (
                      <div className="bg-[#151515] rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-6">Desglose de Costes Emisor</h2>
                        <div className="h-[250px] sm:h-[300px] relative mb-6">
                          <canvas ref={costChartRef}></canvas>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-[#2A2A2A]">
                          <span className="text-gray-400">Total Costes Emisor</span>
                          <span className="font-medium text-[#39FF14]">
                      {formatPercent(
                          (bondData.costs.estructuracionPorcentaje || 0) +
                          (bondData.costs.colocacionPorcentaje || 0) +
                          (bondData.costs.flotacionPorcentaje || 0) +
                          (bondData.costs.cavaliPorcentaje || 0)
                      )}
                    </span>
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}

          {/* Pestaña Flujos */}
          {activeTab === "flows" && (
              <div className="bg-[#151515] rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Flujos de Caja Proyectados (Emisor)</h2>
                  <div className="flex space-x-3">
                    <button
                        onClick={handleDownloadFlows}
                        disabled={!hasFlowsData}
                        className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center disabled:opacity-50"
                    >
                      <span className="mr-2">📄</span> Exportar CSV
                    </button>
                    <button
                        onClick={handleDownloadFlows}
                        disabled={!hasFlowsData}
                        className="px-4 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#252525] transition flex items-center disabled:opacity-50"
                    >
                      <span className="mr-2">📊</span> Exportar XLSX
                    </button>
                  </div>
                </div>

                {hasFlowsData ? (
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
                        {flows.map((flow) => (
                            <tr key={flow.periodo} className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                              <td className="py-2 px-3 text-center sticky left-0 bg-[#151515] hover:bg-[#1E1E1E] z-10">
                                {flow.periodo}
                              </td>
                              <td className="py-2 px-3 text-left">{formatDate(flow.fecha)}</td>
                              <td className="py-2 px-3 text-right">
                                {flow.inflacionAnual !== null ? `${flow.inflacionAnual.toFixed(2)}%` : "-"}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {flow.inflacionSemestral !== null ? `${flow.inflacionSemestral.toFixed(3)}%` : "-"}
                              </td>
                              <td className="py-2 px-3 text-center">{flow.periodoGracia || "-"}</td>
                              <td className="py-2 px-3 text-right">
                                {flow.bonoIndexado !== null ? formatCurrency(flow.bonoIndexado) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${flow.cupon && flow.cupon < 0 ? "text-red-500" : ""}`}>
                                {flow.cupon !== null ? formatCurrency(flow.cupon) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${flow.amortizacion && flow.amortizacion < 0 ? "text-red-500" : ""}`}>
                                {flow.amortizacion !== null ? formatCurrency(flow.amortizacion) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${flow.prima && flow.prima < 0 ? "text-red-500" : ""}`}>
                                {flow.prima !== null ? formatCurrency(flow.prima) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${flow.escudoFiscal && flow.escudoFiscal > 0 ? "text-green-500" : ""}`}>
                                {flow.escudoFiscal !== null ? formatCurrency(flow.escudoFiscal) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${
                                  flow.flujoEmisor && flow.flujoEmisor > 0 ? "text-green-500" :
                                      flow.flujoEmisor && flow.flujoEmisor < 0 ? "text-red-500" : ""
                              }`}>
                                {flow.flujoEmisor !== null ? formatCurrency(flow.flujoEmisor) : "-"}
                              </td>
                              <td className={`py-2 px-3 text-right ${
                                  flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo > 0 ? "text-green-500" :
                                      flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo < 0 ? "text-red-500" : ""
                              }`}>
                                {flow.flujoEmisorConEscudo !== null ? formatCurrency(flow.flujoEmisorConEscudo) : "-"}
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                ) : (
                    <div className="py-16 text-center">
                      <Calculator className="mx-auto text-gray-600 mb-4" size={48} />
                      <h3 className="text-lg font-semibold mb-2">No hay flujos calculados</h3>
                      <p className="text-gray-400 mb-6">
                        Ejecuta los cálculos financieros para generar la tabla de flujos de caja.
                      </p>
                      <button
                          onClick={handleCalculateFlows}
                          disabled={isCalculating || !canCalculate}
                          className="bg-[#39FF14] text-black px-6 py-3 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition disabled:opacity-50"
                      >
                        {isCalculating ? 'Calculando...' : 'Calcular Flujos'}
                      </button>
                    </div>
                )}
              </div>
          )}

          {/* Pestaña Analytics */}
          {activeTab === "analytics" && (
              <div className="bg-[#151515] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Análisis de Rentabilidad y Riesgo (Emisor)</h2>

                {hasFlowsData && lastResult ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">VAN Emisor (c/Escudo)</p>
                          <p className="text-[#39FF14] font-medium text-xl">{formatCurrency(vanEmisor)}</p>
                        </div>
                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">TIR Emisor (bruta)</p>
                          <p className="text-[#39FF14] font-medium text-xl">{formatPercent(metricas?.tceaEmisor)}</p>
                        </div>
                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Duración Modificada</p>
                          <p className="text-[#39FF14] font-medium text-xl">
                            {duracionModificada ? duracionModificada.toFixed(2) : "N/A"}
                          </p>
                        </div>
                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-1">Total Ratios Decisión</p>
                          <p className="text-[#39FF14] font-medium text-xl">
                            {(duracion + convexidad).toFixed(2)}
                          </p>
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
                    </>
                ) : (
                    <div className="py-16 text-center">
                      <Calculator className="mx-auto text-gray-600 mb-4" size={48} />
                      <h3 className="text-lg font-semibold mb-2">Analytics no disponible</h3>
                      <p className="text-gray-400 mb-6">
                        Ejecuta los cálculos financieros para generar el análisis de rentabilidad y riesgo.
                      </p>
                      <button
                          onClick={handleCalculateFlows}
                          disabled={isCalculating || !canCalculate}
                          className="bg-[#39FF14] text-black px-6 py-3 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition disabled:opacity-50"
                      >
                        {isCalculating ? 'Calculando...' : 'Calcular Flujos'}
                      </button>
                    </div>
                )}
              </div>
          )}
        </main>
      </div>
  )
}