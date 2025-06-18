import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, BondStatus } from '../../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const UpdateStatusSchema = z.object({
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bondId: string }> }
) {
    try {
        const { bondId } = await params;
        const { status } = UpdateStatusSchema.parse(await request.json());
        const prismaStatus = BondStatus[status as keyof typeof BondStatus];

        const updatedBond = await prisma.bond.update({
            where: { id: bondId },
            data: { status: prismaStatus },
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