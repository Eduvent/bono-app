import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Implementar autenticación JWT si es necesario
    // Por ahora, permitir todas las rutas
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/bonds/:path*',
        '/api/emisor/:path*',
        '/emisor/:path*',
        '/inversionista/:path*',
    ],
};