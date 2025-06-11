// scripts/calculate-bonds.ts

import { PrismaClient } from '../lib/generated/client'
import { BondCalculationsService } from '@/lib/services/bonds/BondCalculations';
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { CalculationInputs } from '@/lib/types/calculations';

const prisma = new PrismaClient();

interface BenchmarkOptions {
    bondIds?: string[];
    calculateAll?: boolean;
    parallel?: boolean;
    batchSize?: number;
    validateResults?: boolean;
    exportResults?: boolean;
    compareWithExcel?: boolean;
}

interface BenchmarkResult {
    bondId: string;
    bondName: string;
    success: boolean;
    calculationTime: number;
    flowsCount: number;
    metricas?: any;
    errors?: string[];
}

interface BenchmarkSummary {
    totalBonds: number;
    successCount: number;
    errorCount: number;
    averageTime: number;
    totalTime: number;
    fastestCalculation: number;
    slowestCalculation: number;
    results: BenchmarkResult[];
}

async function runBenchmark(options: BenchmarkOptions = {}): Promise<BenchmarkSummary> {
    const {
        bondIds,
        calculateAll = false,
        parallel = false,
        batchSize = 5,
        validateResults = true,
        exportResults = false,
        compareWithExcel = false
    } = options;

    console.log('🚀 Iniciando benchmark de cálculos financieros...\n');

    const calculationsService = new BondCalculationsService(prisma);
    const results: BenchmarkResult[] = [];

    try {
        // 1. Obtener lista de bonos a calcular
        let targetBonds: string[];

        if (bondIds && bondIds.length > 0) {
            targetBonds = bondIds;
            console.log(`📋 Calculando ${bondIds.length} bonos específicos...`);
        } else if (calculateAll) {
            const bonds = await prisma.bond.findMany({
                where: {
                    status: { in: ['DRAFT', 'ACTIVE'] }
                },
                select: { id: true, name: true }
            });
            targetBonds = bonds.map(b => b.id);
            console.log(`📋 Calculando todos los bonos (${bonds.length})...`);
        } else {
            // Solo bonos que necesitan recálculo
            const bonds = await prisma.bond.findMany({
                where: {
                    status: { in: ['DRAFT', 'ACTIVE'] },
                    OR: [
                        { financialMetrics: { none: {} } },
                        { cashFlows: { none: {} } }
                    ]
                },
                select: { id: true, name: true }
            });
            targetBonds = bonds.map(b => b.id);
            console.log(`📋 Calculando bonos que necesitan cálculo (${bonds.length})...`);
        }

        if (targetBonds.length === 0) {
            console.log('ℹ️ No hay bonos para calcular');
            return {
                totalBonds: 0,
                successCount: 0,
                errorCount: 0,
                averageTime: 0,
                totalTime: 0,
                fastestCalculation: 0,
                slowestCalculation: 0,
                results: []
            };
        }

        // 2. Ejecutar cálculos
        const startTime = Date.now();

        if (parallel) {
            console.log(`⚡ Ejecutando cálculos en paralelo (batches de ${batchSize})...\n`);
            await calculateBondsParallel(targetBonds, calculationsService, results, batchSize);
        } else {
            console.log('🔄 Ejecutando cálculos secuencialmente...\n');
            await calculateBondsSequential(targetBonds, calculationsService, results);
        }

        const totalTime = Date.now() - startTime;

        // 3. Calcular estadísticas
        const successResults = results.filter(r => r.success);
        const errorResults = results.filter(r => !r.success);

        const times = successResults.map(r => r.calculationTime);
        const averageTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const fastestCalculation = times.length > 0 ? Math.min(...times) : 0;
        const slowestCalculation = times.length > 0 ? Math.max(...times) : 0;

        const summary: BenchmarkSummary = {
            totalBonds: targetBonds.length,
            successCount: successResults.length,
            errorCount: errorResults.length,
            averageTime,
            totalTime,
            fastestCalculation,
            slowestCalculation,
            results
        };

        // 4. Mostrar resumen
        printBenchmarkSummary(summary);

        // 5. Validar resultados si se solicita
        if (validateResults && successResults.length > 0) {
            console.log('\n🔍 Validando resultados...');
            await validateCalculationResults(successResults);
        }

        // 6. Comparar con Excel si se solicita
        if (compareWithExcel && successResults.length > 0) {
            console.log('\n📊 Comparando con valores de Excel...');
            await compareWithExcelResults(successResults);
        }

        // 7. Exportar resultados si se solicita
        if (exportResults) {
            console.log('\n💾 Exportando resultados...');
            await exportBenchmarkResults(summary);
        }

        return summary;

    } catch (error) {
        console.error('❌ Error en benchmark:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Calcular bonos en paralelo
 */
async function calculateBondsParallel(
    bondIds: string[],
    service: BondCalculationsService,
    results: BenchmarkResult[],
    batchSize: number
) {
    for (let i = 0; i < bondIds.length; i += batchSize) {
        const batch = bondIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async bondId => {
            return await calculateSingleBond(bondId, service);
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
                console.log(`✅ ${result.value.bondName}: ${result.value.calculationTime}ms`);
            } else {
                results.push({
                    bondId: batch[index],
                    bondName: 'Unknown',
                    success: false,
                    calculationTime: 0,
                    flowsCount: 0,
                    errors: [result.reason?.message || 'Error desconocido']
                });
                console.log(`❌ ${batch[index]}: Error`);
            }
        });

        // Mostrar progreso
        const completed = Math.min(i + batchSize, bondIds.length);
        console.log(`📊 Progreso: ${completed}/${bondIds.length} (${Math.round(completed/bondIds.length*100)}%)\n`);
    }
}

/**
 * Calcular bonos secuencialmente
 */
async function calculateBondsSequential(
    bondIds: string[],
    service: BondCalculationsService,
    results: BenchmarkResult[]
) {
    for (let i = 0; i < bondIds.length; i++) {
        try {
            const result = await calculateSingleBond(bondIds[i], service);
            results.push(result);

            console.log(`${i + 1}/${bondIds.length} ✅ ${result.bondName}: ${result.calculationTime}ms`);
        } catch (error) {
            results.push({
                bondId: bondIds[i],
                bondName: 'Unknown',
                success: false,
                calculationTime: 0,
                flowsCount: 0,
                errors: [error instanceof Error ? error.message : 'Error desconocido']
            });

            console.log(`${i + 1}/${bondIds.length} ❌ ${bondIds[i]}: Error`);
        }
    }
}

/**
 * Calcular un solo bono y medir tiempo
 */
async function calculateSingleBond(
    bondId: string,
    service: BondCalculationsService
): Promise<BenchmarkResult> {
    // Obtener nombre del bono
    const bond = await prisma.bond.findUnique({
        where: { id: bondId },
        select: { name: true }
    });

    const bondName = bond?.name || 'Unknown';
    const startTime = Date.now();

    try {
        const result = await service.calculateBond({
            bondId,
            recalculate: true,
            saveResults: true
        });

        const calculationTime = Date.now() - startTime;

        return {
            bondId,
            bondName,
            success: result.success,
            calculationTime,
            flowsCount: result.flowsCount,
            metricas: result.metricas,
            errors: result.errors
        };

    } catch (error) {
        return {
            bondId,
            bondName,
            success: false,
            calculationTime: Date.now() - startTime,
            flowsCount: 0,
            errors: [error instanceof Error ? error.message : 'Error desconocido']
        };
    }
}

/**
 * Mostrar resumen del benchmark
 */
function printBenchmarkSummary(summary: BenchmarkSummary) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DEL BENCHMARK');
    console.log('='.repeat(60));

    console.log(`\n📈 Estadísticas Generales:`);
    console.log(`  • Total de bonos: ${summary.totalBonds}`);
    console.log(`  • Éxitos: ${summary.successCount} (${Math.round(summary.successCount/summary.totalBonds*100)}%)`);
    console.log(`  • Errores: ${summary.errorCount} (${Math.round(summary.errorCount/summary.totalBonds*100)}%)`);
    console.log(`  • Tiempo total: ${(summary.totalTime/1000).toFixed(2)}s`);

    if (summary.successCount > 0) {
        console.log(`\n⏱️ Performance:`);
        console.log(`  • Tiempo promedio: ${summary.averageTime.toFixed(0)}ms`);
        console.log(`  • Cálculo más rápido: ${summary.fastestCalculation}ms`);
        console.log(`  • Cálculo más lento: ${summary.slowestCalculation}ms`);
        console.log(`  • Throughput: ${(summary.successCount / (summary.totalTime/1000)).toFixed(2)} bonos/segundo`);
    }

    // Mostrar errores si los hay
    if (summary.errorCount > 0) {
        console.log(`\n❌ Errores:`);
        const errorResults = summary.results.filter(r => !r.success);
        errorResults.forEach(result => {
            console.log(`  • ${result.bondName}: ${result.errors?.join(', ')}`);
        });
    }

    // Top 5 más rápidos y más lentos
    if (summary.successCount > 1) {
        const successResults = summary.results.filter(r => r.success);

        console.log(`\n🏃‍♂️ Top 5 Más Rápidos:`);
        successResults
            .sort((a, b) => a.calculationTime - b.calculationTime)
            .slice(0, 5)
            .forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.bondName}: ${result.calculationTime}ms`);
            });

        console.log(`\n🐌 Top 5 Más Lentos:`);
        successResults
            .sort((a, b) => b.calculationTime - a.calculationTime)
            .slice(0, 5)
            .forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.bondName}: ${result.calculationTime}ms`);
            });
    }
}

