import { NextResponse, type NextRequest } from "next/server";

const BLOCKED_PATH_PATTERNS = [
  /^\/\.env(?:$|\/)/i,
  /^\/\.git(?:$|\/)/i,
  /^\/wp-admin(?:$|\/)/i,
  /^\/wp-login\.php$/i,
  /^\/phpmyadmin(?:$|\/)/i,
  /^\/admin\.php$/i,
  /^\/xmlrpc\.php$/i,
  /^\/vendor\/phpunit(?:$|\/)/i,
  /^\/\.aws(?:$|\/)/i,
  /^\/config\.json$/i,
  /^\/\.DS_Store$/i,
];

/**
 * Practical CSP for Next.js App Router.
 * Next injects inline RSC flight scripts (`self.__next_f.push(...)`) that MUST
 * be allowed — `script-src 'self'` alone blanks the client UI after SSR chrome.
 */
function buildCsp(isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'unsafe-inline' is required for Next.js flight/hydration scripts without a nonce pipeline.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "child-src 'none'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ").replace(/\s{2,}/g, " ").trim();
}

function applySecurityHeaders(response: NextResponse, csp: string, isDev: boolean) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  response.headers.delete("x-powered-by");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (method === "TRACE" || method === "TRACK") {
    return new NextResponse(null, { status: 405 });
  }

  if (BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  applySecurityHeaders(response, csp, isDev);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
