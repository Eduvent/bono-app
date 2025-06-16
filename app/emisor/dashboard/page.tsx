// app/emisor/dashboard/page.tsx - CORREGIDO CON EXPORT DEFAULT
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChartLine,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  Eye,
  Calculator,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmisorBonds } from '@/lib/hooks/useEmisorBonds';

// 🚨 COMPONENTE PRINCIPAL CON EXPORT DEFAULT
export default function EmisorDashboard() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Autenticación y datos del emisor
  const { user, isLoading: authLoading } = useAuth({ requireRole: 'EMISOR' });

  // Datos de bonos con auto-refresh
  const {
    bonds,
    metrics,
    isLoading: bondsLoading,
    error: bondsError,
    refresh: refreshBonds,
    filterBonds,
  } = useEmisorBonds(user?.emisorProfile?.id || '', {
    status: statusFilter as any,
    refreshInterval: autoRefresh ? 30000 : 0,
  });

  // Estados locales
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Filtrar bonos según búsqueda y estado
  const filteredBonds = filterBonds(searchTerm, statusFilter);

  // Manejar refresh manual
  const handleRefresh = async () => {
    await refreshBonds();
    setLastRefresh(new Date());
  };

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Obtener color del estado
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-900/20 text-green-400 border border-green-500/30';
      case 'draft':
        return 'bg-blue-900/20 text-blue-400 border border-blue-500/30';
      case 'paused':
        return 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30';
      case 'completed':
        return 'bg-gray-900/20 text-gray-400 border border-gray-500/30';
      default:
        return 'bg-gray-900/20 text-gray-400 border border-gray-500/30';
    }
  };

  // Obtener ícono del estado
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle size={14} />;
      case 'draft':
        return <Clock size={14} />;
      case 'paused':
        return <Pause size={14} />;
      case 'completed':
        return <CheckCircle size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  // Navegación a crear bono
  const handleCreateBond = () => {
    router.push('/emisor/create-bond');
  };

  // Navegación a bono específico
  const handleViewBond = (bondId: string) => {
    router.push(`/emisor/bond/${bondId}`);
  };

  // Manejar logout
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('emisorProfile');
    router.push('/auth/login');
  };

  // Loading state
  if (authLoading || bondsLoading) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
            <p className="text-white mt-4">Cargando dashboard...</p>
          </div>
        </div>
    );
  }

  // Error state
  if (bondsError) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
            <p className="text-red-400 mb-4">Error cargando datos: {bondsError}</p>
            <button
                onClick={handleRefresh}
                className="bg-[#39FF14] text-black px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
    );
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
                  onClick={handleCreateBond}
                  className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
              >
                <Plus className="mr-1 inline" size={16} />
                Nuevo Bono
              </button>
              <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white transition"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 pt-24 pb-8">
          {/* Bienvenida */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Bienvenido, {user?.emisorProfile?.companyName || 'Emisor'}
            </h1>
            <p className="text-gray-400">
              Gestiona tus bonos, analiza métricas y monitorea el rendimiento de tus emisiones.
            </p>
          </div>

          {/* KPIs */}
          {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#151515] rounded-xl p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total de Bonos</p>
                      <p className="text-2xl font-bold text-white">{metrics.totalBonds}</p>
                    </div>
                    <BarChart3 className="text-[#39FF14]" size={24} />
                  </div>
                </div>

                <div className="bg-[#151515] rounded-xl p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Bonos Activos</p>
                      <p className="text-2xl font-bold text-green-400">{metrics.activeBonds}</p>
                    </div>
                    <CheckCircle className="text-green-400" size={24} />
                  </div>
                </div>

                <div className="bg-[#151515] rounded-xl p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Valor Total</p>
                      <p className="text-2xl font-bold text-[#39FF14]">
                        {formatCurrency(metrics.totalNominalValue)}
                      </p>
                    </div>
                    <DollarSign className="text-[#39FF14]" size={24} />
                  </div>
                </div>

                <div className="bg-[#151515] rounded-xl p-6 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">TCEA Promedio</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {metrics.averageTCEA ? `${(metrics.averageTCEA * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="text-blue-400" size={24} />
                  </div>
                </div>
              </div>
          )}

          {/* Controles */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                <input
                    type="text"
                    placeholder="Buscar bonos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#151515] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#39FF14] w-64"
                />
              </div>

              <div className="relative">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#151515] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#39FF14] appearance-none pr-10"
                >
                  <option value="all">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-[#2A2A2A] text-[#39FF14] focus:ring-[#39FF14]"
                />
                <span className="text-gray-400">Auto-refresh</span>
              </label>

              <button
                  onClick={handleRefresh}
                  className="p-2 bg-[#151515] border border-[#2A2A2A] rounded-lg hover:bg-[#1A1A1A] transition"
              >
                <RefreshCw size={16} />
              </button>

              <span className="text-xs text-gray-500">
              Último: {lastRefresh.toLocaleTimeString()}
            </span>
            </div>
          </div>

          {/* Lista de Bonos */}
          <div className="bg-[#151515] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="p-6 border-b border-[#2A2A2A]">
              <h2 className="text-xl font-semibold">
                Mis Bonos ({filteredBonds.length})
              </h2>
            </div>

            {filteredBonds.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="mx-auto text-gray-600 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    {bonds.length === 0 ? 'No hay bonos creados' : 'No se encontraron bonos'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {bonds.length === 0
                        ? 'Comienza creando tu primer bono para gestionar emisiones.'
                        : 'Intenta cambiar los filtros de búsqueda.'}
                  </p>
                  {bonds.length === 0 && (
                      <button
                          onClick={handleCreateBond}
                          className="bg-[#39FF14] text-black px-6 py-3 rounded-lg font-medium hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                      >
                        <Plus className="mr-2 inline" size={16} />
                        Crear Primer Bono
                      </button>
                  )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#1A1A1A]">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Bono</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Estado</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Valor Nominal</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Duración</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">TCEA</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Creado</th>
                      <th className="px-6 py-4 text-sm font-medium text-gray-400">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                    {filteredBonds.map((bond) => (
                        <tr
                            key={bond.id}
                            className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                            onClick={() => handleViewBond(bond.id)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-white">{bond.name}</div>
                              <div className="text-sm text-gray-400">{bond.codigoIsin}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bond.status)}`}>
                          {getStatusIcon(bond.status)}
                          <span className="ml-1 capitalize">{bond.status.toLowerCase()}</span>
                        </span>
                          </td>
                          <td className="px-6 py-4 text-white">
                            {formatCurrency(bond.nominalValue)}
                          </td>
                          <td className="px-6 py-4 text-gray-400">
                            {bond.years} años • {bond.couponFrequency}
                          </td>
                          <td className="px-6 py-4">
                            {bond.tceaEmisor ? (
                                <span className="text-blue-400 font-medium">
                            {(bond.tceaEmisor * 100).toFixed(2)}%
                          </span>
                            ) : (
                                <span className="text-gray-500">Sin calcular</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">
                            {formatDate(bond.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewBond(bond.id);
                                  }}
                                  className="p-2 text-gray-400 hover:text-white transition"
                                  title="Ver detalles"
                              >
                                <Eye size={16} />
                              </button>
                              {bond.hasFlows && (
                                  <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/emisor/bond/${bond.id}?tab=calculations`);
                                      }}
                                      className="p-2 text-gray-400 hover:text-[#39FF14] transition"
                                      title="Ver cálculos"
                                  >
                                    <Calculator size={16} />
                                  </button>
                              )}
                            </div>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}