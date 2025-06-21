import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

interface DashboardMetrics {
  totalInvested: number
  activeBonds: number
  totalInterestYTD: number
  nextCouponPayment: {
    amount: number
    date: string
  }
  portfolioDistribution: {
    byIssuer: Array<{
      issuer: string
      percentage: number
      amount: number
    }>
    byIndustry: Array<{
      industry: string
      percentage: number
      amount: number
    }>
  }
  upcomingPayments: Array<{
    bondId: string
    bondName: string
    amount: number
    date: string
  }>
  performanceMetrics: {
    averageTREA: number
    totalReturn: number
    ytdReturn: number
  }
}

export function useInversionistaDashboardMetrics() {
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user?.inversionistaProfile?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/inversionista/${user.inversionistaProfile.id}/dashboard-metrics`)
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.success) {
          // Mapear los datos del endpoint al formato esperado por el componente
          const mappedMetrics: DashboardMetrics = {
            totalInvested: data.kpis?.totalInvested || 0,
            activeBonds: data.kpis?.activeInvestments || 0,
            totalInterestYTD: data.kpis?.totalInterestYTD || 0, // Usar el nuevo campo calculado
            nextCouponPayment: {
              amount: data.upcomingPayments?.[0]?.couponAmount || 0, // Usar el cupón calculado
              date: data.upcomingPayments?.[0]?.nextPayment || "Sin pagos próximos"
            },
            portfolioDistribution: {
              byIssuer: data.distribution?.byEmisor?.map((emisor: any) => ({
                issuer: emisor.emisorName,
                percentage: data.kpis?.totalInvested > 0 ? (emisor.totalInvested / data.kpis.totalInvested) * 100 : 0,
                amount: emisor.totalInvested
              })) || [],
              byIndustry: data.distribution?.byIndustry?.map((industry: any) => ({
                industry: industry.industry,
                percentage: data.kpis?.totalInvested > 0 ? (industry.totalInvested / data.kpis.totalInvested) * 100 : 0,
                amount: industry.totalInvested
              })) || []
            },
            upcomingPayments: data.upcomingPayments?.map((payment: any) => ({
              bondId: payment.bondId,
              bondName: payment.bondName,
              amount: payment.couponAmount, // Usar el cupón calculado
              date: payment.nextPayment
            })) || [],
            performanceMetrics: {
              averageTREA: data.kpis?.averageReturn || 0,
              totalReturn: data.kpis?.portfolioReturn || 0,
              ytdReturn: data.kpis?.totalInterestYTD || 0
            }
          }
          setMetrics(mappedMetrics)
        } else {
          throw new Error('Datos de métricas inválidos')
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        
        // Establecer métricas por defecto en caso de error
        setMetrics({
          totalInvested: 0,
          activeBonds: 0,
          totalInterestYTD: 0,
          nextCouponPayment: {
            amount: 0,
            date: "Sin pagos próximos"
          },
          portfolioDistribution: {
            byIssuer: [],
            byIndustry: []
          },
          upcomingPayments: [],
          performanceMetrics: {
            averageTREA: 0,
            totalReturn: 0,
            ytdReturn: 0
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [user?.inversionistaProfile?.id])

  return { metrics, loading, error }
} 