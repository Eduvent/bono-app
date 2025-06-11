#!/usr/bin/env tsx
// scripts/setup.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createInterface } from 'readline';

/**
 * Script de configuración automática para el sistema de bonos
 * Configura base de datos, variables de entorno, dependencias y ejecuta tests
 */

const execAsync = promisify(exec);

interface SetupConfig {
    dbHost: string;
    dbPort: string;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    dbTestName: string;
    nodeEnv: string;
    skipDB: boolean;
    skipTests: boolean;
    autoMode: boolean;
}

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    console.log(`
🧮 SISTEMA DE BONOS - CONFIGURACIÓN AUTOMÁTICA
═══════════════════════════════════════════════

Este script configurará automáticamente:
✅ Variables de entorno
✅ Base de datos PostgreSQL  
✅ Dependencias de Node.js
✅ Migraciones y seeds
✅ Tests de validación

`);

    try {
        // 1. Parsear argumentos de línea de comandos
        const config = await parseArguments();

        // 2. Verificar requisitos del sistema
        await checkSystemRequirements();

        // 3. Configurar variables de entorno
        await setupEnvironmentVariables(config);

        // 4. Instalar dependencias
        await installDependencies();

        // 5. Configurar base de datos
        if (!config.skipDB) {
            await setupDatabase(config);
        }

        // 6. Ejecutar tests
        if (!config.skipTests) {
            await runTests();
        }

        // 7. Configuración final
        await finalSetup();

        console.log(`
🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!

Próximos pasos:
1. Ejecutar: npm run dev
2. Abrir: http://localhost:3000
3. Revisar: README.md para más información

Para calcular bonos:
- POST /api/bonds/{id}/calculate
- Usar hooks: useCalculations, useCashFlows

¡Listo para calcular bonos financieros! 🚀
`);

    } catch (error) {
        console.error('\n❌ Error durante la configuración:', error);
        console.log('\n🔧 Para ayuda, ejecute: npm run setup -- --help');
        process.exit(1);
    } finally {
        rl.close();
    }
}

async function parseArguments(): Promise<SetupConfig> {
    const args = process.argv.slice(2);

    // Mostrar ayuda
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Uso: npm run setup [opciones]

Opciones:
  --auto                Configuración automática con valores por defecto
  --skip-db             Omitir configuración de base de datos
  --skip-tests          Omitir ejecución de tests
  --db-host=HOST        Host de PostgreSQL (default: localhost)
  --db-port=PORT        Puerto de PostgreSQL (default: 5432)
  --db-user=USER        Usuario de PostgreSQL (default: postgres)
  --db-password=PASS    Password de PostgreSQL
  --db-name=NAME        Nombre de BD principal (default: bonos_dev)
  --db-test=NAME        Nombre de BD de test (default: bonos_test)
  --env=ENV             Entorno (development/production)
  --help, -h            Mostrar esta ayuda

Ejemplos:
  npm run setup                                    # Configuración interactiva
  npm run setup -- --auto                         # Configuración automática
  npm run setup -- --skip-db --skip-tests         # Solo configurar entorno
  npm run setup -- --db-password=mipassword       # Con password específico
    `);
        process.exit(0);
    }

    const autoMode = args.includes('--auto');

    if (autoMode) {
        console.log('🤖 Modo automático activado - usando valores por defecto...\n');
        return {
            dbHost: getArgValue(args, '--db-host') || 'localhost',
            dbPort: getArgValue(args, '--db-port') || '5432',
            dbUser: getArgValue(args, '--db-user') || 'postgres',
            dbPassword: getArgValue(args, '--db-password') || 'password',
            dbName: getArgValue(args, '--db-name') || 'bonos_dev',
            dbTestName: getArgValue(args, '--db-test') || 'bonos_test',
            nodeEnv: getArgValue(args, '--env') || 'development',
            skipDB: args.includes('--skip-db'),
            skipTests: args.includes('--skip-tests'),
            autoMode: true,
        };
    }

    // Configuración interactiva
    console.log('📝 Configuración interactiva - responda las siguientes preguntas:\n');

    const dbHost = await ask('Host de PostgreSQL (localhost): ') || 'localhost';
    const dbPort = await ask('Puerto de PostgreSQL (5432): ') || '5432';
    const dbUser = await ask('Usuario de PostgreSQL (postgres): ') || 'postgres';
    const dbPassword = await ask('Password de PostgreSQL: ');
    const dbName = await ask('Nombre de BD principal (bonos_dev): ') || 'bonos_dev';
    const dbTestName = await ask('Nombre de BD de test (bonos_test): ') || 'bonos_test';

    return {
        dbHost,
        dbPort,
        dbUser,
        dbPassword,
        dbName,
        dbTestName,
        nodeEnv: 'development',
        skipDB: args.includes('--skip-db'),
        skipTests: args.includes('--skip-tests'),
        autoMode: false,
    };
}

function getArgValue(args: string[], key: string): string | undefined {
    const arg = args.find(a => a.startsWith(`${key}=`));
    return arg?.split('=')[1];
}

async function checkSystemRequirements() {
    console.log('🔍 Verificando requisitos del sistema...\n');

    try {
        // Verificar Node.js
        const { stdout: nodeVersion } = await execAsync('node --version');
        const nodeMajor = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        if (nodeMajor < 18) {
            throw new Error(`Node.js 18+ requerido, encontrado: ${nodeVersion.trim()}`);
        }
        console.log(`✅ Node.js: ${nodeVersion.trim()}`);

        // Verificar npm
        const { stdout: npmVersion } = await execAsync('npm --version');
        console.log(`✅ npm: ${npmVersion.trim()}`);

        // Verificar PostgreSQL
        try {
            const { stdout: pgVersion } = await execAsync('psql --version');
            console.log(`✅ PostgreSQL: ${pgVersion.trim()}`);
        } catch (error) {
            console.log('⚠️ PostgreSQL no encontrado en PATH, pero puede estar instalado');
            const continuar = await ask('¿Continuar sin verificar PostgreSQL? (y/N): ');
            if (continuar.toLowerCase() !== 'y') {
                throw new Error('PostgreSQL es requerido para el sistema');
            }
        }

        // Verificar TypeScript
        try {
            const { stdout: tsVersion } = await execAsync('npx tsc --version');
            console.log(`✅ TypeScript: ${tsVersion.trim()}`);
        } catch (error) {
            console.log('📦 TypeScript se instalará con las dependencias');
        }

        console.log('');
    } catch (error) {
        throw new Error(`Requisitos no cumplidos: ${error}`);
    }
}

async function setupEnvironmentVariables(config: SetupConfig) {
    console.log('⚙️ Configurando variables de entorno...\n');

    const envLocalPath = '.env.local';
    const envExamplePath = '.env.example';

    try {
        // Verificar si ya existe .env.local
        try {
            await fs.access(envLocalPath);
            if (!config.autoMode) {
                const overwrite = await ask('⚠️ .env.local ya existe. ¿Sobrescribir? (y/N): ');
                if (overwrite.toLowerCase() !== 'y') {
                    console.log('📝 Manteniendo .env.local existente');
                    return;
                }
            }
        } catch {
            // .env.local no existe, continuar
        }

        // Crear DATABASE_URL
        const databaseUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}`;
        const testDatabaseUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbTestName}`;

        const envContent = `# Configuración generada automáticamente
