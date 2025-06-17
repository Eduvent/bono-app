import {NextRequest, NextResponse} from "next/server";
import {PrismaClient} from "../../../../../lib/generated/client"

const prisma = new PrismaClient()

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = await params;
        const { status } = await request.json();

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
                ...(status === 'ACTIVE' ? { publishedAt: new Date() } : {})
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

if (process.env.NODE_ENV !== 'development') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}