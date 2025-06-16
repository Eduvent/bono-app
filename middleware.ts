import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const protectedPaths = ['/api/bonds', '/api/emisor', '/emisor', '/inversionista'];
    if (protectedPaths.some(p => pathname.startsWith(p))) {
        const token = request.cookies.get('token')?.value;
        if (!token || !verifyToken(token)) {
            const loginUrl = new URL('/auth/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/api/bonds/:path*','/api/emisor/:path*','/emisor/:path*','/inversionista/:path*'],
};