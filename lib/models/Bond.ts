// lib/models/Bond.ts

import {
    PrismaClient,
    Bond as PrismaBond,
    BondStatus,
    FrequenciaCupon,
    TipoTasa,
    // Emisor as PrismaEmisor, // No es estrictamente necesario si usamos Pick en BondWithFullRelations
    BondCosts as PrismaBondCosts,
    Prisma
} from '../../lib/generated/client';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

// --- ESQUEMAS DE VALIDACIÓN ZOD ---
export const CreateBondSchema = z.object({
    emisorId: z.string().cuid('ID de emisor inválido'),
    name: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
    codigoIsin: z.string().trim().optional().default(''),

    valorNominal: z.number().positive('Valor nominal debe ser positivo'),
    valorComercial: z.number().positive('Valor comercial debe ser positivo'),
    numAnios: z.number().int().positive('Número de años debe ser positivo').max(50, 'Máximo 50 años'),
    fechaEmision: z.coerce.date(),
    frecuenciaCupon: z.nativeEnum(FrequenciaCupon),
    baseDias: z.union([z.literal(360), z.literal(365)]),

    tipoTasa: z.nativeEnum(TipoTasa),
    periodicidadCapitalizacion: z.string().min(1, 'Periodicidad de capitalización requerida'),
    tasaAnual: z.number().min(0).max(1),
    indexadoInflacion: z.boolean().default(false),
    inflacionAnual: z.number().min(0).max(1).optional(),
    primaVencimiento: z.number().min(0).max(1).default(0),
    impuestoRenta: z.number().min(0).max(1),

    costes: z.object({
        estructuracionPct: z.number().min(0).max(1),
        colocacionPct: z.number().min(0).max(1),
        flotacionPct: z.number().min(0).max(1),
        cavaliPct: z.number().min(0).max(1),
    }),

    inflacionSerie: z.array(z.number().min(0).max(1)),
    graciaSerie: z.array(z.enum(['S', 'P', 'T'])),
});

export const UpdateBondSchema = CreateBondSchema.partial().extend({
    // Permitir que valorComercial sea opcional en costes durante la actualización
    costes: CreateBondSchema.shape.costes.extend({
        valorComercial: z.number().positive().optional() // Para recalcular costes en update
    }).optional()
});

export type CreateBondInput = z.infer<typeof CreateBondSchema>;
export type UpdateBondInput = z.infer<typeof UpdateBondSchema>;


// --- TIPOS EXTENDIDOS PARA RESULTADOS ---
export type BondWithFullRelations = Prisma.BondGetPayload<{
    include: {
        emisor: { select: { companyName: true, ruc: true } };
        costs: true; // PrismaBondCosts | null
        _count: { select: { cashFlows: true, investments: true } };
    };
}>;

export interface BondSummary {
    id: string;
    name: string;
    status: BondStatus;
    valorNominal: number;
    valorComercial: number;
    tasaAnual: number;
    fechaEmision: Date;
    fechaVencimiento: Date;
    emisor: string;
    investorsCount: number;
}

/**
 * Clase modelo para operaciones con Bonos
 */
export class BondModel {
    constructor(private prisma: PrismaClient) {}

    async create(data: CreateBondInput): Promise<BondWithFullRelations> {
        const validatedData = CreateBondSchema.parse(data);

        const fechaVencimiento = new Date(validatedData.fechaEmision);
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + validatedData.numAnios);

        const { costes: costesInput, inflacionSerie, graciaSerie, ...directBondData } = validatedData;

        // Los campos de Zod que son `number` se pasarán como `number` a Prisma.
        // Prisma Client se encargará de convertirlos a `Decimal` si el campo en la DB es `Decimal`.
        // --- Corrección en el método create ---
        const bondPayload: Prisma.BondCreateInput = {
            ...directBondData,
            fechaVencimiento,
            emisor: { connect: { id: validatedData.emisorId } }, // <-- Añadir esta línea
            // Otros campos...
        };

