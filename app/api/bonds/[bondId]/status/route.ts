import {NextRequest, NextResponse} from "next/server";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = await params;
        const { status, publishedAt } = await request.json();

        const validStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Estado inválido' },
                { status: 400 }
            );
        }

        const updatedBond = await prisma.bond.update({
            where: { id: bondId },
            data: {
                status,
                publishedAt: status === 'ACTIVE' ? new Date() : null,
            },
        });

        return NextResponse.json({
            success: true,
            bond: updatedBond,
        });

    } catch (error) {
        console.error('Error updating bond status:', error);
        return NextResponse.json(
            { error: 'Error actualizando estado' },
            { status: 500 }
        );
    }
}