# ${new Date().toISOString()}

# Base de datos
DATABASE_URL="${databaseUrl}"
DATABASE_TEST_URL="${testDatabaseUrl}"
DB_HOST="${config.dbHost}"
DB_PORT="${config.dbPort}"
DB_NAME="${config.dbName}"
DB_USER="${config.dbUser}"
DB_PASSWORD="${config.dbPassword}"

# Entorno
NODE_ENV="${config.nodeEnv}"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-${Math.random().toString(36).substring(7)}"

# JWT
JWT_SECRET="jwt-secret-${Math.random().toString(36).substring(7)}"
JWT_EXPIRES_IN="24h"

# Cálculos financieros
CALCULATION_PRECISION="8"
CALCULATION_TOLERANCE="0.000001"
CALCULATION_TIMEOUT="30000"
CALCULATION_CACHE_ENABLED="true"
DEFAULT_DISCOUNT_RATE="0.045"

# Logs
LOG_LEVEL="info"
DB_LOGGING="${config.nodeEnv === 'development'}"
CALCULATION_LOGGING="true"

# Features para desarrollo
DEBUG="${config.nodeEnv === 'development'}"
VERBOSE_LOGGING="false"
HOT_RELOAD_CALCULATIONS="true"
SKIP_VALIDATIONS="false"