        const createdBondId = await this.prisma.$transaction(async (tx) => {
            const bond = await tx.bond.create({ data: bondPayload });

            const valorComercialDecimal = new Decimal(validatedData.valorComercial);
            const emisorTotalAbs = valorComercialDecimal.mul(costesInput.estructuracionPct)
                .plus(valorComercialDecimal.mul(costesInput.colocacionPct))
                .plus(valorComercialDecimal.mul(costesInput.flotacionPct))
                .plus(valorComercialDecimal.mul(costesInput.cavaliPct));
            const bonistaTotalAbs = valorComercialDecimal.mul(costesInput.flotacionPct)
                .plus(valorComercialDecimal.mul(costesInput.cavaliPct));

            await tx.bondCosts.create({
                data: {
                    bond: { connect: { id: bond.id } }, // Conectar con el bono
                    estructuracionPct: costesInput.estructuracionPct, // Prisma convierte number a Decimal
                    colocacionPct: costesInput.colocacionPct,
                    flotacionPct: costesInput.flotacionPct,
                    cavaliPct: costesInput.cavaliPct,
                    emisorTotalAbs: emisorTotalAbs, // Pasar el Decimal directamente
                    bonistaTotalAbs: bonistaTotalAbs, // Pasar el Decimal directamente
                    totalCostsAbs: emisorTotalAbs.plus(bonistaTotalAbs), // Pasar el Decimal directamente
                },
            });

            await tx.calculationInputs.create({
                data: {
                    bond: { connect: { id: bond.id } }, // Conectar con el bono
                    inputsData: {
                        ...validatedData,
                        fechaVencimiento: fechaVencimiento.toISOString(),
                    },
                    inflacionSerie: inflacionSerie,
                    graciaSerie: graciaSerie,
                },
            });
            return bond.id;
        });

