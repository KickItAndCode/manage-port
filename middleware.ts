import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/", 
  "/sign-in(.*)", 
  "/sign-up(.*)", 
  "/landing"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    // Allow public routes but still add security headers
    return addSecurityHeaders(NextResponse.next());
  }
  
  // Protect non-public routes
  const authResult = await auth();
  if (!authResult.userId) {
    // Redirect to sign-in if not authenticated
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Add security headers to all responses
  return addSecurityHeaders(NextResponse.next());
});

// Enhanced security headers
function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.convex.cloud https://clerk.com https://*.clerk.accounts.dev wss://*.convex.cloud",
      "frame-src 'self' https://clerk.com https://*.clerk.accounts.dev",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // X-Frame-Options (prevent clickjacking)
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options (prevent MIME sniffing)
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Referrer-Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // X-DNS-Prefetch-Control
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // Permissions-Policy
  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "browsing-topics=()",
    ].join(", ")
  );

  // Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 