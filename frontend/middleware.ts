import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIX = '/app';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('pureflow_auth');
  const isLoggedIn = !!authCookie;

  if (isLoggedIn && pathname.startsWith('/login'))
    return NextResponse.redirect(new URL('/app/dashboard', request.url));

  if (!isLoggedIn && pathname.startsWith(PROTECTED_PREFIX))
    return NextResponse.redirect(new URL('/login', request.url));

  if (pathname === '/') return NextResponse.next();
  if (pathname.startsWith('/not-authorized')) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};