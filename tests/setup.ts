// tests/setup.ts

import { PrismaClient } from '../lib/generated/client'
import { Decimal } from 'decimal.js';
import 'source-map-support/register'
// 🔧 Configuración de Source Maps y Stack Trace
Error.stackTraceLimit = 10;

// Guardar la función original de preparación de stack trace
const origPrepare = Error.prepareStackTrace;

// Filtrar frames de librerías para mostrar solo nuestro código
Error.prepareStackTrace = (err, frames) => {
    if (!origPrepare) {
        return err.stack;
    }

    const filtered = frames.filter(f => {
        const file = f.getFileName() || '';
        // Filtrar node_modules de Prisma y otras librerías
        return !/node_modules[\/\\]\.prisma/.test(file) &&
            !/node_modules[\/\\]jest/.test(file) &&
            !/node_modules[\/\\]@jest/.test(file);
    });

    return origPrepare(err, filtered);
};

// Tu configuración existente de tests...
console.log('🧪 Configuración de tests cargada');

// Resto del contenido actual de tu setup.ts
/**
 * Configuración global para tests
 * Se ejecuta antes de todos los tests
 */

// Configurar Decimal.js para consistencia en tests
Decimal.set({
    precision: 10,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: -9e15,
    toExpPos: 9e15,
    maxE: 9e15,
    minE: -9e15,
});

// Variables globales para tests
declare global {
    var __PRISMA_CLIENT__: PrismaClient | undefined;
    var __TEST_DATABASE_URL__: string | undefined;
}

// Cliente de Prisma para tests
let prisma: PrismaClient;

beforeAll(async () => {
    // Configurar variables de entorno para tests
    Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true
    });
    process.env.DATABASE_URL = process.env.DATABASE_TEST_URL || 'postgresql://postgres:123456@localhost:5432/bonos_test';

    // Crear cliente de Prisma
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
        log: [], // Sin logs en tests
    });

    // Conectar a la base de datos
    await prisma.$connect();

    // Limpiar base de datos de tests
    await cleanupTestDatabase();

    // Configurar datos de test base
    await setupTestData();

    // Hacer cliente disponible globalmente
    global.__PRISMA_CLIENT__ = prisma;
});

afterAll(async () => {
    // Limpiar después de todos los tests
    await cleanupTestDatabase();

    // Desconectar cliente
    await prisma.$disconnect();
});

beforeEach(async () => {
    // Limpiar transacciones pendientes antes de cada test
    // (algunos tests pueden dejar transacciones abiertas)
});

afterEach(async () => {
    // Cleanup después de cada test si es necesario
    // Por ahora no hacemos nada para mantener performance
});

/**
 * Limpiar base de datos de test
 */
async function cleanupTestDatabase() {
    try {
        // Orden específico para respetar foreign keys
        const tablesToClean = [
            'audit_logs',
            'calculation_results',
            'financial_metrics',
            'cash_flows',
            'user_investments',
            'calculation_inputs',
            'bond_costs',
            'bonds',
            'emisor_profiles',
            'inversionista_profiles',
            'users',
        ];

        for (const table of tablesToClean) {
            await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        }

        console.log('🧹 Base de datos de test limpiada');
    } catch (error) {
        console.warn('⚠️ Error limpiando base de datos de test:', error);
    }
}

/**
 * Configurar datos base para tests
 */
async function setupTestData() {
    try {
        // Usuario emisor de test
        const testEmisor = await prisma.user.create({
            data: {
                email: 'test-emisor@example.com',
                passwordHash: '$2a$10$test.hash',
                role: 'EMISOR',
                emisorProfile: {
                    create: {
                        companyName: 'Test Company S.A.',
                        ruc: '20123456789',
                        contactPerson: 'Test Contact',
                        phone: '+51987654321',
                        address: 'Test Address 123',
                        industry: 'Testing',
                    }
                }
            },
            include: {
                emisorProfile: true,
            }
        });

        // Usuario inversionista de test
        const testInversionista = await prisma.user.create({
            data: {
                email: 'test-inversionista@example.com',
                passwordHash: '$2a$10$test.hash',
                role: 'INVERSIONISTA',
                inversionistaProfile: {
                    create: {
                        firstName: 'Test',
                        lastName: 'Investor',
                        phone: '+51987654322',
                        investmentProfile: 'Test Profile',
                        riskTolerance: 0.5,
                    }
                }
            },
            include: {
                inversionistaProfile: true,
            }
        });

        // Hacer IDs disponibles para tests
        global.__TEST_EMISOR_ID__ = testEmisor.emisorProfile!.id;
        global.__TEST_INVERSIONISTA_ID__ = testInversionista.inversionistaProfile!.id;
        global.__TEST_USER_EMISOR_ID__ = testEmisor.id;
        global.__TEST_USER_INVERSIONISTA_ID__ = testInversionista.id;

        console.log('✅ Datos base de test configurados');
    } catch (error) {
        console.error('❌ Error configurando datos de test:', error);
        throw error;
    }
}

/**
 * Utilidades para tests
 */

