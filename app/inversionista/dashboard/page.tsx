"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/lib/hooks/useAuth'
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

interface Bond {
  id: string
  name: string
  nominalValue: number
  pricePaid: number
  termYears: number
  couponRate: number
  treaBonista: number
  issueDate: string
  status: "active" | "expired"
}

interface AvailableBond {
  id: string
  name: string
  issuer: string
  nominalValue: number
  couponRate: number
  commercialPrice: number
  maturityDate: string
  estimatedTREA: number
}

export default function InversionistaDashboard() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [inversionistaData, setInversionistaData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"mis-bonos" | "bonos-disponibles">("mis-bonos")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [availableSearchTerm, setAvailableSearchTerm] = useState("")

  // Sample bond data
  const misBonos: Bond[] = [
    {
      id: "BOND-001",
      name: "Bono Corporativo Alpha",
      nominalValue: 2500000,
      pricePaid: 2475000,
      termYears: 5,
      couponRate: 8.5,
      treaBonista: 8.7,
      issueDate: "2023-01-12",
      status: "active",
    },
    {
      id: "BOND-002",
      name: "Bono Inversión Beta",
      nominalValue: 1750000,
      pricePaid: 1767500,
      termYears: 3,
      couponRate: 7.2,
      treaBonista: 7.1,
      issueDate: "2023-02-24",
      status: "active",
    },
    {
      id: "BOND-003",
      name: "Bono Proyecto Gamma",
      nominalValue: 3000000,
      pricePaid: 2985000,
      termYears: 7,
      couponRate: 9.1,
      treaBonista: 9.2,
      issueDate: "2023-03-05",
      status: "active",
    },
    {
      id: "BOND-004",
      name: "Bono Tecnológico Delta",
      nominalValue: 2000000,
      pricePaid: 1990000,
      termYears: 4,
      couponRate: 7.8,
      treaBonista: 7.9,
      issueDate: "2023-04-18",
      status: "active",
    },
    {
      id: "BOND-005",
      name: "Bono Infraestructura Epsilon",
      nominalValue: 4250000,
      pricePaid: 4292500,
      termYears: 10,
      couponRate: 9.5,
      treaBonista: 9.3,
      issueDate: "2022-05-02",
      status: "active",
    },
    {
      id: "BOND-006",
      name: "Bono Inmobiliario Zeta",
      nominalValue: 1000000,
      pricePaid: 1000000,
      termYears: 3,
      couponRate: 6.8,
      treaBonista: 6.8,
      issueDate: "2020-05-15",
      status: "expired",
    },
  ]

  const bonosDisponibles: AvailableBond[] = [
    {
      id: "BOND-101",
      name: "Bono Desarrollo Urbano",
      issuer: "Municipalidad Lima",
      nominalValue: 1000000,
      couponRate: 7.8,
      commercialPrice: 980000,
      maturityDate: "2028-06-15",
      estimatedTREA: 8.1,
    },
    {
      id: "BOND-102",
      name: "Bono Corporativo Minero",
      issuer: "Minera Andina S.A.",
      nominalValue: 2500000,
      couponRate: 9.2,
      commercialPrice: 2525000,
      maturityDate: "2030-09-30",
      estimatedTREA: 9.0,
    },
    {
      id: "BOND-103",
      name: "Bono Energía Renovable",
      issuer: "EcoEnergy Corp.",
      nominalValue: 3000000,
      couponRate: 8.5,
      commercialPrice: 3030000,
      maturityDate: "2029-11-12",
      estimatedTREA: 8.3,
    },
    {
      id: "BOND-104",
      name: "Bono Infraestructura Vial",
      issuer: "Ministerio de Transportes",
      nominalValue: 5000000,
      couponRate: 6.5,
      commercialPrice: 4950000,
      maturityDate: "2026-03-05",
      estimatedTREA: 6.7,
    },
    {
      id: "BOND-105",
      name: "Bono Hipotecario Bancario",
      issuer: "Banco Nacional S.A.",
      nominalValue: 1500000,
      couponRate: 5.8,
      commercialPrice: 1492500,
      maturityDate: "2025-07-22",
      estimatedTREA: 6.0,
    },
  ]

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

  const filteredMisBonos = misBonos.filter((bond) => {
    const matchesStatus = statusFilter === "all" || bond.status === statusFilter
    const matchesSearch =
      bond.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bond.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const filteredBonosDisponibles = bonosDisponibles.filter((bond) => {
    return (
      bond.id.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
      bond.name.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
      bond.issuer.toLowerCase().includes(availableSearchTerm.toLowerCase())
    )
  })

  // Calculate KPIs
  const totalInvertido = misBonos.reduce((sum, bond) => sum + bond.pricePaid, 0)
  const bonosActuales = misBonos.filter((bond) => bond.status === "active").length
  const interesesRecibidos = 875430 // Sample YTD interest
  const proximoCupon = { amount: 123750, date: "15 Junio, 2023" }

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
                  <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(totalInvertido)}</span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Bonos Actuales</h3>
                  <Certificate className="text-gray-500" size={20} />
                </div>
                <div className="flex items-end">
                  <span className="text-[#39FF14] text-3xl font-bold">{bonosActuales}</span>
                  <span className="text-gray-400 ml-1 mb-1">bonos</span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Intereses Recibidos YTD</h3>
                  <Receipt className="text-gray-500" size={20} />
                </div>
                <div className="flex items-end">
                  <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(interesesRecibidos)}</span>
                </div>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-gray-400 font-medium">Próximo Pago de Cupón</h3>
                  <Calendar className="text-gray-500" size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(proximoCupon.amount)}</span>
                  <span className="text-gray-400 text-sm mt-1">{proximoCupon.date}</span>
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
                          Plazo (años)
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
                          Fecha Emisión
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
                    {filteredMisBonos.map((bond) => (
                      <tr
                        key={bond.id}
                        onClick={() => router.push(`/inversionista/bond/${bond.id}`)}
                        className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] cursor-pointer transition"
                      >
                        <td className="px-6 py-4 text-sm">{bond.id}</td>
                        <td className="px-6 py-4 text-sm">{bond.name}</td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(bond.nominalValue)}</td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(bond.pricePaid)}</td>
                        <td className="px-6 py-4 text-sm">{bond.termYears}</td>
                        <td className="px-6 py-4 text-sm">{bond.couponRate}%</td>
                        <td className="px-6 py-4 text-sm">{bond.treaBonista}%</td>
                        <td className="px-6 py-4 text-sm">{formatDate(bond.issueDate)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              bond.status === "active" ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
                            }`}
                          >
                            {bond.status === "active" ? "Activo" : "Vencido"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMisBonos.length === 0 && (
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
                  <select className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition">
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
                  <select className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition">
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
                  <select className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition">
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
                    {filteredBonosDisponibles.map((bond) => (
                      <tr key={bond.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] transition group">
                        <td className="px-6 py-4 text-sm">{bond.id}</td>
                        <td className="px-6 py-4 text-sm">{bond.name}</td>
                        <td className="px-6 py-4 text-sm">{bond.issuer}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBonosDisponibles.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 mb-6 flex items-center justify-center">
                    <Search className="text-gray-700" size={80} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No hay bonos disponibles actualmente</h3>
                  <p className="text-gray-400 mb-6 text-center max-w-md">
                    No hay bonos disponibles que coincidan con tus criterios de búsqueda o filtros.
                  </p>
                  <button className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250">
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
