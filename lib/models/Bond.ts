// lib/models/Bond.ts

import { PrismaClient, Bond as PrismaBond, BondStatus, FrequenciaCupon, TipoTasa } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

/**
 * Modelo de datos para Bonos
 * Incluye validaciones, CRUD y métodos de negocio
 */

// Esquemas de validación
export const CreateBondSchema = z.object({
    emisorId: z.string().cuid('ID de emisor inválido'),
    name: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre muy largo'),
    codigoIsin: z.string().optional(),

    // Datos básicos
    valorNominal: z.number().positive('Valor nominal debe ser positivo'),
    valorComercial: z.number().positive('Valor comercial debe ser positivo'),
    numAnios: z.number().int().positive('Número de años debe ser positivo').max(50, 'Máximo 50 años'),
    fechaEmision: z.date(),
    frecuenciaCupon: z.nativeEnum(FrequenciaCupon),
    baseDias: z.union([z.literal(360), z.literal(365)]),

    // Configuración financiera
    tipoTasa: z.nativeEnum(TipoTasa),
    periodicidadCapitalizacion: z.string(),
    tasaAnual: z.number().min(0, 'Tasa no puede ser negativa').max(1, 'Tasa no puede ser mayor a 100%'),
    indexadoInflacion: z.boolean().default(false),
    inflacionAnual: z.number().min(0).max(1).optional(),
    primaVencimiento: z.number().min(0).max(1).default(0),
    impuestoRenta: z.number().min(0).max(1),

    // Costes
    costes: z.object({
        estructuracionPct: z.number().min(0).max(1),
        colocacionPct: z.number().min(0).max(1),
        flotacionPct: z.number().min(0).max(1),
        cavaliPct: z.number().min(0).max(1),
    }),

    // Series de datos
    inflacionSerie: z.array(z.number().min(0).max(1)),
    graciaSerie: z.array(z.enum(['S', 'P', 'T'])),
});

export const UpdateBondSchema = CreateBondSchema.partial();

export type CreateBondInput = z.infer<typeof CreateBondSchema>;
export type UpdateBondInput = z.infer<typeof UpdateBondSchema>;