// Helper para crear bono de test
export async function createTestBond(overrides: any = {}) {
    const prismaClient = global.__PRISMA_CLIENT__;
    if (!prismaClient) throw new Error('Prisma client not initialized');

    const defaultBondData = {
        emisorId: global.__TEST_EMISOR_ID__,
        name: 'Test Bond',
        codigoIsin: `TEST${Date.now()}`,
        status: 'DRAFT' as const,
        valorNominal: 1000.00,
        valorComercial: 1050.00,
        numAnios: 5,
        fechaEmision: new Date('2025-06-01'),
        fechaVencimiento: new Date('2030-06-01'),
        frecuenciaCupon: 'SEMESTRAL' as const,
        baseDias: 360,
        tipoTasa: 'EFECTIVA' as const,
        periodicidadCapitalizacion: 'bimestral',
        tasaAnual: 0.08,
        indexadoInflacion: true,
        inflacionAnual: 0.10,
        primaVencimiento: 0.01,
        impuestoRenta: 0.30,
        ...overrides,
    };

    const bond = await prismaClient.bond.create({
        data: {
            ...defaultBondData,
            costs: {
                create: {
                    estructuracionPct: 0.01,
                    colocacionPct: 0.0025,
                    flotacionPct: 0.0045,
                    cavaliPct: 0.005,
                    emisorTotalAbs: 23.10,
                    bonistaTotalAbs: 9.98,
                    totalCostsAbs: 33.08,
                }
            },
            calculationInputs: {
                create: {
                    inputsData: {
                        valorNominal: defaultBondData.valorNominal,
                        valorComercial: defaultBondData.valorComercial,
                        numAnios: defaultBondData.numAnios,
                        frecuenciaCupon: 'semestral',
                        diasPorAno: defaultBondData.baseDias,
                        tipoTasa: 'efectiva',
                        periodicidadCapitalizacion: defaultBondData.periodicidadCapitalizacion,
                        tasaAnual: defaultBondData.tasaAnual,
                        tasaDescuento: 0.045,
                        impuestoRenta: defaultBondData.impuestoRenta,
                        fechaEmision: defaultBondData.fechaEmision.toISOString(),
                        primaPorcentaje: defaultBondData.primaVencimiento,
                        estructuracionPorcentaje: 0.01,
                        colocacionPorcentaje: 0.0025,
                        flotacionPorcentaje: 0.0045,
                        cavaliPorcentaje: 0.005,
                    },
                    inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10],
                    graciaSerie: ['S', 'S', 'S', 'S', 'S'],
                }
            }
        },
        include: {
            costs: true,
            calculationInputs: true,
            emisor: true,
        }
    });

    return bond;
}

// Helper para limpiar un test específico
export async function cleanupTestBond(bondId: string) {
    const prismaClient = global.__PRISMA_CLIENT__;
    if (!prismaClient) return;

    try {
        // Eliminar en orden correcto
        await prismaClient.calculationResult.deleteMany({ where: { bondId } });
        await prismaClient.financialMetrics.deleteMany({ where: { bondId } });
        await prismaClient.cashFlow.deleteMany({ where: { bondId } });
        await prismaClient.userInvestment.deleteMany({ where: { bondId } });
        await prismaClient.calculationInputs.deleteMany({ where: { bondId } });
        await prismaClient.bondCosts.deleteMany({ where: { bondId } });
        await prismaClient.bond.delete({ where: { id: bondId } });
    } catch (error) {
        console.warn(`⚠️ Error limpiando bono de test ${bondId}:`, error);
    }
}

// Helper para verificar precisión numérica en tests
export function expectCloseTo(actual: number, expected: number, precision = 5) {
    const tolerance = Math.pow(10, -precision);
    const diff = Math.abs(actual - expected);

    if (diff > tolerance) {
        throw new Error(
            `Expected ${actual} to be close to ${expected} within ${tolerance}, but difference was ${diff}`
        );
    }
}

// Helper para medir tiempo de ejecución
export async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
}

// Helper para generar datos de test aleatorios
export function generateRandomBondData() {
    return {
        valorNominal: Math.round(Math.random() * 10000) + 1000,
        valorComercial: Math.round(Math.random() * 10000) + 1000,
        numAnios: Math.floor(Math.random() * 10) + 1,
        tasaAnual: Math.random() * 0.2, // 0-20%
        inflacionAnual: Math.random() * 0.15, // 0-15%
        impuestoRenta: 0.28 + Math.random() * 0.12, // 28-40%
    };
}

// Helper para validar estructura de flujos
export function validateCashFlowStructure(flows: any[]) {
    expect(flows).toBeDefined();
    expect(Array.isArray(flows)).toBe(true);
    expect(flows.length).toBeGreaterThan(0);

    // Verificar período 0
    const period0 = flows.find(f => f.periodo === 0);
    expect(period0).toBeDefined();

    // Verificar secuencia de períodos
    const periods = flows.map(f => f.periodo).sort((a, b) => a - b);
    for (let i = 1; i < periods.length; i++) {
        expect(periods[i]).toBe(periods[i-1] + 1);
    }

    // Verificar campos requeridos
    flows.forEach(flow => {
        expect(flow).toHaveProperty('periodo');
        expect(flow).toHaveProperty('fecha');
        expect(typeof flow.periodo).toBe('number');
        expect(flow.fecha).toBeInstanceOf(Date);
    });
}

// Helper para validar métricas financieras
export function validateFinancialMetrics(metrics: any) {
    expect(metrics).toBeDefined();
    expect(typeof metrics.precioActual).toBe('number');
    expect(typeof metrics.duracion).toBe('number');
    expect(typeof metrics.convexidad).toBe('number');

    // Rangos válidos
    expect(metrics.duracion).toBeGreaterThanOrEqual(0);
    expect(metrics.duracion).toBeLessThan(100); // Duración razonable
    expect(metrics.convexidad).toBeGreaterThanOrEqual(0);
}

// Extender tipos globales para tests
declare global {
    var __TEST_EMISOR_ID__: string;
    var __TEST_INVERSIONISTA_ID__: string;
    var __TEST_USER_EMISOR_ID__: string;
    var __TEST_USER_INVERSIONISTA_ID__: string;

    namespace jest {
        interface Matchers<R> {
            toBeCloseTo(expected: number, precision?: number): R;
        }
    }
}

console.log('🧪 Configuración de tests cargada');