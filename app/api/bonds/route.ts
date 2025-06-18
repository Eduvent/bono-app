// app/api/bonds/route.ts - VERSIÓN CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Mapeos de valores frontend → Prisma enum
const FRECUENCIA_CUPON_MAP = {
    'mensual': 'MENSUAL',
    'bimestral': 'BIMESTRAL',
    'trimestral': 'TRIMESTRAL',
    'cuatrimestral': 'CUATRIMESTRAL',
    'semestral': 'SEMESTRAL',
    'anual': 'ANUAL'
} as const;

const TIPO_TASA_MAP = {
    'nominal': 'NOMINAL',
    'efectiva': 'EFECTIVA'
} as const;

// Schema de validación
const CreateBondSchema = z.object({
    // Step 1 - Datos básicos
    name: z.string().min(1, 'Nombre requerido'),
    codigoIsin: z.string().optional(),
    valorNominal: z.number().positive('Valor nominal debe ser positivo'),
    valorComercial: z.number().positive('Valor comercial debe ser positivo'),
    numAnios: z.number().int().positive('Número de años debe ser positivo'),
    fechaEmision: z.string().transform(str => new Date(str)),
    frecuenciaCupon: z.enum(['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual']),
    diasPorAno: z.number().int().positive().default(360),

    // Step 2 - Condiciones financieras
    tipoTasa: z.enum(['nominal', 'efectiva']),
    periodicidadCapitalizacion: z.string().default('semestral'),
    tasaAnual: z.number().min(0).max(1, 'Tasa debe estar entre 0 y 1'),
    tasaDescuento: z.number().min(0).max(1).optional(),
    inflacionSerie: z.array(z.number()).default([]), // Debe tener numAnios valores
    primaPorcentaje: z.number().min(0).default(0),
    impuestoRenta: z.number().min(0).max(1).default(0.3),

    // Step 3 - Costes
    estructuracionPorcentaje: z.number().min(0).default(0),
    colocacionPorcentaje: z.number().min(0).default(0),
    flotacionPorcentaje: z.number().min(0).default(0),
    cavaliPorcentaje: z.number().min(0).default(0),

    // Períodos de gracia
    graciaSerie: z.array(z.enum(['S', 'P', 'T'])).default([]), // Un valor por año

    // Metadata
    emisorId: z.string().cuid('ID de emisor inválido'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('📥 Datos recibidos:', body);

        // Validar datos de entrada
        const validatedData = CreateBondSchema.parse(body);
        console.log('✅ Datos validados:', validatedData);

        // Verificar que el emisor existe
        const emisor = await prisma.emisorProfile.findUnique({
            where: { id: validatedData.emisorId },
            select: { id: true, companyName: true },
        });

        if (!emisor) {
            console.log('❌ Emisor no encontrado:', validatedData.emisorId);
            return NextResponse.json(
                { error: 'Emisor no encontrado', code: 'EMISOR_NOT_FOUND' },
                { status: 404 }
            );
        }

        console.log('✅ Emisor encontrado:', emisor.companyName);

        // Calcular fecha de vencimiento
        const fechaVencimiento = new Date(validatedData.fechaEmision);
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + validatedData.numAnios);

        // Mapear valores a enums de Prisma
        const frecuenciaCuponMapped = FRECUENCIA_CUPON_MAP[validatedData.frecuenciaCupon];
        const tipoTasaMapped = TIPO_TASA_MAP[validatedData.tipoTasa];

        console.log('🔄 Mapeando valores:');
        console.log('   frecuenciaCupon:', validatedData.frecuenciaCupon, '→', frecuenciaCuponMapped);
        console.log('   tipoTasa:', validatedData.tipoTasa, '→', tipoTasaMapped);

        // Calcular costes absolutos
        const emisorTotalAbs = (
            validatedData.estructuracionPorcentaje +
            validatedData.colocacionPorcentaje +
            validatedData.flotacionPorcentaje +
            validatedData.cavaliPorcentaje
        ) * validatedData.valorComercial;

        const bonistaTotalAbs = (
            Math.max(0, 0.0045 - validatedData.flotacionPorcentaje) +
            Math.max(0, 0.005 - validatedData.cavaliPorcentaje)
        ) * validatedData.valorComercial;

        console.log('💰 Costes calculados:');
        console.log('   Emisor:', emisorTotalAbs);
        console.log('   Bonista:', bonistaTotalAbs);

        // Crear bono en transacción
        const result = await prisma.$transaction(async (tx) => {
            console.log('🚀 Iniciando transacción de creación...');

            // 1. Crear bono principal
            const bond = await tx.bond.create({
                data: {
                    name: validatedData.name,
                    codigoIsin: validatedData.codigoIsin || null,
                    valorNominal: validatedData.valorNominal,
                    valorComercial: validatedData.valorComercial,
                    numAnios: validatedData.numAnios,
                    fechaEmision: validatedData.fechaEmision,
                    fechaVencimiento: fechaVencimiento,
                    frecuenciaCupon: frecuenciaCuponMapped, // Usar valor mapeado
                    baseDias: validatedData.diasPorAno,
                    tipoTasa: tipoTasaMapped, // Usar valor mapeado
                    periodicidadCapitalizacion: validatedData.periodicidadCapitalizacion,
                    tasaAnual: validatedData.tasaAnual,
                    indexadoInflacion: false, // Por ahora
                    inflacionAnual: null,
                    primaVencimiento: validatedData.primaPorcentaje,
                    impuestoRenta: validatedData.impuestoRenta,
                    emisorId: validatedData.emisorId,
                    status: 'DRAFT', // Siempre inicia como draft
                }
            });

            console.log('✅ Bono creado con ID:', bond.id);

            // 2. Crear costes asociados
            const costs = await tx.bondCosts.create({
                data: {
                    bondId: bond.id,
                    estructuracionPct: validatedData.estructuracionPorcentaje,
                    colocacionPct: validatedData.colocacionPorcentaje,
                    flotacionPct: validatedData.flotacionPorcentaje,
                    cavaliPct: validatedData.cavaliPorcentaje,
                    emisorTotalAbs: emisorTotalAbs,
                    bonistaTotalAbs: bonistaTotalAbs,
                    totalCostsAbs: emisorTotalAbs + bonistaTotalAbs,
                }
            });

            console.log('✅ Costes creados con ID:', costs.id);

            // 3. Crear inputs de cálculo
            const calculationInputs = await tx.calculationInputs.create({
                data: {
                    bondId: bond.id,
                    inputsData: ({
                        valorNominal: validatedData.valorNominal,
                        valorComercial: validatedData.valorComercial,
                        numAnios: validatedData.numAnios,
                        frecuenciaCupon: validatedData.frecuenciaCupon,
                        diasPorAno: validatedData.diasPorAno,
                        tipoTasa: validatedData.tipoTasa,
                        periodicidadCapitalizacion: validatedData.periodicidadCapitalizacion,
                        tasaAnual: validatedData.tasaAnual,
                        tasaDescuento: validatedData.tasaDescuento || 0.045,
                        impuestoRenta: validatedData.impuestoRenta,
                        fechaEmision: validatedData.fechaEmision.toISOString(),
                        primaPorcentaje: validatedData.primaPorcentaje,
                        estructuracionPorcentaje: validatedData.estructuracionPorcentaje,
                        colocacionPorcentaje: validatedData.colocacionPorcentaje,
                        flotacionPorcentaje: validatedData.flotacionPorcentaje,
                        cavaliPorcentaje: validatedData.cavaliPorcentaje,
                    }),
                    inflacionSerie: (validatedData.inflacionSerie),
                    graciaSerie: (validatedData.graciaSerie),
                }
            });

            console.log('✅ Calculation inputs creados con ID:', calculationInputs.id);

            return {
                bond,
                costs,
                calculationInputs
            };
        });

        console.log('🎉 Transacción completada exitosamente');

        // Respuesta exitosa
        return NextResponse.json({
            success: true,
            bondId: result.bond.id,
            bond: {
                id: result.bond.id,
                name: result.bond.name,
                status: result.bond.status,
                valorNominal: result.bond.valorNominal.toNumber(),
                valorComercial: result.bond.valorComercial.toNumber(),
                fechaEmision: result.bond.fechaEmision.toISOString(),
                fechaVencimiento: result.bond.fechaVencimiento.toISOString(),
            },
            message: 'Bono creado exitosamente'
        }, { status: 201 });

    } catch (error: any) {
        console.error('❌ Error creando bono:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Datos de entrada inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR',
            }, { status: 400 });
        }

        if (error.code === 'P2002') {
            return NextResponse.json({
                error: 'El código ISIN ya existe',
                code: 'DUPLICATE_ISIN',
            }, { status: 409 });
        }

        return NextResponse.json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Error inesperado',
            code: 'INTERNAL_ERROR',
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}