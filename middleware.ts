import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Solo proteger dashboards - las APIs se protegen a sí mismas
    const protectedPaths = ['/emisor/dashboard', '/inversionista/dashboard'];

    if (protectedPaths.some(p => pathname.startsWith(p))) {
        const token = request.cookies.get('token')?.value;

        // Verificación ultra simple: solo que exista una cookie token
        if (!token || token.length < 10) {
            console.log('🔒 No token válido, redirect a login');
            const loginUrl = new URL('/auth/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        console.log('🔒 Token presente, permitiendo acceso');
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/emisor/dashboard/:path*', '/inversionista/dashboard/:path*'],
};