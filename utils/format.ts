export const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (dateString: string | null | undefined) => {
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

export const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A"
  return `${(value * 100).toFixed(3)}%`
}

export const formatNumber = (value: number | null | undefined, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return "N/A"
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const formatDuration = (years: number | null | undefined) => {
  if (years === null || years === undefined || isNaN(years)) return "N/A"
  return `${years.toFixed(2)} años`
}