/**
 * Validar resultados de cálculos
 */
async function validateCalculationResults(results: BenchmarkResult[]) {
    let validationErrors = 0;

    for (const result of results) {
        try {
            // Validar métricas básicas
            const { metricas } = result;

            if (!metricas) {
                console.log(`⚠️ ${result.bondName}: Sin métricas`);
                validationErrors++;
                continue;
            }

            // Validar rangos de TIR/TCEA/TREA
            const emisorTCEA = metricas.emisor?.tceaEmisor || 0;
            const bonistaTREA = metricas.bonista?.treaBonista || 0;

            if (emisorTCEA < 0 || emisorTCEA > 1) {
                console.log(`⚠️ ${result.bondName}: TCEA emisor fuera de rango (${emisorTCEA})`);
                validationErrors++;
            }

            if (bonistaTREA < 0 || bonistaTREA > 1) {
                console.log(`⚠️ ${result.bondName}: TREA bonista fuera de rango (${bonistaTREA})`);
                validationErrors++;
            }

            // Validar duración
            const duracion = metricas.emisor?.duracion || 0;
            if (duracion < 0 || duracion > 50) {
                console.log(`⚠️ ${result.bondName}: Duración fuera de rango (${duracion})`);
                validationErrors++;
            }

            // Validar flujos
            if (result.flowsCount === 0) {
                console.log(`⚠️ ${result.bondName}: Sin flujos de caja`);
                validationErrors++;
            }

        } catch (error) {
            console.log(`❌ ${result.bondName}: Error en validación - ${error}`);
            validationErrors++;
        }
    }

    if (validationErrors === 0) {
        console.log('✅ Todos los resultados pasaron la validación');
    } else {
        console.log(`⚠️ ${validationErrors} resultados con problemas de validación`);
    }
}

