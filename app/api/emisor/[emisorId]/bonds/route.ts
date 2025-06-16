import {NextRequest, NextResponse} from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { emisorId: string } }
) {
    try {
        const { emisorId } = params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'all', 'draft', 'active', etc.

        const whereClause: any = { emisorId };
        if (status && status !== 'all') {
            whereClause.status = status.toUpperCase();
        }

        const bonds = await prisma.bond.findMany({
            where: whereClause,
            include: {
                costs: true,
                calculationInputs: true,
                _count: {
                    select: {
                        cashFlows: true,
                        userInvestments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Enriquecer con métricas si existen
        const bondsWithMetrics = await Promise.all(
            bonds.map(async (bond) => {
                const metrics = await prisma.financialMetrics.findFirst({
                    where: { bondId: bond.id, role: 'EMISOR' },
                });

                return {
                    id: bond.id,
                    name: bond.name,
                    codigoIsin: bond.codigoIsin,
                    status: bond.status,
                    createdAt: bond.createdAt,
                    updatedAt: bond.updatedAt,

                    // Datos financieros
                    nominalValue: bond.calculationInputs?.valorNominal || 0,
                    commercialValue: bond.calculationInputs?.valorComercial || 0,
                    years: bond.calculationInputs?.numAnios || 0,
                    couponFrequency: bond.calculationInputs?.frecuenciaCupon || 'semestral',

                    // Métricas si existen
                    tceaEmisor: metrics?.tcea || null,
                    van: metrics?.van || null,
                    duracion: metrics?.duracion || null,

                    // Contadores
                    flowsCount: bond._count.cashFlows,
                    investorsCount: bond._count.userInvestments,

                    // Estados calculados
                    hasFlows: bond._count.cashFlows > 0,
                    isPublished: bond.status === 'ACTIVE',
                };
            })
        );

        return NextResponse.json({
            success: true,
            bonds: bondsWithMetrics,
            count: bondsWithMetrics.length,
        });

    } catch (error) {
        console.error('Error fetching bonds:', error);
        return NextResponse.json(
            { error: 'Error obteniendo bonos' },
            { status: 500 }
        );
    }
}