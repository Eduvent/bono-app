import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const CreateBondSchema = z.object({
    // Datos del wizard Step 1
    name: z.string().min(1, 'Nombre requerido'),
    codigoIsin: z.string().optional(),
    valorNominal: z.number().positive(),
    valorComercial: z.number().positive(),
    numAnios: z.number().int().positive(),
    fechaEmision: z.string().transform(str => new Date(str)),
    frecuenciaCupon: z.enum(['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual']),
    diasPorAno: z.number().int().positive().default(360),

    // Datos del wizard Step 2
    tipoTasa: z.enum(['nominal', 'efectiva']),
    periodicidadCapitalizacion: z.enum(['diaria', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual']),
    tasaAnual: z.number().min(0).max(1),
    tasaDescuento: z.number().min(0).max(1),
    inflacionSerie: z.array(z.number()),
    primaPorcentaje: z.number().min(0),
    impuestoRenta: z.number().min(0).max(1),

    // Datos del wizard Step 3
    estructuracionPorcentaje: z.number().min(0),
    colocacionPorcentaje: z.number().min(0),
    flotacionPorcentaje: z.number().min(0),
    cavaliPorcentaje: z.number().min(0),

    // Períodos de gracia
    graciaSerie: z.array(z.enum(['S', 'P', 'T'])),

    // Metadata
    emisorId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = CreateBondSchema.parse(body);

        // Crear bono en transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear bono básico
            const bond = await tx.bond.create({
                data: {
                    name: validatedData.name,
                    codigoIsin: validatedData.codigoIsin || `TEMP${Date.now()}`,
                    emisorId: validatedData.emisorId,
                    status: 'DRAFT',
                },
            });

            // 2. Crear configuración de costes
            await tx.bondCosts.create({
                data: {
                    bondId: bond.id,
                    estructuracionPorcentaje: validatedData.estructuracionPorcentaje,
                    colocacionPorcentaje: validatedData.colocacionPorcentaje,
                    flotacionPorcentaje: validatedData.flotacionPorcentaje,
                    cavaliPorcentaje: validatedData.cavaliPorcentaje,
                    primaPorcentaje: validatedData.primaPorcentaje,
                },
            });

            // 3. Crear inputs de cálculo
            await tx.calculationInputs.create({
                data: {
                    bondId: bond.id,
                    valorNominal: validatedData.valorNominal,
                    valorComercial: validatedData.valorComercial,
                    numAnios: validatedData.numAnios,
                    fechaEmision: validatedData.fechaEmision,
                    frecuenciaCupon: validatedData.frecuenciaCupon,
                    diasPorAno: validatedData.diasPorAno,
                    tipoTasa: validatedData.tipoTasa,
                    periodicidadCapitalizacion: validatedData.periodicidadCapitalizacion,
                    tasaAnual: validatedData.tasaAnual,
                    tasaDescuento: validatedData.tasaDescuento,
                    impuestoRenta: validatedData.impuestoRenta,
                    inflacionSerie: validatedData.inflacionSerie,
                    graciaSerie: validatedData.graciaSerie,
                },
            });

            return bond;
        });

        return NextResponse.json({
            success: true,
            bondId: result.id,
            message: 'Bono creado exitosamente',
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating bond:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}