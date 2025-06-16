import { PrismaClient } from '../lib/generated/client';

const prisma = new PrismaClient();

async function migrateStaticData() {
    console.log('🔄 Migrando datos estáticos existentes...');

    try {
        // Si tienes datos estáticos en archivos, migrarlos a la BD
        // Ejemplo: migrar sampleBondsData a la base de datos real

        console.log('✅ Migración completada');
    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    migrateStaticData().catch(console.error);
}

export { migrateStaticData };