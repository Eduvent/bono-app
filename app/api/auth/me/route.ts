import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value ||
        request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { emisorProfile: true, inversionistaProfile: true }
    });
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
        id: user.id,
        email: user.email,
        role: user.role,
        emisorProfile: user.emisorProfile ? {
            id: user.emisorProfile.id,
            companyName: user.emisorProfile.companyName
        } : undefined,
        inversionistaProfile: user.inversionistaProfile ? {
            id: user.inversionistaProfile.id,
            firstName: user.inversionistaProfile.firstName,
            lastName: user.inversionistaProfile.lastName
        } : undefined
    });
}