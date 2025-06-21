import { PrismaClient } from '../lib/generated/client';

const prisma = new PrismaClient();

async function testDashboardMetrics() {
  try {
    console.log('🧪 Probando endpoint de métricas del dashboard...');

    // 1. Obtener un emisor de prueba
    const emisor = await prisma.emisorProfile.findFirst({
      select: { id: true, companyName: true },
    });

    if (!emisor) {
      console.log('❌ No se encontró ningún emisor en la base de datos');
      return;
    }

    console.log('✅ Emisor encontrado:', emisor.companyName);

    // 2. Obtener bonos del emisor
    const bonds = await prisma.bond.findMany({
      where: { emisorId: emisor.id },
      include: {
        financialMetrics: {
          select: {
            tcea: true,
            van: true,
            duracion: true,
          },
        },
        cashFlows: {
          select: {
            cupon: true,
            fecha: true,
            periodo: true,
          },
          orderBy: { periodo: 'asc' }
        }
      },
    });

    console.log('📊 Bonos encontrados:', bonds.length);

    // 3. Calcular métricas manualmente
    const activeBonds = bonds.filter(bond => bond.status === 'ACTIVE');
    const activeBondsCount = activeBonds.length;

    const totalNominalValue = activeBonds.reduce((sum, bond) =>
      sum + bond.valorNominal.toNumber(), 0
    );

    const currentYear = new Date().getFullYear();
    let interestPaidYTD = 0;

    for (const bond of activeBonds) {
      if (bond.cashFlows.length > 0) {
        const ytdCoupons = bond.cashFlows
          .filter(flow => {
            const flowYear = new Date(flow.fecha).getFullYear();
            return flowYear === currentYear && flow.cupon && flow.periodo > 0;
          })
          .reduce((sum, flow) => sum + (flow.cupon?.toNumber() || 0), 0);

        interestPaidYTD += ytdCoupons;
      } else {
        const estimatedAnnualInterest = bond.valorNominal.toNumber() * bond.tasaAnual.toNumber();
        const monthsPassed = new Date().getMonth() + 1;
        interestPaidYTD += (estimatedAnnualInterest * monthsPassed) / 12;
      }
    }

    let nextPaymentAmount = 0;
    let nextPaymentDate: Date | null = null;

    const now = new Date();
    for (const bond of activeBonds) {
      if (bond.cashFlows.length > 0) {
        const nextCoupon = bond.cashFlows
          .filter(flow => new Date(flow.fecha) > now && flow.cupon && flow.periodo > 0)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

        if (nextCoupon) {
          nextPaymentAmount += nextCoupon.cupon?.toNumber() || 0;

          const couponDate = new Date(nextCoupon.fecha);
          if (!nextPaymentDate || couponDate < nextPaymentDate) {
            nextPaymentDate = couponDate;
          }
        }
      } else {
        const estimatedCoupon = bond.valorNominal.toNumber() * bond.tasaAnual.toNumber() * 0.5;
        nextPaymentAmount += estimatedCoupon;
      }
    }

    if (!nextPaymentDate && activeBondsCount > 0) {
      nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 6);
    }

    // 4. Mostrar resultados
    console.log('\n📈 Métricas calculadas:');
    console.log('Total bonos:', bonds.length);
    console.log('Bonos activos:', activeBondsCount);
    console.log('Total nominal:', totalNominalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
    console.log('Intereses YTD:', interestPaidYTD.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
    console.log('Próximo pago:', nextPaymentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
    console.log('Fecha próximo pago:', nextPaymentDate?.toISOString().split('T')[0] || 'N/A');

    // 5. Verificar datos de bonos
    console.log('\n🔍 Detalles de bonos:');
    bonds.forEach((bond, index) => {
      console.log(`${index + 1}. ${bond.name} (${bond.status})`);
      console.log(`   Nominal: ${bond.valorNominal.toNumber().toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
      console.log(`   Flujos: ${bond.cashFlows.length}`);
      console.log(`   TCEA: ${bond.financialMetrics[0]?.tcea?.toNumber() || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testDashboardMetrics(); 