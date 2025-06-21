"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/lib/hooks/useAuth'
import { useInversionistaDashboardMetrics } from '@/lib/hooks/useInversionistaDashboardMetrics'
import { useInversionistaInvestments } from '@/lib/hooks/useInversionistaInvestments'
import { useAvailableBonds } from '@/lib/hooks/useAvailableBonds'
import {
  LineChartIcon as ChartLine,
  Plus,
  Search,
  DollarSign,
  BadgeIcon as Certificate,
  Receipt,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  LogOut,
} from "lucide-react"

export default function InversionistaDashboard() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [inversionistaData, setInversionistaData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"mis-bonos" | "bonos-disponibles">("mis-bonos")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [availableSearchTerm, setAvailableSearchTerm] = useState("")
  const [couponRateFilter, setCouponRateFilter] = useState("all")
  const [maturityFilter, setMaturityFilter] = useState("all")
  const [issuerTypeFilter, setIssuerTypeFilter] = useState("all")

  // Hooks para datos reales
  const { metrics, loading: metricsLoading } = useInversionistaDashboardMetrics()
  const { investments, loading: investmentsLoading } = useInversionistaInvestments()
  
  // Usar useMemo para evitar recrear el objeto en cada render
  const availableBondsFilters = useMemo(() => ({
    searchTerm: availableSearchTerm,
    couponRateRange: couponRateFilter !== "all" ? couponRateFilter : undefined,
    maturityRange: maturityFilter !== "all" ? maturityFilter : undefined,
    issuerType: issuerTypeFilter !== "all" ? issuerTypeFilter : undefined,
    sortBy: 'estimatedTREA' as const,
    sortOrder: 'desc' as const
  }), [availableSearchTerm, couponRateFilter, maturityFilter, issuerTypeFilter])
  
  const { bonds: availableBonds, loading: availableBondsLoading } = useAvailableBonds(availableBondsFilters)

  useEffect(() => {
    if (user?.inversionistaProfile) {
      setInversionistaData(user.inversionistaProfile)
    }
  }, [user])

  const handleLogout = () => {
    logout()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
  }

  // Usar useMemo para el filtrado de inversiones
  const filteredInvestments = useMemo(() => {
    return investments.filter((investment) => {
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && investment.status === "ACTIVE") ||
        (statusFilter === "expired" && investment.status === "MATURED")
      const matchesSearch =
        investment.bondId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.bondName.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [investments, statusFilter, searchTerm])

  // Loading state
  if (authLoading || !inversionistaData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
          <p className="text-white mt-4">Cargando dashboard...</p>
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
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">Dashboard de Bonista</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("bonos-disponibles")}
              className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
            >
              <Plus className="mr-1 inline" size={16} />
              Comprar Nuevo Bono
            </button>
            <button onClick={handleLogout} className="text-[#39FF14] hover:text-white transition duration-250">
              <LogOut className="mr-1 inline" size={16} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-8">
        {/* Tab Navigation */}
        <div className="mb-8 border-b border-[#2A2A2A]">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab("mis-bonos")}
              className={`py-3 font-medium border-b-2 transition ${
                activeTab === "mis-bonos"
                  ? "text-[#39FF14] border-[#39FF14]"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              Mis Bonos
            </button>
            <button
              onClick={() => setActiveTab("bonos-disponibles")}
              className={`py-3 font-medium border-b-2 transition ${
                activeTab === "bonos-disponibles"
                  ? "text-[#39FF14] border-[#39FF14]"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              Bonos Disponibles
            </button>
          </div>
        </div>

        {/* Mis Bonos Tab */}
        {activeTab === "mis-bonos" && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Total Invertido</h3>
                  <DollarSign className="text-gray-500" size={20} />
                </div>
                <div className="flex items-end">
                  <span className="text-[#39FF14] text-3xl font-bold">
                    {metricsLoading ? "..." : formatCurrency(metrics?.totalInvested || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Bonos Actuales</h3>
                  <Certificate className="text-gray-500" size={20} />
                </div>
                <div className="flex items-end">
                  <span className="text-[#39FF14] text-3xl font-bold">
                    {metricsLoading ? "..." : metrics?.activeBonds || 0}
                  </span>
                  <span className="text-gray-400 ml-1 mb-1">bonos</span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Intereses Recibidos YTD</h3>
                  <Receipt className="text-gray-500" size={20} />
                </div>
                <div className="flex items-end">
                  <span className="text-[#39FF14] text-3xl font-bold">
                    {metricsLoading ? "..." : formatCurrency(metrics?.totalInterestYTD || 0)}
                  </span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Próximo Pago de Cupón</h3>
                  <Calendar className="text-gray-500" size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#39FF14] text-3xl font-bold">
                    {metricsLoading ? "..." : formatCurrency(metrics?.nextCouponPayment?.amount || 0)}
                  </span>
                  <span className="text-gray-400 text-sm mt-1">
                    {metricsLoading ? "..." : metrics?.nextCouponPayment?.date || "Sin pagos próximos"}
                  </span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="expired">Vencidos</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[#39FF14] transition"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>

            {/* Mis Bonos Table */}
            <div className="bg-[#151515] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Código
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Nombre
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          V. Nominal
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Precio Pagado (Neto)
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Cupón (%)
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          TREA Bonista
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Fecha Inversión
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Estado
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {investmentsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#39FF14] mx-auto"></div>
                          <p className="text-gray-400 mt-2">Cargando inversiones...</p>
                        </td>
                      </tr>
                    ) : (
                      filteredInvestments.map((investment) => (
                        <tr
                          key={investment.id}
                          onClick={() => router.push(`/inversionista/bond/${investment.bondId}`)}
                          className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] cursor-pointer transition"
                        >
                          <td className="px-6 py-4 text-sm">{investment.bondCode}</td>
                          <td className="px-6 py-4 text-sm">{investment.bondName}</td>
                          <td className="px-6 py-4 text-sm">{formatCurrency(investment.valorNominal)}</td>
                          <td className="px-6 py-4 text-sm">{formatCurrency(investment.precioCompra)}</td>
                          <td className="px-6 py-4 text-sm">{investment.tasaAnual}%</td>
                          <td className="px-6 py-4 text-sm">{investment.trea || 0}%</td>
                          <td className="px-6 py-4 text-sm">{formatDate(investment.fechaInversion)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                investment.status === "ACTIVE" 
                                  ? "bg-green-900 text-green-400" 
                                  : investment.status === "MATURED"
                                  ? "bg-blue-900 text-blue-400"
                                  : "bg-red-900 text-red-400"
                              }`}
                            >
                              {investment.status === "ACTIVE" ? "Activo" : 
                               investment.status === "MATURED" ? "Vencido" : "En Default"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!investmentsLoading && filteredInvestments.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 mb-6 flex items-center justify-center">
                    <DollarSign className="text-gray-700" size={80} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No tienes bonos adquiridos</h3>
                  <p className="text-gray-400 mb-6 text-center max-w-md">
                    Aún no has adquirido ningún bono o los filtros aplicados no muestran resultados.
                  </p>
                  <button
                    onClick={() => setActiveTab("bonos-disponibles")}
                    className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
                  >
                    <Search className="mr-1 inline" size={16} />
                    Explorar Bonos Disponibles
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bonos Disponibles Tab */}
        {activeTab === "bonos-disponibles" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="flex space-x-3">
                <div className="relative">
                  <select 
                    value={couponRateFilter}
                    onChange={(e) => setCouponRateFilter(e.target.value)}
                    className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition"
                  >
                    <option value="all">Todas las Tasas</option>
                    <option value="5-7">5% - 7%</option>
                    <option value="7-9">7% - 9%</option>
                    <option value="9+">9% y más</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>

                <div className="relative">
                  <select 
                    value={maturityFilter}
                    onChange={(e) => setMaturityFilter(e.target.value)}
                    className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition"
                  >
                    <option value="all">Todos los Vencimientos</option>
                    <option value="0-3">0-3 años</option>
                    <option value="3-5">3-5 años</option>
                    <option value="5-10">5-10 años</option>
                    <option value="10+">10+ años</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>

                <div className="relative">
                  <select 
                    value={issuerTypeFilter}
                    onChange={(e) => setIssuerTypeFilter(e.target.value)}
                    className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition"
                  >
                    <option value="all">Todos los Emisores</option>
                    <option value="corp">Corporativos</option>
                    <option value="gov">Gubernamentales</option>
                    <option value="bank">Bancarios</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={16}
                  />
                </div>
              </div>

              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={availableSearchTerm}
                  onChange={(e) => setAvailableSearchTerm(e.target.value)}
                  className="w-full bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[#39FF14] transition"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>

            {/* Bonos Disponibles Table */}
            <div className="bg-[#151515] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Código
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Nombre
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Emisor
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          V. Nominal
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Tasa Cupón (%)
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Precio Comercial Base
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          Fecha Vencimiento
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                        <div className="flex items-center">
                          TREA Estimada
                          <ArrowUpDown className="ml-1" size={12} />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableBondsLoading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#39FF14] mx-auto"></div>
                          <p className="text-gray-400 mt-2">Cargando bonos disponibles...</p>
                        </td>
                      </tr>
                    ) : (
                      availableBonds.map((bond) => (
                        <tr key={bond.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] transition group">
                          <td className="px-6 py-4 text-sm">{bond.isinCode}</td>
                          <td className="px-6 py-4 text-sm">{bond.name}</td>
                          <td className="px-6 py-4 text-sm">{bond.issuerName}</td>
                          <td className="px-6 py-4 text-sm">{formatCurrency(bond.nominalValue)}</td>
                          <td className="px-6 py-4 text-sm">{bond.couponRate}%</td>
                          <td className="px-6 py-4 text-sm">{formatCurrency(bond.commercialPrice)}</td>
                          <td className="px-6 py-4 text-sm">{formatDate(bond.maturityDate)}</td>
                          <td className="px-6 py-4 text-sm">{bond.estimatedTREA}%</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => router.push(`/inversionista/invest/${bond.id}`)}
                              className="bg-[#39FF14] text-black font-medium px-3 py-1.5 rounded hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!availableBondsLoading && availableBonds.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 mb-6 flex items-center justify-center">
                    <Search className="text-gray-700" size={80} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No hay bonos disponibles actualmente</h3>
                  <p className="text-gray-400 mb-6 text-center max-w-md">
                    No hay bonos disponibles que coincidan con tus criterios de búsqueda o filtros.
                  </p>
                  <button 
                    onClick={() => {
                      setAvailableSearchTerm("")
                      setCouponRateFilter("all")
                      setMaturityFilter("all")
                      setIssuerTypeFilter("all")
                    }}
                    className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
                  >
                    Refrescar Lista
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
