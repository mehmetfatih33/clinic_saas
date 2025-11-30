import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Skip middleware for NextAuth API routes
  if (req.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Get the token from the request
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = token.role as string;
  const path = req.nextUrl.pathname;

  // Define role-based access rules
  const accessRules = {
    '/specialists': ['ADMIN'],
    '/assignments': ['ADMIN'], 
    '/exports': ['ADMIN'],
    '/reports': ['ADMIN'],
    '/clinics': ['ADMIN'],
    '/finance': ['ADMIN', 'ASISTAN', 'UZMAN'],
    '/appointments': ['ADMIN', 'ASISTAN', 'UZMAN'],
    '/notes': ['ADMIN', 'UZMAN'],
    '/patients': ['ADMIN', 'ASISTAN', 'UZMAN'],
    '/dashboard': ['ADMIN', 'ASISTAN', 'UZMAN']
  };

  // Check if the current path requires role-based access control
  for (const [routePath, allowedRoles] of Object.entries(accessRules)) {
    if (path.startsWith(routePath)) {
      if (!allowedRoles.includes(role)) {
        // Redirect unauthorized users to dashboard
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/appointments/:path*",
    "/notes/:path*",
    "/exports/:path*",
    "/specialists/:path*",
    "/assignments/:path*",
    "/reports/:path*",
    "/clinics/:path*",
    "/finance/:path*",
  ],
};
