import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const ParamsSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = ParamsSchema.parse(await params);

        const bond = await prisma.bond.findUnique({
            where: { id: bondId },
            include: { costs: true, calculationInputs: true },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            bond: {
                id: bond.id,
                name: bond.name,
                codigoIsin: bond.codigoIsin,
                status: bond.status,
                valorNominal: bond.valorNominal.toNumber(),
                valorComercial: bond.valorComercial.toNumber(),
                numAnios: bond.numAnios,
                fechaEmision: bond.fechaEmision.toISOString(),
                fechaVencimiento: bond.fechaVencimiento.toISOString(),
                frecuenciaCupon: bond.frecuenciaCupon,
                tipoTasa: bond.tipoTasa,
                periodicidadCapitalizacion: bond.periodicidadCapitalizacion,
                tasaAnual: bond.tasaAnual.toNumber(),
                impuestoRenta: bond.impuestoRenta.toNumber(),
                primaVencimiento: bond.primaVencimiento.toNumber(),
                costs: bond.costs ? {
                    estructuracionPorcentaje: bond.costs.estructuracionPct.toNumber(),
                    colocacionPorcentaje: bond.costs.colocacionPct.toNumber(),
                    flotacionPorcentaje: bond.costs.flotacionPct.toNumber(),
                    cavaliPorcentaje: bond.costs.cavaliPct.toNumber(),
                    emisorTotalAbs: bond.costs.emisorTotalAbs.toNumber(),
                    bonistaTotalAbs: bond.costs.bonistaTotalAbs.toNumber(),
                    totalCostsAbs: bond.costs.totalCostsAbs.toNumber(),
                } : null,
                calculationInputs: bond.calculationInputs ? {
                    ...(typeof bond.calculationInputs.inputsData === 'string'
                        ? JSON.parse(bond.calculationInputs.inputsData as unknown as string)
                        : bond.calculationInputs.inputsData),
                    inflacionSerie: bond.calculationInputs.inflacionSerie as any,
                    graciaSerie: bond.calculationInputs.graciaSerie as any,
                } : null,
            },
        });
    } catch (error) {
        console.error('Error obteniendo bono:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'ID de bono inválido', code: 'INVALID_BOND_ID' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}

if (process.env.NODE_ENV !== 'development') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}