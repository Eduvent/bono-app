#!/usr/bin/env tsx

/**
 * Script para probar las métricas del dashboard del inversionista
 * 
 * Uso:
 * npm run test:dashboard-metrics
 * 
 * Este script:
 * 1. Obtiene un inversionista de prueba
 * 2. Llama al endpoint de métricas del dashboard
 * 3. Muestra los KPIs calculados
 * 4. Verifica que los cálculos sean correctos
 */

import { PrismaClient, InvestmentStatus } from '../lib/generated/client'

const prisma = new PrismaClient()

async function testDashboardMetrics() {
  console.log('🧪 Probando métricas del dashboard del inversionista...\n')

  try {
    // 1. Obtener un inversionista de prueba
    const inversionista = await prisma.inversionistaProfile.findFirst({
      include: {
        user: true,
        investments: {
          include: {
            bond: {
              include: {
                emisor: true,
                financialMetrics: {
                  where: { role: 'BONISTA' }
                },
                cashFlows: {
                  where: {
                    cupon: { not: null },
                    periodo: { gt: 0 }
                  },
                  orderBy: { periodo: 'asc' }
                }
              }
            }
          },
          where: { status: InvestmentStatus.ACTIVE }
        }
      }
    })

    if (!inversionista) {
      console.log('❌ No se encontró ningún inversionista con inversiones activas')
      console.log('💡 Sugerencia: Ejecuta primero el script de inversión de prueba')
      return
    }

    console.log(`👤 Inversionista encontrado: ${inversionista.firstName} ${inversionista.lastName}`)
    console.log(`📊 Inversiones activas: ${inversionista.investments.length}\n`)

    // 2. Simular llamada al endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const url = `${baseUrl}/api/inversionista/${inversionista.id}/dashboard-metrics`
    
    console.log(`🌐 Llamando endpoint: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.log('❌ Error en la respuesta:', data)
      return
    }

    if (!data.success) {
      console.log('❌ Respuesta no exitosa:', data)
      return
    }

    // 3. Mostrar KPIs calculados
    console.log('📈 KPIs DEL DASHBOARD:')
    console.log('='.repeat(50))
    
    const kpis = data.kpis
    console.log(`💰 Total Invertido: $${kpis.totalInvested.toLocaleString()}`)
    console.log(`📊 Bonos Activos: ${kpis.activeInvestments}`)
    console.log(`💵 Intereses YTD: $${kpis.totalInterestYTD.toLocaleString()}`)
    console.log(`📈 Ganancia No Realizada: $${kpis.totalUnrealizedGain.toLocaleString()}`)
    console.log(`🎯 Retorno Promedio: ${kpis.averageReturn.toFixed(2)}%`)
    console.log(`⏱️ Duración Promedio: ${kpis.averageDuration.toFixed(2)} años`)
    console.log(`📊 Convexidad Promedio: ${kpis.averageConvexity.toFixed(2)}`)

    // 4. Mostrar próximos pagos
    console.log('\n📅 PRÓXIMOS PAGOS DE CUPÓN:')
    console.log('='.repeat(50))
    
    if (data.upcomingPayments.length > 0) {
      data.upcomingPayments.forEach((payment: any, index: number) => {
        console.log(`${index + 1}. ${payment.bondName} (${payment.emisor})`)
        console.log(`   💰 Cupón: $${payment.couponAmount.toLocaleString()}`)
        console.log(`   📅 Fecha: ${payment.nextPayment}`)
        console.log(`   ⏰ Días: ${payment.daysUntilPayment}`)
        console.log('')
      })
    } else {
      console.log('❌ No hay pagos próximos')
    }

    // 5. Mostrar distribución por emisor
    console.log('🏢 DISTRIBUCIÓN POR EMISOR:')
    console.log('='.repeat(50))
    
    if (data.distribution.byEmisor.length > 0) {
      data.distribution.byEmisor.forEach((emisor: any) => {
        const percentage = (emisor.totalInvested / kpis.totalInvested) * 100
        console.log(`📊 ${emisor.emisorName}: $${emisor.totalInvested.toLocaleString()} (${percentage.toFixed(1)}%)`)
      })
    } else {
      console.log('❌ No hay distribución por emisor')
    }

    // 6. Verificar cálculos
    console.log('\n🔍 VERIFICACIÓN DE CÁLCULOS:')
    console.log('='.repeat(50))
    
    // Verificar total invertido
    const calculatedTotal = inversionista.investments.reduce((sum, inv) => 
      sum + inv.montoInvertido.toNumber(), 0
    )
    console.log(`✅ Total Invertido calculado: $${calculatedTotal.toLocaleString()}`)
    console.log(`✅ Total Invertido del endpoint: $${kpis.totalInvested.toLocaleString()}`)
    console.log(`✅ Coincide: ${Math.abs(calculatedTotal - kpis.totalInvested) < 0.01 ? 'SÍ' : 'NO'}`)

    // Verificar intereses YTD
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31)
    
    let calculatedInterestYTD = 0
    inversionista.investments.forEach(investment => {
      const investedAmount = investment.montoInvertido.toNumber()
      const nominalValue = investment.bond.valorNominal.toNumber()
      
      const couponPayments = investment.bond.cashFlows.filter(flow => {
        const flowDate = new Date(flow.fecha)
        return flowDate >= yearStart && flowDate <= yearEnd && flow.cupon && flow.cupon.toNumber() > 0
      })
      
      const yearCoupons = couponPayments.reduce((sum, flow) => {
        const couponAmount = flow.cupon!.toNumber()
        const proportionalCoupon = (investedAmount / nominalValue) * couponAmount
        return sum + proportionalCoupon
      }, 0)
      
      calculatedInterestYTD += yearCoupons
    })
    
    console.log(`✅ Intereses YTD calculados: $${calculatedInterestYTD.toLocaleString()}`)
    console.log(`✅ Intereses YTD del endpoint: $${kpis.totalInterestYTD.toLocaleString()}`)
    console.log(`✅ Coincide: ${Math.abs(calculatedInterestYTD - kpis.totalInterestYTD) < 0.01 ? 'SÍ' : 'NO'}`)

    console.log('\n✅ Prueba completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testDashboardMetrics()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error fatal:', error)
      process.exit(1)
    })
}

export { testDashboardMetrics } 