/**
 * Comparar con valores esperados del Excel
 */
async function compareWithExcelResults(results: BenchmarkResult[]) {
    // Valores esperados del Excel de ejemplo
    const expectedValues = {
        'Bono VAC - Americano Ejemplo': {
            tceaEmisor: 0.1845033,
            treaBonista: 0.1755812,
            duracion: 4.45,
            convexidad: 22.39,
            precioActual: 1753.34
        }
    };

    let comparisons = 0;
    let matches = 0;

    for (const result of results) {
        const expected = expectedValues[result.bondName as keyof typeof expectedValues];
        if (!expected || !result.metricas) continue;

        comparisons++;
        const { metricas } = result;
        const tolerance = 0.001; // 0.1% tolerancia

        let bondMatches = 0;
        let totalChecks = 0;

        // Comparar TCEA emisor
        const tceaDiff = Math.abs(metricas.emisor.tceaEmisor - expected.tceaEmisor);
        totalChecks++;
        if (tceaDiff <= tolerance) bondMatches++;
        else console.log(`  ⚠️ TCEA Emisor: ${metricas.emisor.tceaEmisor.toFixed(6)} vs esperado ${expected.tceaEmisor.toFixed(6)}`);

        // Comparar TREA bonista
        const treaDiff = Math.abs(metricas.bonista.treaBonista - expected.treaBonista);
        totalChecks++;
        if (treaDiff <= tolerance) bondMatches++;
        else console.log(`  ⚠️ TREA Bonista: ${metricas.bonista.treaBonista.toFixed(6)} vs esperado ${expected.treaBonista.toFixed(6)}`);

        // Comparar duración
        const duracionDiff = Math.abs(metricas.emisor.duracion - expected.duracion);
        totalChecks++;
        if (duracionDiff <= 0.01) bondMatches++;
        else console.log(`  ⚠️ Duración: ${metricas.emisor.duracion.toFixed(2)} vs esperado ${expected.duracion.toFixed(2)}`);

        if (bondMatches === totalChecks) {
            console.log(`✅ ${result.bondName}: Coincide con Excel`);
            matches++;
        } else {
            console.log(`⚠️ ${result.bondName}: ${bondMatches}/${totalChecks} métricas coinciden`);
        }
    }

    if (comparisons === 0) {
        console.log('ℹ️ No hay bonos para comparar con Excel');
    } else {
        console.log(`\n📊 Comparación con Excel: ${matches}/${comparisons} bonos coinciden completamente`);
    }
}

