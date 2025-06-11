// config/database.ts

import { z } from 'zod';

/**
 * Configuración de base de datos con validación
 */
const DatabaseConfigSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
    DATABASE_DIRECT_URL: z.string().url().optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(5432),
    DB_NAME: z.string().default('bonos_db'),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default(''),
    DB_SSL: z.boolean().default(false),
    DB_MAX_CONNECTIONS: z.coerce.number().default(10),
    DB_CONNECTION_TIMEOUT: z.coerce.number().default(30000), // 30 segundos
    DB_IDLE_TIMEOUT: z.coerce.number().default(600000), // 10 minutos
});

type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Cargar y validar configuración desde variables de entorno
 */
export function loadDatabaseConfig(): DatabaseConfig {
    const rawConfig = {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_DIRECT_URL: process.env.DATABASE_DIRECT_URL,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_SSL: process.env.DB_SSL === 'true',
        DB_MAX_CONNECTIONS: process.env.DB_MAX_CONNECTIONS,
        DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT,
        DB_IDLE_TIMEOUT: process.env.DB_IDLE_TIMEOUT,
    };

    try {
        return DatabaseConfigSchema.parse(rawConfig);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
            throw new Error(`Variables de entorno faltantes o inválidas: ${missingVars}`);
        }
        throw error;
    }
}

/**
 * Configuración por ambiente
 */
export const dbConfig = {
    development: {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bonos_dev',
        logging: true,
        synchronize: false, // Usar migraciones siempre
    },

    test: {
        DATABASE_URL: process.env.DATABASE_TEST_URL || 'postgresql://postgres:password@localhost:5432/bonos_test',
        logging: false,
        synchronize: false,
    },

    production: {
        DATABASE_URL: process.env.DATABASE_URL!,
        logging: false,
        synchronize: false,
        ssl: {
            rejectUnauthorized: false
        }
    }
};

/**
 * Obtener configuración según NODE_ENV
 */
export function getCurrentDbConfig() {
    const env = process.env.NODE_ENV as 'development' | 'test' | 'production';
    return dbConfig[env] || dbConfig.development;
}