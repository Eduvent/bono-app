"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LineChartIcon as ChartLine,
  Plus,
  Search,
  DollarSign,
  BadgeIcon as Certificate,
  HandCoins,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  LogOut,
} from "lucide-react"

interface Bond {
  id: string
  name: string
  nominalValue: number
  commercialValueCollected: number
  termYears: number
  couponRate: number
  tceaEmisorWithShield: number
  issueDate: string
  status: "draft" | "active" | "expired"
  nextCouponPaymentDate?: string
  nextCouponPaymentAmount?: number
  interestPaidThisYear?: number
}

export default function EmisorDashboard() {
  const router = useRouter()
  const [emisorData, setEmisorData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Sample bond data
  const sampleBondsData: Bond[] = [
    {
      id: "BOND-001",
      name: "Bono Corporativo Alpha",
      nominalValue: 2500000,
      commercialValueCollected: 2450000,
      termYears: 5,
      couponRate: 8.5,
      tceaEmisorWithShield: 7.25,
      issueDate: "2023-01-12",
      status: "active",
      nextCouponPaymentDate: "2024-07-12",
      nextCouponPaymentAmount: 106250,
      interestPaidThisYear: 212500,
    },
    {
      id: "BOND-002",
      name: "Bono Inversión Beta",
      nominalValue: 1750000,
      commercialValueCollected: 1720000,
      termYears: 3,
      couponRate: 7.2,
      tceaEmisorWithShield: 6.15,
      issueDate: "2023-02-24",
      status: "active",
      nextCouponPaymentDate: "2024-08-24",
      nextCouponPaymentAmount: 63000,
      interestPaidThisYear: 126000,
    },
    {
      id: "BOND-003",
      name: "Bono Proyecto Gamma",
      nominalValue: 3000000,
      commercialValueCollected: 2980000,
      termYears: 7,
      couponRate: 9.1,
      tceaEmisorWithShield: 7.8,
      issueDate: "2023-03-05",
      status: "active",
      nextCouponPaymentDate: "2024-09-05",
      nextCouponPaymentAmount: 136500,
      interestPaidThisYear: 273000,
    },
    {
      id: "BOND-006",
      name: "Bono Inmobiliario Zeta",
      nominalValue: 1000000,
      commercialValueCollected: 990000,
      termYears: 3,
      couponRate: 6.8,
      tceaEmisorWithShield: 5.95,
      issueDate: "2023-05-15",
      status: "draft",
      interestPaidThisYear: 0,
    },
  ]

  useEffect(() => {
    const userRole = localStorage.getItem("userRole")
    if (userRole !== "emisor") {
      router.push("/auth/login")
      return
    }

    const profile = localStorage.getItem("emisorProfile")
    if (profile) {
      setEmisorData(JSON.parse(profile))
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("emisorProfile")
    router.push("/auth/login")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
  }

  const filteredBonds = sampleBondsData.filter((bond) => {
    const matchesStatus = statusFilter === "all" || bond.status === statusFilter
    const matchesSearch =
      bond.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bond.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Calculate KPIs
  const activeBonds = sampleBondsData.filter((b) => b.status === "active")
  const totalNominal = sampleBondsData.reduce((sum, bond) => sum + bond.nominalValue, 0)
  const activeBondsCount = activeBonds.length
  const interestPaidYTD = activeBonds.reduce((sum, bond) => sum + (bond.interestPaidThisYear || 0), 0)

  // Next coupon payment calculation
  const today = new Date()
  const upcomingPayments = activeBonds
    .filter((bond) => bond.nextCouponPaymentDate && new Date(bond.nextCouponPaymentDate) >= today)
    .map((bond) => ({
      date: new Date(bond.nextCouponPaymentDate!),
      amount: bond.nextCouponPaymentAmount || 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const nextPaymentDate = upcomingPayments.length > 0 ? upcomingPayments[0].date : null
  const totalNextPaymentAmount = upcomingPayments
    .filter((payment) => nextPaymentDate && payment.date.getTime() === nextPaymentDate.getTime())
    .reduce((sum, payment) => sum + payment.amount, 0)

  if (!emisorData) {
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/emisor/create-bond")}
              className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
            >
              <Plus className="mr-1 inline" size={16} />
              Nuevo Bono
            </button>
            <button onClick={handleLogout} className="text-[#39FF14] hover:text-white transition duration-250">
              <LogOut className="mr-1 inline" size={16} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard de Emisor</h1>
          <p className="text-gray-400">Administra tus bonos americanos y visualiza su rendimiento</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-400 font-medium">Total nominal emitido</h3>
              <DollarSign className="text-gray-500" size={20} />
            </div>
            <div className="flex items-end">
              <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(totalNominal)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-400 font-medium">Bonos activos</h3>
              <Certificate className="text-gray-500" size={20} />
            </div>
            <div className="flex items-end">
              <span className="text-[#39FF14] text-3xl font-bold">{activeBondsCount}</span>
              <span className="text-gray-400 ml-1 mb-1">bonos</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-400 font-medium">Intereses pagados YTD</h3>
              <HandCoins className="text-gray-500" size={20} />
            </div>
            <div className="flex items-end">
              <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(interestPaidYTD)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Desde 01 Ene, {new Date().getFullYear()}</p>
          </div>

          <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-gray-400 font-medium">Próximo pago de cupón</h3>
              <Calendar className="text-gray-500" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(totalNextPaymentAmount)}</span>
              <span className="text-gray-400 text-sm mt-1">
                {nextPaymentDate ? formatDate(nextPaymentDate.toISOString().split("T")[0]) : "--"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Total de todos los bonos</p>
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
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="expired">Vencido</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar bono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[#39FF14] transition"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>

        {/* Bonds Table */}
        <div className="bg-[#151515] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Código
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Nombre
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      V. Nominal
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      V. Comercial Rec.
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Plazo (años)
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Cupón (%)
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      TCEA Emisor c/E
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Fecha Emisión
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Estado
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBonds.map((bond) => (
                  <tr
                    key={bond.id}
                    onClick={() => router.push(`/emisor/bond/${bond.id}`)}
                    className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] cursor-pointer transition"
                  >
                    <td className="px-6 py-4 text-sm">{bond.id}</td>
                    <td className="px-6 py-4 text-sm">{bond.name}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(bond.nominalValue)}</td>
                    <td className="px-6 py-4 text-sm">{formatCurrency(bond.commercialValueCollected)}</td>
                    <td className="px-6 py-4 text-sm">{bond.termYears}</td>
                    <td className="px-6 py-4 text-sm">{bond.couponRate.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-sm">{bond.tceaEmisorWithShield.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-sm">{formatDate(bond.issueDate)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          bond.status === "active"
                            ? "bg-green-900 text-green-400"
                            : bond.status === "draft"
                              ? "bg-yellow-900 text-yellow-400"
                              : "bg-red-900 text-red-400"
                        }`}
                      >
                        {bond.status === "active" ? "Activo" : bond.status === "draft" ? "Borrador" : "Vencido"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBonds.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-40 h-40 mb-6 flex items-center justify-center">
                <DollarSign className="text-gray-700" size={80} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No hay bonos para mostrar</h3>
              <p className="text-gray-400 mb-6 text-center max-w-md">
                Aún no has creado ningún bono o los filtros aplicados no muestran resultados.
              </p>
              <button
                onClick={() => router.push("/emisor/create-bond")}
                className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
              >
                <Plus className="mr-1 inline" size={16} />
                Crear nuevo bono
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
