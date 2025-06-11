// scripts/migrate.ts

import { PrismaClient } from '../lib/generated/client'
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script para ejecutar migraciones de base de datos
 * También configura datos iniciales y validaciones
 */

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface MigrationOptions {
    reset?: boolean;
    seedData?: boolean;
    validateSchema?: boolean;
    force?: boolean;
}

async function runMigrations(options: MigrationOptions = {}) {
    const { reset = false, seedData = true, validateSchema = true, force = false } = options;

    console.log('🚀 Iniciando migración de base de datos...\n');

    try {
        // 1. Verificar conexión a base de datos
        console.log('📡 Verificando conexión a base de datos...');
        await prisma.$connect();
        console.log('✅ Conexión exitosa\n');

        // 2. Reset de base de datos si se solicita
        if (reset) {
            console.log('🔄 Reseteando base de datos...');
            if (!force) {
                console.log('⚠️  Esta operación eliminará todos los datos. Use --force para confirmar');
                process.exit(1);
            }

            await execAsync('npx prisma db push --force-reset');
            console.log('✅ Base de datos reseteada\n');
        } else {
            // 3. Ejecutar migraciones normales
            console.log('📈 Ejecutando migraciones...');
            await execAsync('npx prisma db push');
            console.log('✅ Migraciones completadas\n');
        }

        // 4. Generar cliente de Prisma
        console.log('⚙️ Generando cliente de Prisma...');
        await execAsync('npx prisma generate');
        console.log('✅ Cliente generado\n');

        // 5. Validar esquema si se solicita
        if (validateSchema) {
            console.log('🔍 Validando esquema de base de datos...');
            await validateDatabaseSchema();
            console.log('✅ Esquema validado\n');
        }

        // 6. Insertar datos semilla si se solicita
        if (seedData) {
            console.log('🌱 Insertando datos de ejemplo...');
            await seedDatabase();
            console.log('✅ Datos semilla insertados\n');
        }

        // 7. Ejecutar tests de conexión
        console.log('🧪 Ejecutando tests de validación...');
        await runValidationTests();
        console.log('✅ Tests completados\n');

        console.log('🎉 ¡Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Validar que el esquema de base de datos esté correcto
 */
async function validateDatabaseSchema() {
    try {
        // Verificar tablas principales
        const tables = [
            'users',
            'emisor_profiles',
            'inversionista_profiles',
            'bonds',
            'bond_costs',
            'cash_flows',
            'financial_metrics',
            'user_investments',
            'calculation_inputs',
            'calculation_results',
            'audit_logs'
        ];

        console.log('  📋 Verificando existencia de tablas...');
        for (const table of tables) {
            const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      `;

            if (Array.isArray(result) && result.length === 0) {
                throw new Error(`Tabla '${table}' no encontrada`);
            }
            console.log(`    ✓ ${table}`);
        }

        // Verificar índices críticos
        console.log('  📊 Verificando índices...');
        const indices = [
            'users_email_key',
            'bonds_codigo_isin_key',
            'cash_flows_bondId_periodo_key',
            'financial_metrics_bondId_role_key'
        ];

        for (const index of indices) {
            const result = await prisma.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE indexname = ${index}
      `;

            if (Array.isArray(result) && result.length === 0) {
                console.log(`    ⚠️ Índice '${index}' no encontrado (opcional)`);
            } else {
                console.log(`    ✓ ${index}`);
            }
        }

        // Verificar enums
        console.log('  🏷️ Verificando enums...');
        const enums = ['UserRole', 'BondStatus', 'FrequenciaCupon', 'TipoTasa', 'MetricsRole'];

        for (const enumName of enums) {
            const result = await prisma.$queryRaw`
        SELECT typname 
        FROM pg_type 
        WHERE typname = ${enumName.toLowerCase()}
      `;

            if (Array.isArray(result) && result.length === 0) {
                throw new Error(`Enum '${enumName}' no encontrado`);
            }
            console.log(`    ✓ ${enumName}`);
        }

    } catch (error) {
        throw new Error(`Error validando esquema: ${error}`);
    }
}

/**
 * Insertar datos de ejemplo en la base de datos
 */
async function seedDatabase() {
    try {
        console.log('  👤 Creando usuarios de ejemplo...');

        // Usuario emisor
        const emisorUser = await prisma.user.upsert({
            where: { email: 'emisor@empresa.com' },
            update: {},
            create: {
                email: 'emisor@empresa.com',
                passwordHash: '$2a$10$example.hash', // En producción, usar bcrypt real
                role: 'EMISOR',
                emisorProfile: {
                    create: {
                        companyName: 'Empresa Ejemplo S.A.C.',
                        ruc: '20123456789',
                        contactPerson: 'Juan Pérez',
                        phone: '+51987654321',
                        address: 'Av. Principal 123, Lima',
                        industry: 'Servicios Financieros',
                    }
                }
            },
            include: {
                emisorProfile: true,
            }
        });

        // Usuario inversionista
        const inversionistaUser = await prisma.user.upsert({
            where: { email: 'inversionista@gmail.com' },
            update: {},
            create: {
                email: 'inversionista@gmail.com',
                passwordHash: '$2a$10$example.hash',
                role: 'INVERSIONISTA',
                inversionistaProfile: {
                    create: {
                        firstName: 'María',
                        lastName: 'González',
                        phone: '+51987654322',
                        investmentProfile: 'Conservador',
                        riskTolerance: 0.3,
                    }
                }
            },
            include: {
                inversionistaProfile: true,
            }
        });

        console.log('    ✓ Usuarios creados');

        console.log('  💰 Creando bono de ejemplo...');

        const bondoEjemplo = await prisma.bond.create({
            data: {
                emisorId: emisorUser.emisorProfile!.id,
                name: 'Bono VAC - Americano Ejemplo',
                codigoIsin: 'PE0000000001',
                status: 'ACTIVE',
                valorNominal: 1000.00,
                valorComercial: 1050.00,
                numAnios: 5,
                fechaEmision: new Date('2025-06-01'),
                fechaVencimiento: new Date('2030-06-01'),
                frecuenciaCupon: 'SEMESTRAL',
                baseDias: 360,
                tipoTasa: 'EFECTIVA',
                periodicidadCapitalizacion: 'bimestral',
                tasaAnual: 0.08, // 8%
                indexadoInflacion: true,
                inflacionAnual: 0.10, // 10%
                primaVencimiento: 0.01, // 1%
                impuestoRenta: 0.30, // 30%

                costs: {
                    create: {
                        estructuracionPct: 0.01, // 1%
                        colocacionPct: 0.0025, // 0.25%
                        flotacionPct: 0.0045, // 0.45%
                        cavaliPct: 0.005, // 0.5%
                        emisorTotalAbs: 23.10,
                        bonistaTotalAbs: 9.98,
                        totalCostsAbs: 33.08,
                    }
                },

                calculationInputs: {
                    create: {
                        inputsData: {
                            // Datos completos para cálculo
                            valorNominal: 1000.00,
                            valorComercial: 1050.00,
                            numAnios: 5,
                            frecuenciaCupon: 'semestral',
                            diasPorAno: 360,
                            tipoTasa: 'efectiva',
                            periodicidadCapitalizacion: 'bimestral',
                            tasaAnual: 0.08,
                            tasaDescuento: 0.045,
                            impuestoRenta: 0.30,
                            fechaEmision: '2025-06-01',
                            primaPorcentaje: 0.01,
                            estructuracionPorcentaje: 0.01,
                            colocacionPorcentaje: 0.0025,
                            flotacionPorcentaje: 0.0045,
                            cavaliPorcentaje: 0.005,
                        },
                        inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10], // 10% cada año
                        graciaSerie: ['S', 'S', 'S', 'S', 'S'], // Sin gracia
                    }
                }
            },
            include: {
                costs: true,
                calculationInputs: true,
            }
        });

        console.log('    ✓ Bono de ejemplo creado');

        console.log('  📊 Creando métricas de ejemplo...');

        // Métricas del emisor
        await prisma.financialMetrics.create({
            data: {
                bondId: bondoEjemplo.id,
                role: 'EMISOR',
                precioActual: 1753.34,
                utilidadPerdida: 693.37,
                van: 693.37,
                duracion: 4.45,
                duracionModificada: 4.35,
                convexidad: 22.39,
                totalRatiosDecision: 26.84,
                tir: 0.1845033,
                tcea: 0.1845033,
                tceaConEscudo: 0.1578819,
                fechaCalculo: new Date(),
            }
        });

        // Métricas del bonista
        await prisma.financialMetrics.create({
            data: {
                bondId: bondoEjemplo.id,
                role: 'BONISTA',
                precioActual: 1753.34,
                utilidadPerdida: 693.37,
                van: 1753.34,
                duracion: 4.45,
                duracionModificada: 4.35,
                convexidad: 22.39,
                totalRatiosDecision: 26.84,
                tir: 0.1755812,
                trea: 0.1755812,
                fechaCalculo: new Date(),
            }
        });

        console.log('    ✓ Métricas creadas');

        console.log('  💼 Creando inversión de ejemplo...');

        await prisma.userInvestment.create({
            data: {
                userId: inversionistaUser.id,
                bondId: bondoEjemplo.id,
                montoInvertido: 50000.00,
                fechaInversion: new Date(),
                precioCompra: 1050.00,
                status: 'ACTIVE',
                gananciaNoRealizada: 2500.00,
                rendimiento: 0.05,
            }
        });

        console.log('    ✓ Inversión creada');

    } catch (error) {
        throw new Error(`Error insertando datos semilla: ${error}`);
    }
}

/**
 * Ejecutar tests de validación básicos
 */
async function runValidationTests() {
    try {
        console.log('  🔍 Test 1: Verificar usuarios...');
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            throw new Error('No hay usuarios en la base de datos');
        }
        console.log(`    ✓ ${userCount} usuarios encontrados`);

        console.log('  🔍 Test 2: Verificar bonos...');
        const bondCount = await prisma.bond.count();
        if (bondCount === 0) {
            console.log('    ⚠️ No hay bonos en la base de datos (normal en setup inicial)');
        } else {
            console.log(`    ✓ ${bondCount} bonos encontrados`);
        }

        console.log('  🔍 Test 3: Verificar relaciones...');
        const bondWithRelations = await prisma.bond.findFirst({
            include: {
                emisor: true,
                costs: true,
                calculationInputs: true,
            }
        });

        if (bondWithRelations) {
            if (!bondWithRelations.emisor) {
                throw new Error('Relación Bond->Emisor no funciona');
            }
            if (!bondWithRelations.costs) {
                console.log('    ⚠️ Bono sin costes definidos');
            }
            console.log('    ✓ Relaciones funcionando correctamente');
        }

        console.log('  🔍 Test 4: Verificar enums...');
        const activeStatus = await prisma.bond.findFirst({
            where: { status: 'ACTIVE' }
        });

        if (activeStatus) {
            console.log('    ✓ Enums funcionando correctamente');
        }

    } catch (error) {
        throw new Error(`Error en tests de validación: ${error}`);
    }
}

/**
 * Función principal
 */
async function main() {
    const args = process.argv.slice(2);

    const options: MigrationOptions = {
        reset: args.includes('--reset'),
        seedData: !args.includes('--no-seed'),
        validateSchema: !args.includes('--no-validate'),
        force: args.includes('--force'),
    };

    // Mostrar ayuda
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🗄️  Script de Migración de Base de Datos

Uso: npm run db:migrate [opciones]

Opciones:
  --reset           Resetear base de datos (ELIMINA TODOS LOS DATOS)
  --no-seed         No insertar datos de ejemplo
  --no-validate     No validar esquema después de migrar
  --force           Forzar operaciones destructivas
  --help, -h        Mostrar esta ayuda

Ejemplos:
  npm run db:migrate                    # Migración normal con datos semilla
  npm run db:migrate --reset --force    # Reset completo con datos semilla
  npm run db:migrate --no-seed          # Solo migraciones, sin datos
    `);
        process.exit(0);
    }

    await runMigrations(options);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

export { runMigrations, validateDatabaseSchema, seedDatabase };