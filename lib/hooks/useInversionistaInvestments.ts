import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

interface Investment {
  id: string
  bondId: string
  bondName: string
  bondCode: string
  emisor: {
    id: string
    companyName: string
    ruc: string
  }
  montoInvertido: number
  fechaInversion: string
  precioCompra: number
  status: 'ACTIVE' | 'MATURED' | 'DEFAULTED'
  gananciaNoRealizada: number
  rendimientoActual: number
  valorNominal: number
  tasaAnual: number
  frecuenciaCupon: string
  fechaVencimiento: string
  precioActual: number | null
  trea: number | null
  van: number | null
  duracion: number | null
  convexidad: number | null
}

export function useInversionistaInvestments() {
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!user?.inversionistaProfile?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/inversionista/${user.inversionistaProfile.id}/investments`)
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setInvestments(data.investments || [])
      } catch (err) {
        console.error('Error fetching investments:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchInvestments()
  }, [user?.inversionistaProfile?.id])

  return { investments, loading, error }
} 