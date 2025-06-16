import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

const prisma = new PrismaClient();

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

export async function POST(request: NextRequest) {
    try {
        const { email, password } = LoginSchema.parse(await request.json());

        const user = await prisma.user.findUnique({
            where: { email },
            include: { emisorProfile: true, inversionistaProfile: true }
        });
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken({ userId: user.id });

        const response = NextResponse.json({
            success: true,
            user: {
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
            }
        });
        const secureCookie = process.env.SECURE_COOKIES === 'true';
        response.cookies.set({
            name: 'token',
            value: token,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
            secure: secureCookie
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        return response;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }
        console.error('login error', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}