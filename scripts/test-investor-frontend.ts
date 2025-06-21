#!/usr/bin/env tsx

import { PrismaClient } from '../lib/generated/client'
import { getCurrentDbConfig } from '../config/database'

// Configurar Prisma con la configuración correcta
const dbConfig = getCurrentDbConfig()
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbConfig.DATABASE_URL
    }
  }
})

async function testInvestorFrontend() {
  console.log('🧪 Probando Frontend del Inversionista...\n')

  try {
    // Verificar conexión a la base de datos
    console.log('🔌 Verificando conexión a la base de datos...')
    await prisma.$connect()
    console.log('✅ Conexión a la base de datos establecida')

    // 1. Verificar que hay inversionistas en el sistema
    console.log('\n1. Verificando inversionistas...')
    const inversionistas = await prisma.inversionistaProfile.findMany({
      include: {
        user: true
      }
    })
    
    if (inversionistas.length === 0) {
      console.log('❌ No hay inversionistas en el sistema')
      console.log('💡 Ejecuta primero: npm run test:investor-api')
      return
    }
    
    console.log(`✅ Encontrados ${inversionistas.length} inversionistas`)
    const testInversionista = inversionistas[0]
    console.log(`   - ${testInversionista.firstName} ${testInversionista.lastName} (${testInversionista.user.email})`)

    // 2. Verificar que hay bonos activos disponibles
    console.log('\n2. Verificando bonos disponibles...')
    const availableBonds = await prisma.bond.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        emisor: true
      }
    })
    
    if (availableBonds.length === 0) {
      console.log('❌ No hay bonos activos disponibles')
      console.log('💡 Ejecuta primero: npm run test:investor-api')
      return
    }
    
    console.log(`✅ Encontrados ${availableBonds.length} bonos activos`)
    const testBond = availableBonds[0]
    console.log(`   - ${testBond.name} (${testBond.codigoIsin})`)

    // 3. Verificar que hay inversiones existentes
    console.log('\n3. Verificando inversiones existentes...')
    const investments = await prisma.userInvestment.findMany({
      where: {
        userId: testInversionista.userId
      },
      include: {
        bond: {
          include: {
            emisor: true
          }
        }
      }
    })
    
    console.log(`✅ Encontradas ${investments.length} inversiones para ${testInversionista.firstName} ${testInversionista.lastName}`)
    
    if (investments.length > 0) {
      console.log('   Inversiones:')
      investments.forEach((inv: any) => {
        console.log(`   - ${inv.bond.name}: ${inv.montoInvertido} monto a ${inv.precioCompra}`)
      })
    }

    // 4. Probar endpoints del frontend (solo si el servidor está corriendo)
    console.log('\n4. Probando endpoints del frontend...')
    
    try {
      // Dashboard metrics
      console.log('   📊 Dashboard Metrics:')
      const metricsResponse = await fetch(`http://localhost:3000/api/inversionista/${testInversionista.id}/dashboard-metrics`)
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json()
        console.log(`   ✅ Total invertido: ${metrics.totalInvested}`)
        console.log(`   ✅ Bonos activos: ${metrics.activeBonds}`)
        console.log(`   ✅ Intereses YTD: ${metrics.totalInterestYTD}`)
      } else {
        console.log(`   ❌ Error: ${metricsResponse.status} - ${metricsResponse.statusText}`)
      }

      // Investments
      console.log('   💼 Investments:')
      const investmentsResponse = await fetch(`http://localhost:3000/api/inversionista/${testInversionista.id}/investments`)
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        console.log(`   ✅ ${investmentsData.investments.length} inversiones encontradas`)
      } else {
        console.log(`   ❌ Error: ${investmentsResponse.status} - ${investmentsResponse.statusText}`)
      }

      // Available bonds
      console.log('   🏦 Available Bonds:')
      const bondsResponse = await fetch('http://localhost:3000/api/inversionista/available-bonds')
      if (bondsResponse.ok) {
        const bondsData = await bondsResponse.json()
        console.log(`   ✅ ${bondsData.bonds.length} bonos disponibles`)
      } else {
        console.log(`   ❌ Error: ${bondsResponse.status} - ${bondsResponse.statusText}`)
      }

      // 5. Simular una nueva inversión
      console.log('\n5. Simulando nueva inversión...')
      const newInvestment = {
        inversionistaId: testInversionista.id,
        bondId: testBond.id,
        amount: 100,
        price: Number(testBond.valorComercial)
      }
      
      const investResponse = await fetch('http://localhost:3000/api/inversionista/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newInvestment)
      })
      
      if (investResponse.ok) {
        const investResult = await investResponse.json()
        console.log(`   ✅ Inversión creada: ${investResult.investmentId}`)
      } else {
        const error = await investResponse.json()
        console.log(`   ❌ Error: ${error.message}`)
      }

    } catch (error) {
      console.log('   ⚠️  No se pudieron probar los endpoints del frontend')
      console.log('   💡 Asegúrate de que el servidor esté corriendo: npm run dev')
      console.log(`   🔗 Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    console.log('\n🎉 Pruebas del frontend completadas!')
    console.log('\n📋 Resumen:')
    console.log(`   - Inversionistas: ${inversionistas.length}`)
    console.log(`   - Bonos activos: ${availableBonds.length}`)
    console.log(`   - Inversiones existentes: ${investments.length}`)
    console.log('\n🚀 El frontend del inversionista está listo para usar!')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('DATABASE_URL')) {
        console.log('\n💡 Solución:')
        console.log('   1. Asegúrate de tener un archivo .env con DATABASE_URL')
        console.log('   2. O ejecuta: export DATABASE_URL="postgresql://postgres:123456@localhost:5432/bonos_dev"')
        console.log('   3. O modifica config/database.ts para usar una URL por defecto')
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Solución:')
        console.log('   1. Asegúrate de que PostgreSQL esté corriendo')
        console.log('   2. Verifica que la base de datos exista')
        console.log('   3. Ejecuta las migraciones: npm run migrate')
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar las pruebas
testInvestorFrontend()
  .catch(console.error) 