import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const ProfileSchema = z.object({
    companyName: z.string().min(1),
    ruc: z.string().min(1),
    sector: z.string().optional(),
    country: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = ProfileSchema.parse(await request.json());

        const profile = await prisma.emisorProfile.upsert({
            where: { userId: payload.userId },
            update: {
                companyName: data.companyName,
                ruc: data.ruc,
                industry: data.sector,
                address: data.country,
            },
            create: {
                userId: payload.userId,
                companyName: data.companyName,
                ruc: data.ruc,
                contactPerson: data.companyName,
                industry: data.sector,
                address: data.country,
            },
        });

        return NextResponse.json({
            success: true,
            profile: {
                id: profile.id,
                companyName: profile.companyName,
                ruc: profile.ruc,
            },
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
        }
        console.error('Error saving emisor profile', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}