        const result = await this.findById(createdBondId);
        if (!result) {
            throw new Error('Error crítico: El bono recién creado no se pudo recuperar.');
        }
        return result;
    }

    async findById(id: string, tx?: Prisma.TransactionClient): Promise<BondWithFullRelations | null> {
        const client = tx || this.prisma;
        return await client.bond.findUnique({
            where: { id },
            include: {
                emisor: { select: { companyName: true, ruc: true } },
                costs: true,
                _count: { select: { cashFlows: true, investments: true } },
            },
        });
    }

    async findMany(filters: {
        emisorId?: string;
        status?: BondStatus;
        search?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<BondWithFullRelations[]> {
        const { emisorId, status, search, limit = 50, offset = 0 } = filters;
        const where: Prisma.BondWhereInput = {};
        if (emisorId) where.emisorId = emisorId;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { codigoIsin: { contains: search, mode: 'insensitive' } },
            ];
        }

        return await this.prisma.bond.findMany({
            where,
            include: {
                emisor: { select: { companyName: true, ruc: true } },
                costs: true,
                _count: { select: { cashFlows: true, investments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async update(id: string, data: UpdateBondInput): Promise<BondWithFullRelations> {
        const validatedData = UpdateBondSchema.parse(data);
        const {
            costes: costesInput,
            inflacionSerie,
            graciaSerie,
            ...directBondDataToUpdate // Contiene solo los campos directos del modelo Bond que están en UpdateBondSchema
        } = validatedData;

        const bondUpdatePayload: Prisma.BondUpdateInput = {};
        // Poblar selectivamente bondUpdatePayload solo con campos definidos en directBondDataToUpdate
        for (const key of Object.keys(directBondDataToUpdate) as Array<keyof typeof directBondDataToUpdate>) {
            if (directBondDataToUpdate[key] !== undefined) {
                (bondUpdatePayload as any)[key] = directBondDataToUpdate[key];
            }
        }

        // Recalcular fechaVencimiento si es necesario
        if (bondUpdatePayload.fechaEmision || bondUpdatePayload.numAnios) {
            const currentBond = await this.prisma.bond.findUnique({ where: { id }, select: { fechaEmision: true, numAnios: true } });
            if (!currentBond) throw new Error('Bono no encontrado para actualizar fecha de vencimiento');

            const newFechaEmision = (bondUpdatePayload.fechaEmision as Date | undefined) || currentBond.fechaEmision;
            const newNumAnios = (bondUpdatePayload.numAnios as number | undefined) || currentBond.numAnios;

            const fechaVencimiento = new Date(newFechaEmision);
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + newNumAnios);
            bondUpdatePayload.fechaVencimiento = fechaVencimiento;
        }

        const updatedBondId = await this.prisma.$transaction(async (tx) => {
            await tx.bond.update({
                where: { id },
                data: bondUpdatePayload,
            });

            if (costesInput) {
                const bondForCostUpdate = await tx.bond.findUnique({ where: { id }, select: { valorComercial: true } });
                if (!bondForCostUpdate) throw new Error('Bono no encontrado para actualizar costes');

                // Usar el valorComercial del input de costes si se proporciona, sino el actual del bono
                const valorComercialParaCostes = costesInput.valorComercial !== undefined
                    ? new Decimal(costesInput.valorComercial)
                    : bondForCostUpdate.valorComercial; // bondForCostUpdate.valorComercial ya es Decimal

                const estructuracionPct = costesInput.estructuracionPct ?? 0;
                const colocacionPct = costesInput.colocacionPct ?? 0;
                const flotacionPct = costesInput.flotacionPct ?? 0;
                const cavaliPct = costesInput.cavaliPct ?? 0;

                const emisorTotalAbs = valorComercialParaCostes.mul(estructuracionPct)
                    .plus(valorComercialParaCostes.mul(colocacionPct))
                    .plus(valorComercialParaCostes.mul(flotacionPct))
                    .plus(valorComercialParaCostes.mul(cavaliPct));

                const bonistaTotalAbs = valorComercialParaCostes.mul(flotacionPct)
                    .plus(valorComercialParaCostes.mul(cavaliPct));

                const costsUpdateData: Prisma.BondCostsUpdateInput = {
                    estructuracionPct: costesInput.estructuracionPct,
                    colocacionPct: costesInput.colocacionPct,
                    flotacionPct: costesInput.flotacionPct,
                    cavaliPct: costesInput.cavaliPct,
                    emisorTotalAbs: emisorTotalAbs,
                    bonistaTotalAbs: bonistaTotalAbs,
                    totalCostsAbs: emisorTotalAbs.plus(bonistaTotalAbs),
                };
                // Remover campos undefined de costsUpdateData para que Prisma no intente poner null donde no debe
                Object.keys(costsUpdateData).forEach(key =>
                    (costsUpdateData as any)[key] === undefined && delete (costsUpdateData as any)[key]
                );

                await tx.bondCosts.upsert({
                    where: { bondId: id },
                    update: costsUpdateData,
                    create: {
                        bond: { connect: { id: id } },
                        estructuracionPct: estructuracionPct,
                        colocacionPct: colocacionPct,
                        flotacionPct: flotacionPct,
                        cavaliPct: cavaliPct,
                        emisorTotalAbs: emisorTotalAbs,
                        bonistaTotalAbs: bonistaTotalAbs,
                        totalCostsAbs: emisorTotalAbs.plus(bonistaTotalAbs),
                    },
                });
            }

            const calculationInputsUpdateData: Prisma.CalculationInputsUpdateInput = {};
            let needsCalcUpdate = false;

            if (inflacionSerie !== undefined) {
                calculationInputsUpdateData.inflacionSerie = inflacionSerie;
                needsCalcUpdate = true;
            }
            if (graciaSerie !== undefined) {
                calculationInputsUpdateData.graciaSerie = graciaSerie;
                needsCalcUpdate = true;
            }

            // Reconstruir inputsData para CalculationInputs si algún campo relevante del bono cambió
            // o si las series cambiaron (para mantener inputsData actualizado)
            const bondSnapshotForCalcInputs = await tx.bond.findUnique({where: {id}});
            if (bondSnapshotForCalcInputs && (needsCalcUpdate || Object.keys(bondUpdatePayload).length > 0)) {
                // Crear un objeto con los datos actuales del bono y los actualizados por validatedData
                const currentInputsData: any = { // Podría ser un tipo más específico
                    emisorId: bondSnapshotForCalcInputs.emisorId,
                    name: bondSnapshotForCalcInputs.name,
                    codigoIsin: bondSnapshotForCalcInputs.codigoIsin,
                    valorNominal: bondSnapshotForCalcInputs.valorNominal.toNumber(), // Convertir Decimal a number
                    valorComercial: bondSnapshotForCalcInputs.valorComercial.toNumber(),
                    numAnios: bondSnapshotForCalcInputs.numAnios,
                    fechaEmision: bondSnapshotForCalcInputs.fechaEmision.toISOString(),
                    frecuenciaCupon: bondSnapshotForCalcInputs.frecuenciaCupon,
                    baseDias: bondSnapshotForCalcInputs.baseDias,
                    tipoTasa: bondSnapshotForCalcInputs.tipoTasa,
                    periodicidadCapitalizacion: bondSnapshotForCalcInputs.periodicidadCapitalizacion,
                    tasaAnual: bondSnapshotForCalcInputs.tasaAnual.toNumber(),
                    indexadoInflacion: bondSnapshotForCalcInputs.indexadoInflacion,
                    inflacionAnual: bondSnapshotForCalcInputs.inflacionAnual?.toNumber(),
                    primaVencimiento: bondSnapshotForCalcInputs.primaVencimiento.toNumber(),
                    impuestoRenta: bondSnapshotForCalcInputs.impuestoRenta.toNumber(),
                    fechaVencimiento: bondSnapshotForCalcInputs.fechaVencimiento.toISOString(),
                    // NO incluir costes, inflacionSerie, graciaSerie aquí si ya están en validatedData
                };

                // Sobrescribir con los valores de validatedData que no son para relaciones
                const relevantValidatedDataForInputs: Partial<CreateBondInput> = { ...directBondDataToUpdate };
                if (validatedData.fechaEmision) relevantValidatedDataForInputs.fechaEmision = validatedData.fechaEmision;
                if (bondUpdatePayload.fechaVencimiento) (relevantValidatedDataForInputs as any).fechaVencimiento = bondUpdatePayload.fechaVencimiento;


                calculationInputsUpdateData.inputsData = {
                    ...currentInputsData,
                    // Convertir Dates a ISOString y numbers donde sea necesario si Zod los maneja como Date/number
                    ...(Object.fromEntries(Object.entries(relevantValidatedDataForInputs).map(([key, value]) => {
                        if (value instanceof Date) return [key, value.toISOString()];
                        // Podrías necesitar convertir Decimal a number aquí si Zod usa number
                        return [key, value];
                    }))),
                    // Asegurar que las series que se guardan en inputsData son las actualizadas
                    inflacionSerie: inflacionSerie !== undefined ? inflacionSerie : (await tx.calculationInputs.findUnique({where: {bondId:id}}))?.inflacionSerie,
                    graciaSerie: graciaSerie !== undefined ? graciaSerie : (await tx.calculationInputs.findUnique({where: {bondId:id}}))?.graciaSerie,

                };
                needsCalcUpdate = true;
            }


            if (needsCalcUpdate) {
                await tx.calculationInputs.update({
                    where: { bondId: id },
                    data: calculationInputsUpdateData,
                });
            }
            return id;
        });

        const result = await this.findById(updatedBondId);
        if (!result) {
            throw new Error('Error crítico: El bono recién actualizado no se pudo recuperar.');
        }
        return result;
    }

    async updateStatus(id: string, status: BondStatus): Promise<PrismaBond> {
        return await this.prisma.bond.update({
            where: { id },
            data: { status },
        });
    }

    async delete(id: string): Promise<PrismaBond> {
        return await this.prisma.bond.update({
            where: { id },
            data: { status: BondStatus.EXPIRED },
        });
    }

    async getBondsSummary(emisorId?: string): Promise<BondSummary[]> {
        const where: Prisma.BondWhereInput = emisorId ? { emisorId } : {};
        const bonds = await this.prisma.bond.findMany({
            where,
            select: {
                id: true, name: true, status: true, valorNominal: true, valorComercial: true,
                tasaAnual: true, fechaEmision: true, fechaVencimiento: true,
                emisor: { select: { companyName: true } },
                _count: { select: { investments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return bonds.map(bond => ({
            id: bond.id,
            name: bond.name,
            status: bond.status,
            valorNominal: bond.valorNominal.toNumber(),
            valorComercial: bond.valorComercial.toNumber(),
            tasaAnual: bond.tasaAnual.toNumber(),
            fechaEmision: bond.fechaEmision,
            fechaVencimiento: bond.fechaVencimiento,
            emisor: bond.emisor?.companyName || 'N/A',
            investorsCount: bond._count?.investments || 0,
        }));
    }

    async getAvailableBonds(): Promise<BondSummary[]> {
        const summaries = await this.getBondsSummary();
        return summaries.filter(bond => bond.status === BondStatus.ACTIVE);
    }

    async canModify(id: string): Promise<boolean> {
        const bond = await this.prisma.bond.findUnique({
            where: { id },
            select: { status: true, _count: { select: { investments: true } } },
        });
        if (!bond) return false;
        return bond.status === BondStatus.DRAFT && (bond._count?.investments || 0) === 0;
    }

    async getStats(id: string) {
        const statsData = await this.prisma.bond.findUnique({
            where: { id },
            select: {
                valorNominal: true, valorComercial: true, status: true,
                investments: {
                    where: { status: 'ACTIVE' },
                    select: { montoInvertido: true },
                },
                costs: { select: { totalCostsAbs: true } },
            },
        });
        if (!statsData) return null;

        const totalInvested = statsData.investments.reduce(
            (sum, inv) => sum.plus(inv.montoInvertido), new Decimal(0)
        );

        return {
            valorNominal: statsData.valorNominal.toNumber(),
            valorComercial: statsData.valorComercial.toNumber(),
            totalInvestido: totalInvested.toNumber(),
            numeroInversores: statsData.investments.length,
            costosTotales: statsData.costs?.totalCostsAbs?.toNumber() || 0,
            porcentajeColocado: statsData.valorComercial.isZero()
                ? 0
                : totalInvested.div(statsData.valorComercial).mul(100).toDecimalPlaces(2).toNumber(), // dp(2) para 2 decimales
        };
    }
}