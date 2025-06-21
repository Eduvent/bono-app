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
            include: { 
                emisor: true,
                costs: true, 
                calculationInputs: true,
                financialMetrics: {
                    where: { role: 'EMISOR' },
                    select: {
                        tcea: true,
                        tceaConEscudo: true,
                        van: true,
                        duracion: true,
                        convexidad: true,
                        duracionModificada: true,
                    }
                }
            },
        });

        if (!bond) {
            return NextResponse.json(
                { error: 'Bono no encontrado', code: 'BOND_NOT_FOUND' },
                { status: 404 }
            );
        }

        // Obtener datos de cálculo inputs
        let calculationInputs = null;
        if (bond.calculationInputs) {
            const inputsData = typeof bond.calculationInputs.inputsData === 'string'
                ? JSON.parse(bond.calculationInputs.inputsData)
                : bond.calculationInputs.inputsData;
            
            calculationInputs = {
                ...inputsData,
                inflacionSerie: bond.calculationInputs.inflacionSerie,
                graciaSerie: bond.calculationInputs.graciaSerie,
            };
        }

        // Calcular total costes emisor
        let totalCostesEmisor = 0;
        if (bond.costs) {
            totalCostesEmisor = 
                bond.costs.estructuracionPct.toNumber() +
                bond.costs.colocacionPct.toNumber() +
                bond.costs.flotacionPct.toNumber() +
                bond.costs.cavaliPct.toNumber();
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
                indexadoInflacion: bond.indexadoInflacion,
                inflacionAnual: bond.inflacionAnual?.toNumber(),
                primaVencimiento: bond.primaVencimiento.toNumber(),
                impuestoRenta: bond.impuestoRenta.toNumber(),
                baseDias: bond.baseDias, // Días por año (360 o 365)
                
                // Datos del emisor
                emisor: bond.emisor ? {
                    id: bond.emisor.id,
                    companyName: bond.emisor.companyName,
                    ruc: bond.emisor.ruc,
                } : null,

                // Tasa de descuento desde calculation inputs
                tasaDescuento: calculationInputs?.tasaDescuento || 0.045, // Default 4.5% si no está definida

                // Costes
                costs: bond.costs ? {
                    estructuracionPorcentaje: bond.costs.estructuracionPct.toNumber(),
                    colocacionPorcentaje: bond.costs.colocacionPct.toNumber(),
                    flotacionPorcentaje: bond.costs.flotacionPct.toNumber(),
                    cavaliPorcentaje: bond.costs.cavaliPct.toNumber(),
                    emisorTotalAbs: bond.costs.emisorTotalAbs.toNumber(),
                    bonistaTotalAbs: bond.costs.bonistaTotalAbs.toNumber(),
                    totalCostsAbs: bond.costs.totalCostsAbs.toNumber(),
                    totalCostesEmisor: totalCostesEmisor,
                } : null,

                // Métricas financieras
                financialMetrics: bond.financialMetrics[0] ? {
                    tcea: bond.financialMetrics[0].tcea?.toNumber(),
                    tceaConEscudo: bond.financialMetrics[0].tceaConEscudo?.toNumber(),
                    van: bond.financialMetrics[0].van.toNumber(),
                    duracion: bond.financialMetrics[0].duracion.toNumber(),
                    convexidad: bond.financialMetrics[0].convexidad.toNumber(),
                    duracionModificada: bond.financialMetrics[0].duracionModificada.toNumber(),
                } : null,

                // Datos de cálculo
                calculationInputs: calculationInputs,
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