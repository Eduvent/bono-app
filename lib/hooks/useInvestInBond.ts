import { useState } from 'react'
import { useAuth } from './useAuth'

interface InvestmentRequest {
  bondId: string
  amount: number // Este será el valor nominal del bono
  price: number
}

interface InvestmentResponse {
  success: boolean
  investmentId?: string
  message: string
  errors?: string[]
}

export function useInvestInBond() {
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const investInBond = async (investmentData: InvestmentRequest): Promise<InvestmentResponse> => {
    if (!user?.inversionistaProfile?.id) {
      return {
        success: false,
        message: 'Usuario no autenticado'
      }
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/inversionista/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inversionistaId: user.inversionistaProfile.id,
          bondId: investmentData.bondId,
          montoInvertido: investmentData.amount,
          precioCompra: investmentData.price,
          fechaInversion: new Date().toISOString()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`)
      }

      return {
        success: true,
        investmentId: data.investmentId,
        message: data.message || 'Inversión realizada exitosamente'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      return {
        success: false,
        message: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }

  return { investInBond, loading, error }
} 