/**
 * Exportar resultados del benchmark
 */
async function exportBenchmarkResults(summary: BenchmarkSummary) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;

    try {
        const fs = await import('fs/promises');
        await fs.writeFile(filename, JSON.stringify(summary, null, 2));
        console.log(`✅ Resultados exportados a: ${filename}`);
    } catch (error) {
        console.log(`❌ Error exportando resultados: ${error}`);
    }
}

/**
 * Función principal
 */
async function main() {
    const args = process.argv.slice(2);

    // Parsear argumentos
    const options: BenchmarkOptions = {
        calculateAll: args.includes('--all'),
        parallel: args.includes('--parallel'),
        batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '5'),
        validateResults: !args.includes('--no-validate'),
        exportResults: args.includes('--export'),
        compareWithExcel: args.includes('--compare-excel'),
    };

    // Bondos específicos
    const bondIdsArg = args.find(arg => arg.startsWith('--bonds='));
    if (bondIdsArg) {
        options.bondIds = bondIdsArg.split('=')[1].split(',');
    }

    // Mostrar ayuda
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🧮 Script de Benchmark de Cálculos Financieros

Uso: npm run calculate:bonds [opciones]

Opciones:
  --all                 Calcular todos los bonos
  --bonds=id1,id2,...   Calcular bonos específicos
  --parallel            Ejecutar cálculos en paralelo
  --batch-size=N        Tamaño de batch para paralelo (default: 5)
  --no-validate         No validar resultados
  --export              Exportar resultados a JSON
  --compare-excel       Comparar con valores del Excel
  --help, -h            Mostrar esta ayuda

Ejemplos:
  npm run calculate:bonds --all                     # Calcular todos los bonos
  npm run calculate:bonds --parallel --batch-size=3 # Paralelo con batches de 3
  npm run calculate:bonds --bonds=abc123,def456     # Bonos específicos
  npm run calculate:bonds --export --compare-excel  # Con validación completa
    `);
        process.exit(0);
    }

    // Ejecutar benchmark
    const startTime = Date.now();
    const summary = await runBenchmark(options);
    const totalDuration = Date.now() - startTime;

    console.log(`\n🎉 Benchmark completado en ${(totalDuration/1000).toFixed(2)}s`);

    // Exit code basado en resultados
    process.exit(summary.errorCount > 0 ? 1 : 0);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

export { runBenchmark, calculateSingleBond };