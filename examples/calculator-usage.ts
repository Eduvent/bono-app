// examples/calculator-usage.ts

import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { CalculationInputs } from '@/lib/types/calculations';

/**
 * Ejemplo completo de uso del motor de cálculos financieros
 * Este archivo muestra cómo usar el calculador con datos reales
 */

async function ejemploCalculoBono() {
    console.log('🎯 Iniciando cálculo de bono con datos del Excel...\n');

    // 1. Configurar datos de entrada (idénticos al Excel)
    const inputs: CalculationInputs = {
        // Datos básicos del bono
        valorNominal: 1000.00,
        valorComercial: 1050.00,
        numAnios: 5,
        frecuenciaCupon: 'semestral',
        diasPorAno: 360,

        // Configuración financiera
        tipoTasa: 'efectiva',
        periodicidadCapitalizacion: 'bimestral',
        tasaAnual: 0.08, // 8%
        tasaDescuento: 0.045, // 4.5%
        impuestoRenta: 0.30, // 30%

        // Fecha de emisión
        fechaEmision: new Date('2025-06-01'),

        // Costes como porcentajes decimales
        primaPorcentaje: 0.01, // 1%
        estructuracionPorcentaje: 0.01, // 1%
        colocacionPorcentaje: 0.0025, // 0.25%
        flotacionPorcentaje: 0.0045, // 0.45%
        cavaliPorcentaje: 0.005, // 0.5%

        // Series por año (se expanden a períodos semestrales internamente)
        inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10], // 10% cada año
        graciaSerie: ['S', 'S', 'S', 'S', 'S'] // Sin gracia
    };

    // 2. Crear calculadora con configuración
    const calculator = new FinancialCalculator({
        validateInputs: true,
        includeIntermediateSteps: true,
        precision: {
            decimalPlaces: 6,
            tolerance: 1e-8
        }
    });

    try {
        console.log('⚙️ Ejecutando cálculos financieros...');
        const startTime = Date.now();

        // 3. Ejecutar cálculo completo
        const resultado = await calculator.calculate(inputs);

        const duration = Date.now() - startTime;
        console.log(`✅ Cálculos completados en ${duration}ms\n`);

        // 4. Mostrar resultados principales
        console.log('📊 RESULTADOS PRINCIPALES:');
        console.log('=' * 50);

        // Cálculos intermedios
        const { intermedios } = resultado;
        console.log('\n🔧 Cálculos Intermedios:');
        console.log(`  • Períodos por año: ${intermedios.periodosPorAno}`);
        console.log(`  • Total períodos: ${intermedios.totalPeriodos}`);
        console.log(`  • Tasa cupón periódica: ${(intermedios.tasaCuponPeriodica * 100).toFixed(3)}%`);
        console.log(`  • Tasa descuento periódica: ${(intermedios.tasaDescuentoPeriodica * 100).toFixed(3)}%`);
        console.log(`  • Costes iniciales emisor: $${intermedios.costesInicialesEmisor.toFixed(2)}`);
        console.log(`  • Costes iniciales bonista: $${intermedios.costesInicialesBonista.toFixed(2)}`);

        // Métricas financieras
        const { metricas } = resultado;
        console.log('\n💰 Métricas Financieras:');
        console.log(`  • Precio actual (VNA): $${metricas.precioActual.toFixed(2)}`);
        console.log(`  • Utilidad/Pérdida: $${metricas.utilidadPerdida.toFixed(2)}`);
        console.log(`  • Duración: ${metricas.duracion.toFixed(2)} años`);
        console.log(`  • Duración modificada: ${metricas.duracionModificada.toFixed(2)}`);
        console.log(`  • Convexidad: ${metricas.convexidad.toFixed(2)}`);
        console.log(`  • Total ratios decisión: ${metricas.totalRatiosDecision.toFixed(2)}`);

        // Tasas de retorno
        console.log('\n📈 Tasas de Retorno:');
        console.log(`  • TCEA Emisor: ${(metricas.tceaEmisor * 100).toFixed(3)}%`);
        console.log(`  • TCEA Emisor c/Escudo: ${(metricas.tceaEmisorConEscudo * 100).toFixed(3)}%`);
        console.log(`  • TREA Bonista: ${(metricas.treaBonista * 100).toFixed(3)}%`);

        // 5. Mostrar tabla de flujos (primeros y últimos períodos)
        console.log('\n📋 TABLA DE FLUJOS (Resumen):');
        console.log('=' * 80);
        console.log('Per | Fecha      | Bono Index | Cupón    | Amort.   | Flujo Emis | Flujo Bon');
        console.log('-' * 80);

        // Período 0
        const p0 = resultado.flujos[0];
        console.log(`${p0.periodo.toString().padStart(3)} | ${formatDate(p0.fecha)} | ${formatMoney(p0.bonoIndexado)} | ${formatMoney(p0.cupon)} | ${formatMoney(p0.amortizacion)} | ${formatMoney(p0.flujoEmisor)} | ${formatMoney(p0.flujoBonista)}`);

        // Primeros 3 períodos
        for (let i = 1; i <= 3; i++) {
            const p = resultado.flujos[i];
            console.log(`${p.periodo.toString().padStart(3)} | ${formatDate(p.fecha)} | ${formatMoney(p.bonoIndexado)} | ${formatMoney(p.cupon)} | ${formatMoney(p.amortizacion)} | ${formatMoney(p.flujoEmisor)} | ${formatMoney(p.flujoBonista)}`);
        }

        console.log('... | ...        | ...      | ...      | ...      | ...        | ...');

        // Últimos 2 períodos
        for (let i = Math.max(4, resultado.flujos.length - 2); i < resultado.flujos.length; i++) {
            const p = resultado.flujos[i];
            console.log(`${p.periodo.toString().padStart(3)} | ${formatDate(p.fecha)} | ${formatMoney(p.bonoIndexado)} | ${formatMoney(p.cupon)} | ${formatMoney(p.amortizacion)} | ${formatMoney(p.flujoEmisor)} | ${formatMoney(p.flujoBonista)}`);
        }

        // 6. Validar contra valores esperados del Excel
        console.log('\n✅ VALIDACIÓN CONTRA EXCEL:');
        console.log('=' * 40);

        const validations = [
            { name: 'Precio Actual', calculated: metricas.precioActual, expected: 1753.34, tolerance: 1 },
            { name: 'Duración', calculated: metricas.duracion, expected: 4.45, tolerance: 0.01 },
            { name: 'Convexidad', calculated: metricas.convexidad, expected: 22.39, tolerance: 0.1 },
            { name: 'TCEA Emisor', calculated: metricas.tceaEmisor * 100, expected: 18.45, tolerance: 0.1 },
            { name: 'TREA Bonista', calculated: metricas.treaBonista * 100, expected: 17.56, tolerance: 0.1 }
        ];

        validations.forEach(({ name, calculated, expected, tolerance }) => {
            const diff = Math.abs(calculated - expected);
            const isValid = diff <= tolerance;
            const status = isValid ? '✅' : '❌';
            console.log(`${status} ${name}: ${calculated.toFixed(2)} (esperado: ${expected}) [diff: ${diff.toFixed(4)}]`);
        });

        // 7. Mostrar información de roles
        console.log('\n👥 VISTA POR ROLES:');
        console.log('=' * 30);

        console.log('\n🏢 EMISOR ve:');
        console.log(`  • Flujos de emisión (M): ${resultado.flujos.slice(1, 4).map(f => formatMoney(f.flujoEmisor)).join(', ')}...`);
        console.log(`  • Flujos con escudo (N): ${resultado.flujos.slice(1, 4).map(f => formatMoney(f.flujoEmisorConEscudo)).join(', ')}...`);
        console.log(`  • TCEA sin escudo: ${(metricas.tceaEmisor * 100).toFixed(2)}%`);
        console.log(`  • TCEA con escudo: ${(metricas.tceaEmisorConEscudo * 100).toFixed(2)}%`);

        console.log('\n💼 INVERSIONISTA ve:');
        console.log(`  • Flujos de inversión (O): ${resultado.flujos.slice(1, 4).map(f => formatMoney(f.flujoBonista)).join(', ')}...`);
        console.log(`  • Flujos actualizados (P): ${resultado.flujos.slice(1, 4).map(f => formatMoney(f.flujoActualizado)).join(', ')}...`);
        console.log(`  • TREA: ${(metricas.treaBonista * 100).toFixed(2)}%`);
        console.log(`  • VAN: $${metricas.precioActual.toFixed(2)}`);

        console.log('\n🎉 ¡Cálculo completado exitosamente!');

        return resultado;

    } catch (error) {
        console.error('❌ Error en cálculo:', error);
        throw error;
    }
}