# Testing
TEST_TIMEOUT="30000"
TEST_DB_RESET="true"
MOCK_EXTERNAL_SERVICES="true"
`;

        await fs.writeFile(envLocalPath, envContent);
        console.log('✅ .env.local creado exitosamente');

        // Verificar que .env.example existe
        try {
            await fs.access(envExamplePath);
            console.log('✅ .env.example encontrado');
        } catch {
            console.log('⚠️ .env.example no encontrado, debería estar en el proyecto');
        }

        console.log('');
    } catch (error) {
        throw new Error(`Error configurando variables de entorno: ${error}`);
    }
}

async function installDependencies() {
    console.log('📦 Instalando dependencias...\n');

    try {
        // Verificar package.json
        const packageJsonPath = 'package.json';
        await fs.access(packageJsonPath);

        console.log('📥 Ejecutando npm install...');
        const { stdout, stderr } = await execAsync('npm install', { maxBuffer: 1024 * 1024 * 10 });

        if (stderr && !stderr.includes('warn')) {
            console.log('⚠️ Advertencias durante la instalación:', stderr);
        }

        console.log('✅ Dependencias instaladas exitosamente\n');

        // Verificar dependencias críticas
        const criticalDeps = [
            '@prisma/client',
            'decimal.js',
            'zod',
            'next',
            'typescript'
        ];

        console.log('🔍 Verificando dependencias críticas...');
        for (const dep of criticalDeps) {
            try {
                await fs.access(`node_modules/${dep}`);
                console.log(`✅ ${dep}`);
            } catch {
                console.log(`❌ ${dep} - no encontrado`);
            }
        }

        console.log('');
    } catch (error) {
        throw new Error(`Error instalando dependencias: ${error}`);
    }
}

async function setupDatabase(config: SetupConfig) {
    console.log('🗄️ Configurando base de datos...\n');

    try {
        const dbUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}`;

        // Crear bases de datos si no existen
        console.log('📊 Creando bases de datos...');

        try {
            await execAsync(`createdb -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} ${config.dbName}`);
            console.log(`✅ Base de datos ${config.dbName} creada`);
        } catch (error) {
            if (error.toString().includes('already exists')) {
                console.log(`ℹ️ Base de datos ${config.dbName} ya existe`);
            } else {
                console.log(`⚠️ Error creando ${config.dbName}: ${error}`);
            }
        }

        try {
            await execAsync(`createdb -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} ${config.dbTestName}`);
            console.log(`✅ Base de datos ${config.dbTestName} creada`);
        } catch (error) {
            if (error.toString().includes('already exists')) {
                console.log(`ℹ️ Base de datos ${config.dbTestName} ya existe`);
            } else {
                console.log(`⚠️ Error creando ${config.dbTestName}: ${error}`);
            }
        }

        // Generar cliente de Prisma
        console.log('\n⚙️ Generando cliente de Prisma...');
        await execAsync('npx prisma generate');
        console.log('✅ Cliente de Prisma generado');

        // Ejecutar migraciones
        console.log('\n📈 Ejecutando migraciones...');
        await execAsync('npx prisma db push');
        console.log('✅ Migraciones aplicadas');

        // Insertar datos de prueba
        console.log('\n🌱 Insertando datos de ejemplo...');
        await execAsync('npm run db:seed');
        console.log('✅ Datos de ejemplo insertados');

        console.log('');
    } catch (error) {
        throw new Error(`Error configurando base de datos: ${error}`);
    }
}

async function runTests() {
    console.log('🧪 Ejecutando tests de validación...\n');

    try {
        // Tests de cálculos financieros
        console.log('🧮 Tests de cálculos financieros...');
        await execAsync('npm run test:calculations');
        console.log('✅ Tests de cálculos exitosos');

        // Tests de base de datos
        console.log('\n🗄️ Tests de base de datos...');
        await execAsync('npm test -- tests/integration/database.test.ts');
        console.log('✅ Tests de BD exitosos');

        // Test de ejemplo completo
        console.log('\n🎯 Test de ejemplo del Excel...');
        await execAsync('npm run example:calculator');
        console.log('✅ Ejemplo del Excel validado');

        console.log('');
    } catch (error) {
        console.log('⚠️ Algunos tests fallaron, pero la configuración básica está completa');
        console.log('💡 Ejecute "npm run test" más tarde para revisar los tests');
        console.log('');
    }
}

async function finalSetup() {
    console.log('🔧 Configuración final...\n');

    try {
        // Verificar que todo esté funcionando
        console.log('🔍 Verificando configuración...');

        // Verificar conexión a BD
        const { stdout } = await execAsync('npx prisma db execute --stdin', {
            input: 'SELECT 1 as test;'
        });
        console.log('✅ Conexión a base de datos OK');

        // Verificar TypeScript
        await execAsync('npm run type-check');
        console.log('✅ Verificación de tipos OK');

        // Crear directorio de uploads si no existe
        const uploadsDir = './uploads';
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
            console.log('✅ Directorio de uploads creado');
        }

        // Verificar que los archivos clave existen
        const keyFiles = [
            'lib/services/calculations/FinancialCalculator.ts',
            'lib/services/calculations/ExcelFormulas.ts',
            'app/api/bonds/[bondId]/calculate/route.ts',
            'tests/unit/calculations.test.ts'
        ];

        console.log('\n📋 Verificando archivos clave...');
        for (const file of keyFiles) {
            try {
                await fs.access(file);
                console.log(`✅ ${file}`);
            } catch {
                console.log(`❌ ${file} - no encontrado`);
            }
        }

        console.log('');
    } catch (error) {
        console.log('⚠️ Algunas verificaciones finales fallaron:', error);
        console.log('💡 El sistema debería funcionar, pero revise los logs');
    }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
    main().catch(console.error);
}

export { main as runSetup };