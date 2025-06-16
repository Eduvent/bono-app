// app/api/bonds/route.ts - VERSIÓN CORREGIDA Y COMPATIBLE
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema corregido para ser compatible con el wizard
const CreateBondSchema = z.object({
    // Datos del wizard Step 1 (nombres corregidos)
    name: z.string().min(1, 'Nombre requerido'),
    codigoIsin: z.string().optional(),
    valorNominal: z.number().positive('Valor nominal debe ser positivo'),
    valorComercial: z.number().positive('Valor comercial debe ser positivo'),
    numAnios: z.number().int().positive('Número de años debe ser positivo'),
    fechaEmision: z.string().transform(str => new Date(str)),
    frecuenciaCupon: z.enum(['mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual']),
    diasPorAno: z.number().int().positive().default(360),

    // Datos del wizard Step 2 (nombres corregidos)
    tipoTasa: z.enum(['nominal', 'efectiva']),
    periodicidadCapitalizacion: z.enum(['diaria', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual']).optional(),
    tasaAnual: z.number().min(0).max(1, 'Tasa debe estar entre 0 y 1'),
    tasaDescuento: z.number().min(0).max(1).optional(),
    inflacionSerie: z.array(z.number()).default([]),
    primaPorcentaje: z.number().min(0).default(0),
    impuestoRenta: z.number().min(0).max(1).default(0.3),

    // Datos del wizard Step 3 (nombres corregidos)
    estructuracionPorcentaje: z.number().min(0).default(0),
    colocacionPorcentaje: z.number().min(0).default(0),
    flotacionPorcentaje: z.number().min(0).default(0),
    cavaliPorcentaje: z.number().min(0).default(0),

    // Períodos de gracia
    graciaSerie: z.array(z.enum(['S', 'P', 'T'])).default([]),

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
            return NextResponse.json(
                { error: 'Emisor no encontrado', code: 'EMISOR_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Calcular fecha de vencimiento
        const fechaVencimiento = new Date(validatedData.fechaEmision);
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + validatedData.numAnios);

        // Crear bono en transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear bono básico
            const bond = await tx.bond.create({
                data: {
                    name: validatedData.name,
                    codigoIsin: validatedData.codigoIsin || `TEMP${Date.now()}`,
                    valorNominal: validatedData.valorNominal,
                    valorComercial: validatedData.valorComercial,
                    numAnios: validatedData.numAnios,
                    fechaEmision: validatedData.fechaEmision,
                    fechaVencimiento: fechaVencimiento,
                    frecuenciaCupon: validatedData.frecuenciaCupon,
                    baseDias: validatedData.diasPorAno,
                    tipoTasa: validatedData.tipoTasa,
                    periodicidadCapitalizacion: validatedData.periodicidadCapitalizacion,
                    tasaAnual: validatedData.tasaAnual,
                    primaVencimiento: validatedData.primaPorcentaje,
                    impuestoRenta: validatedData.impuestoRenta,
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

            // 3. Crear inputs de cálculo con series
            await tx.calculationInputs.create({
                data: {
                    bondId: bond.id,
                    inputsData: {
                        ...validatedData,
                        fechaEmision: validatedData.fechaEmision.toISOString(),
                        fechaVencimiento: fechaVencimiento.toISOString(),
                    },
                    inflacionSerie: validatedData.inflacionSerie,
                    graciaSerie: validatedData.graciaSerie,
                },
            });

            return bond;
        });

        console.log('✅ Bono creado exitosamente:', result.id);

        return NextResponse.json({
            success: true,
            bondId: result.id,
            bondName: result.name,
            message: 'Bono creado exitosamente',
            data: {
                id: result.id,
                name: result.name,
                codigoIsin: result.codigoIsin,
                status: result.status,
                valorNominal: Number(result.valorNominal),
                valorComercial: Number(result.valorComercial),
                emisor: emisor.companyName,
            },
        }, { status: 201 });

    } catch (error) {
        console.error('❌ Error creando bono:', error);

        if (error instanceof z.ZodError) {
            console.error('❌ Errores de validación:', error.errors);
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Error de Prisma
        if (error?.code === 'P2002') {
            return NextResponse.json(
                {
                    error: 'Ya existe un bono con ese código ISIN',
                    code: 'DUPLICATE_ISIN'
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// GET - Listar todos los bonos (opcional, para administración)
export async function GET(request: NextRequest) {
    try {
        const searchParams = new URL(request.url).searchParams;
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

        const bonds = await prisma.bond.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                emisor: {
                    select: {
                        companyName: true,
                        ruc: true,
                    },
                },
                _count: {
                    select: {
                        cashFlows: true,
                        investments: true,
                    },
                },
            },
        });

        const total = await prisma.bond.count();

        const bondsFormatted = bonds.map(bond => ({
            id: bond.id,
            name: bond.name,
            codigoIsin: bond.codigoIsin,
            status: bond.status,
            valorNominal: Number(bond.valorNominal),
            valorComercial: Number(bond.valorComercial),
            emisor: bond.emisor.companyName,
            createdAt: bond.createdAt.toISOString(),
            flowsCount: bond._count.cashFlows,
            investorsCount: bond._count.investments,
        }));

        return NextResponse.json({
            success: true,
            bonds: bondsFormatted,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });

    } catch (error) {
        console.error('❌ Error obteniendo bonos:', error);
        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}