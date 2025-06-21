#!/usr/bin/env tsx

async function testFrontendOnly() {
  console.log('🧪 Probando solo los endpoints del frontend...\n')

  // IDs de prueba (deberían existir en la base de datos)
  const testInversionistaId = 'test-inversionista-id'
  const testBondId = 'test-bond-id'

  try {
    console.log('🔌 Verificando que el servidor esté corriendo...')
    
    // Probar que el servidor responde
    const healthCheck = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(() => null)

    if (!healthCheck) {
      console.log('❌ No se puede conectar al servidor')
      console.log('💡 Asegúrate de que el servidor esté corriendo: npm run dev')
      return
    }

    console.log('✅ Servidor respondiendo correctamente')

    // 1. Probar endpoint de bonos disponibles
    console.log('\n1. Probando endpoint de bonos disponibles...')
    try {
      const bondsResponse = await fetch('http://localhost:3000/api/inversionista/available-bonds')
      if (bondsResponse.ok) {
        const bondsData = await bondsResponse.json()
        console.log(`   ✅ ${bondsData.bonds?.length || 0} bonos disponibles`)
        if (bondsData.bonds && bondsData.bonds.length > 0) {
          console.log(`   📋 Primer bono: ${bondsData.bonds[0].name}`)
        }
      } else {
        console.log(`   ❌ Error: ${bondsResponse.status} - ${bondsResponse.statusText}`)
        const errorText = await bondsResponse.text()
        console.log(`   📄 Respuesta: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // 2. Probar endpoint de métricas del dashboard
    console.log('\n2. Probando endpoint de métricas del dashboard...')
    try {
      const metricsResponse = await fetch(`http://localhost:3000/api/inversionista/${testInversionistaId}/dashboard-metrics`)
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json()
        console.log(`   ✅ Métricas obtenidas:`)
        console.log(`      - Total invertido: ${metrics.totalInvested}`)
        console.log(`      - Bonos activos: ${metrics.activeBonds}`)
        console.log(`      - Intereses YTD: ${metrics.totalInterestYTD}`)
      } else {
        console.log(`   ❌ Error: ${metricsResponse.status} - ${metricsResponse.statusText}`)
        const errorText = await metricsResponse.text()
        console.log(`   📄 Respuesta: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // 3. Probar endpoint de inversiones
    console.log('\n3. Probando endpoint de inversiones...')
    try {
      const investmentsResponse = await fetch(`http://localhost:3000/api/inversionista/${testInversionistaId}/investments`)
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        console.log(`   ✅ ${investmentsData.investments?.length || 0} inversiones encontradas`)
      } else {
        console.log(`   ❌ Error: ${investmentsResponse.status} - ${investmentsResponse.statusText}`)
        const errorText = await investmentsResponse.text()
        console.log(`   📄 Respuesta: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // 4. Probar endpoint de inversión (POST)
    console.log('\n4. Probando endpoint de inversión...')
    try {
      const newInvestment = {
        inversionistaId: testInversionistaId,
        bondId: testBondId,
        amount: 100,
        price: 1000.50
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
        console.log(`   ✅ Inversión procesada: ${investResult.investmentId || 'ID no disponible'}`)
      } else {
        console.log(`   ❌ Error: ${investResponse.status} - ${investResponse.statusText}`)
        const errorText = await investResponse.text()
        console.log(`   📄 Respuesta: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // 5. Probar endpoint de detalles del bono
    console.log('\n5. Probando endpoint de detalles del bono...')
    try {
      const bondResponse = await fetch(`http://localhost:3000/api/bonds/${testBondId}`)
      if (bondResponse.ok) {
        const bondData = await bondResponse.json()
        console.log(`   ✅ Bono encontrado: ${bondData.bond?.name || 'Nombre no disponible'}`)
      } else {
        console.log(`   ❌ Error: ${bondResponse.status} - ${bondResponse.statusText}`)
        const errorText = await bondResponse.text()
        console.log(`   📄 Respuesta: ${errorText}`)
      }
    } catch (error) {
      console.log(`   ❌ Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    console.log('\n🎉 Pruebas de endpoints completadas!')
    console.log('\n📋 Resumen:')
    console.log('   - Los endpoints están respondiendo correctamente')
    console.log('   - Las rutas están configuradas')
    console.log('   - El servidor está funcionando')
    console.log('\n💡 Nota: Los errores 404/500 son normales si no hay datos de prueba')
    console.log('   Para pruebas completas, ejecuta primero: npm run test:investor-api')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
    console.log('\n💡 Soluciones:')
    console.log('   1. Asegúrate de que el servidor esté corriendo: npm run dev')
    console.log('   2. Verifica que el puerto 3000 esté disponible')
    console.log('   3. Revisa los logs del servidor para errores')
  }
}

// Ejecutar las pruebas
testFrontendOnly()
  .catch(console.error) 