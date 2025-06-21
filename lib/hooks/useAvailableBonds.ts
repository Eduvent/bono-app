import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

interface AvailableBond {
  id: string
  name: string
  isinCode: string
  issuerName: string
  issuerIndustry: string
  nominalValue: number
  commercialPrice: number
  couponRate: number
  maturityDate: string
  estimatedTREA: number
  issueDate: string
  paymentFrequency: string
  rateType: string
  inflationIndexed: boolean
  availableAmount: number
}

interface AvailableBondsFilters {
  couponRateRange?: string
  maturityRange?: string
  issuerType?: string
  searchTerm?: string
  sortBy?: 'couponRate' | 'maturityDate' | 'estimatedTREA' | 'nominalValue'
  sortOrder?: 'asc' | 'desc'
}

export function useAvailableBonds(filters: AvailableBondsFilters = {}) {
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })
  const [bonds, setBonds] = useState<AvailableBond[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBonds = useCallback(async () => {
    if (!user?.inversionistaProfile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      
      queryParams.append('inversionistaId', user.inversionistaProfile.id)
      
      if (filters.couponRateRange) queryParams.append('couponRateRange', filters.couponRateRange)
      if (filters.maturityRange) queryParams.append('maturityRange', filters.maturityRange)
      if (filters.issuerType) queryParams.append('issuerType', filters.issuerType)
      if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm)
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy)
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder)

      const url = `/api/inversionista/available-bonds${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setBonds(data.bonds || [])
    } catch (err) {
      console.error('Error fetching available bonds:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [
    user?.inversionistaProfile?.id,
    filters.couponRateRange,
    filters.maturityRange,
    filters.issuerType,
    filters.searchTerm,
    filters.sortBy,
    filters.sortOrder
  ])

  useEffect(() => {
    fetchBonds()
  }, [fetchBonds])

  return { bonds, loading, error, refetch: fetchBonds }
} 