/**
 * Ejemplo de cálculo rápido (solo métricas principales)
 */
async function ejemploCalculoRapido() {
    console.log('\n⚡ Ejecutando cálculo rápido (solo métricas)...');

    const inputs: CalculationInputs = {
        valorNominal: 1000,
        valorComercial: 1000, // Al par
        numAnios: 3,
        frecuenciaCupon: 'semestral',
        diasPorAno: 360,
        tipoTasa: 'efectiva',
        periodicidadCapitalizacion: 'semestral',
        tasaAnual: 0.06, // 6%
        tasaDescuento: 0.05, // 5%
        impuestoRenta: 0.28, // 28%
        fechaEmision: new Date(),
        primaPorcentaje: 0,
        estructuracionPorcentaje: 0.005, // 0.5%
        colocacionPorcentaje: 0.002, // 0.2%
        flotacionPorcentaje: 0.003, // 0.3%
        cavaliPorcentaje: 0.004, // 0.4%
        inflacionSerie: [0.05, 0.05, 0.05], // 5% anual
        graciaSerie: ['S', 'S', 'S']
    };

    const calculator = new FinancialCalculator();
    const metricas = await calculator.calculateQuickMetrics(inputs);

    console.log('📊 Métricas rápidas:');
    console.log(`  • TREA: ${(metricas.treaBonista * 100).toFixed(2)}%`);
    console.log(`  • Duración: ${metricas.duracion.toFixed(2)} años`);
    console.log(`  • VAN: $${metricas.precioActual.toFixed(2)}`);
}

/**
 * Funciones de utilidad para formato
 */
function formatMoney(value: number | null): string {
    if (value === null) return '   -   ';
    return value.toFixed(2).padStart(8);
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Ejecutar ejemplos si se llama directamente
 */
if (require.main === module) {
    (async () => {
        try {
            await ejemploCalculoBono();
            await ejemploCalculoRapido();
        } catch (error) {
            console.error('Error en ejemplos:', error);
            process.exit(1);
        }
    })();
}

export { ejemploCalculoBono, ejemploCalculoRapido };