// Tipos extendidos
export interface BondWithRelations extends PrismaBond {
    emisor: {
        companyName: string;
        ruc: string;
    };
    costs?: {
        estructuracionPct: Decimal;
        colocacionPct: Decimal;
        flotacionPct: Decimal;
        cavaliPct: Decimal;
        emisorTotalAbs: Decimal;
        bonistaTotalAbs: Decimal;
        totalCostsAbs: Decimal;
    };
    _count?: {
        cashFlows: number;
        investments: number;
    };
}

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

    /**
     * Crear un nuevo bono con todas sus relaciones
     */
    async create(data: CreateBondInput): Promise<BondWithRelations> {
        // Validar datos de entrada
        const validatedData = CreateBondSchema.parse(data);

        // Calcular fecha de vencimiento
        const fechaVencimiento = new Date(validatedData.fechaEmision);
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + validatedData.numAnios);

        // Calcular costes absolutos
        const { costes } = validatedData;
        const valorComercial = new Decimal(validatedData.valorComercial);

        const costesAbs = {
            estructuracionAbs: valorComercial.mul(costes.estructuracionPct),
            colocacionAbs: valorComercial.mul(costes.colocacionPct),
            flotacionAbs: valorComercial.mul(costes.flotacionPct),
            cavaliAbs: valorComercial.mul(costes.cavaliPct),
        };

        const emisorTotalAbs = costesAbs.estructuracionAbs
            .plus(costesAbs.colocacionAbs)
            .plus(costesAbs.flotacionAbs)
            .plus(costesAbs.cavaliAbs);

        const bonistaTotalAbs = costesAbs.flotacionAbs.plus(costesAbs.cavaliAbs);
        const totalCostsAbs = emisorTotalAbs.plus(bonistaTotalAbs);

        return await this.prisma.$transaction(async (tx) => {
            // Crear el bono
            const bond = await tx.bond.create({
                data: {
                    emisorId: validatedData.emisorId,
                    name: validatedData.name,
                    codigoIsin: validatedData.codigoIsin,
                    status: BondStatus.DRAFT,
                    valorNominal: validatedData.valorNominal,
                    valorComercial: validatedData.valorComercial,
                    numAnios: validatedData.numAnios,
                    fechaEmision: validatedData.fechaEmision,
                    fechaVencimiento,
                    frecuenciaCupon: validatedData.frecuenciaCupon,
                    baseDias: validatedData.baseDias,
                    tipoTasa: validatedData.tipoTasa,
                    periodicidadCapitalizacion: validatedData.periodicidadCapitalizacion,
                    tasaAnual: validatedData.tasaAnual,
                    indexadoInflacion: validatedData.indexadoInflacion,
                    inflacionAnual: validatedData.inflacionAnual,
                    primaVencimiento: validatedData.primaVencimiento,
                    impuestoRenta: validatedData.impuestoRenta,
                },
            });

            // Crear costes
            const costs = await tx.bondCosts.create({
                data: {
                    bondId: bond.id,
                    estructuracionPct: costes.estructuracionPct,
                    colocacionPct: costes.colocacionPct,
                    flotacionPct: costes.flotacionPct,
                    cavaliPct: costes.cavaliPct,
                    emisorTotalAbs: emisorTotalAbs.toNumber(),
                    bonistaTotalAbs: bonistaTotalAbs.toNumber(),
                    totalCostsAbs: totalCostsAbs.toNumber(),
                },
            });

            // Crear inputs de cálculo
            await tx.calculationInputs.create({
                data: {
                    bondId: bond.id,
                    inputsData: {
                        ...validatedData,
                        fechaVencimiento,
                    },
                    inflacionSerie: validatedData.inflacionSerie,
                    graciaSerie: validatedData.graciaSerie,
                },
            });

            // Retornar el bono completo
            return await this.findById(bond.id, tx);
        });
    }

    /**
     * Buscar bono por ID con relaciones
     */
    async findById(id: string, tx?: any): Promise<BondWithRelations | null> {
        const client = tx || this.prisma;

        return await client.bond.findUnique({
            where: { id },
            include: {
                emisor: {
                    select: {
                        companyName: true,
                        ruc: true,
                    },
                },
                costs: true,
                _count: {
                    select: {
                        cashFlows: true,
                        investments: true,
                    },
                },
            },
        });
    }

    /**
     * Listar bonos con filtros
     */
    async findMany(filters: {
        emisorId?: string;
        status?: BondStatus;
        search?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<BondWithRelations[]> {
        const { emisorId, status, search, limit = 50, offset = 0 } = filters;

        const where: any = {};

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
                emisor: {
                    select: {
                        companyName: true,
                        ruc: true,
                    },
                },
                costs: true,
                _count: {
                    select: {
                        cashFlows: true,
                        investments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Actualizar bono
     */
    async update(id: string, data: UpdateBondInput): Promise<BondWithRelations> {
        const validatedData = UpdateBondSchema.parse(data);

        return await this.prisma.$transaction(async (tx) => {
            // Actualizar bono principal
            await tx.bond.update({
                where: { id },
                data: {
                    ...validatedData,
                    costs: undefined, // Excluir costes del update principal
                    inflacionSerie: undefined,
                    graciaSerie: undefined,
                },
            });

            // Actualizar costes si se proporcionan
            if (validatedData.costes) {
                const bond = await tx.bond.findUnique({ where: { id } });
                if (!bond) throw new Error('Bono no encontrado');

                const valorComercial = new Decimal(validatedData.valorComercial || bond.valorComercial);
                const { costes } = validatedData;

                const emisorTotalAbs = new Decimal(costes.estructuracionPct || 0)
                    .plus(costes.colocacionPct || 0)
                    .plus(costes.flotacionPct || 0)
                    .plus(costes.cavaliPct || 0)
                    .mul(valorComercial);

                const bonistaTotalAbs = new Decimal(costes.flotacionPct || 0)
                    .plus(costes.cavaliPct || 0)
                    .mul(valorComercial);

                await tx.bondCosts.update({
                    where: { bondId: id },
                    data: {
                        estructuracionPct: costes.estructuracionPct,
                        colocacionPct: costes.colocacionPct,
                        flotacionPct: costes.flotacionPct,
                        cavaliPct: costes.cavaliPct,
                        emisorTotalAbs: emisorTotalAbs.toNumber(),
                        bonistaTotalAbs: bonistaTotalAbs.toNumber(),
                        totalCostsAbs: emisorTotalAbs.plus(bonistaTotalAbs).toNumber(),
                    },
                });
            }

            // Actualizar inputs de cálculo si se proporcionan series
            if (validatedData.inflacionSerie || validatedData.graciaSerie) {
                await tx.calculationInputs.update({
                    where: { bondId: id },
                    data: {
                        inflacionSerie: validatedData.inflacionSerie,
                        graciaSerie: validatedData.graciaSerie,
                    },
                });
            }

            return await this.findById(id, tx);
        });
    }

    /**
     * Cambiar estado del bono
     */
    async updateStatus(id: string, status: BondStatus): Promise<void> {
        await this.prisma.bond.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Eliminar bono (soft delete cambiando status)
     */
    async delete(id: string): Promise<void> {
        await this.prisma.bond.update({
            where: { id },
            data: { status: BondStatus.EXPIRED },
        });
    }

    /**
     * Obtener resumen de bonos para dashboard
     */
    async getBondsSummary(emisorId?: string): Promise<BondSummary[]> {
        const where = emisorId ? { emisorId } : {};

        const bonds = await this.prisma.bond.findMany({
            where,
            select: {
                id: true,
                name: true,
                status: true,
                valorNominal: true,
                valorComercial: true,
                tasaAnual: true,
                fechaEmision: true,
                fechaVencimiento: true,
                emisor: {
                    select: {
                        companyName: true,
                    },
                },
                _count: {
                    select: {
                        investments: true,
                    },
                },
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
            emisor: bond.emisor.companyName,
            investorsCount: bond._count.investments,
        }));
    }

    /**
     * Obtener bonos disponibles para inversión
     */
    async getAvailableBonds(): Promise<BondSummary[]> {
        return this.getBondsSummary().then(bonds =>
            bonds.filter(bond => bond.status === BondStatus.ACTIVE)
        );
    }

    /**
     * Validar que el bono pueda ser modificado
     */
    async canModify(id: string): Promise<boolean> {
        const bond = await this.prisma.bond.findUnique({
            where: { id },
            select: {
                status: true,
                _count: {
                    select: {
                        investments: true,
                    },
                },
            },
        });

        if (!bond) return false;

        // Solo se puede modificar si está en borrador y no tiene inversiones
        return bond.status === BondStatus.DRAFT && bond._count.investments === 0;
    }

    /**
     * Obtener estadísticas del bono
     */
    async getStats(id: string) {
        const stats = await this.prisma.bond.findUnique({
            where: { id },
            select: {
                valorNominal: true,
                valorComercial: true,
                status: true,
                investments: {
                    select: {
                        montoInvertido: true,
                        status: true,
                    },
                },
                costs: {
                    select: {
                        totalCostsAbs: true,
                    },
                },
            },
        });

        if (!stats) return null;

        const activeInvestments = stats.investments.filter(i => i.status === 'ACTIVE');
        const totalInvested = activeInvestments.reduce(
            (sum, inv) => sum.plus(inv.montoInvertido),
            new Decimal(0)
        );

        return {
            valorNominal: stats.valorNominal.toNumber(),
            valorComercial: stats.valorComercial.toNumber(),
            totalInvestido: totalInvested.toNumber(),
            numeroInversores: activeInvestments.length,
            costosTotales: stats.costs?.totalCostsAbs.toNumber() || 0,
            porcentajeColocado: totalInvested.div(stats.valorComercial).mul(100).toNumber(),
        };
    }
}