import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE_COOKIE, DEMO_MODE_COOKIE_VALUE } from "@/lib/demo/mode";
import { isDemoKillSwitchOn } from "@/lib/demo/mode.server";
import { isPlatformLive, isStaffRole } from "@/lib/platform";
import {
  getAuthCookieOptions,
  withAuthCookieOptions,
} from "@/lib/supabase/auth-session";

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let supabaseConnect = "";
  let supabaseImg = "";
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).origin;
      supabaseConnect = ` ${host} ${host.replace("https://", "wss://")}`;
      supabaseImg = ` ${host}`;
    } catch {
      /* ignore invalid URL */
    }
  }

  const directives = [
    "default-src 'self'",
    // 'unsafe-inline' is required for Next.js flight/hydration scripts without a nonce pipeline.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https://images.unsplash.com${supabaseImg}`,
    "font-src 'self' data:",
    `connect-src 'self'${supabaseConnect}`,
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

function hasDemoCookie(request: NextRequest) {
  return request.cookies.get(DEMO_MODE_COOKIE)?.value === DEMO_MODE_COOKIE_VALUE;
}

function clearDemoCookie(response: NextResponse) {
  response.cookies.set(DEMO_MODE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

function isCatalogDetail(pathname: string) {
  return /^\/(location|service|event)(\/|$)/.test(pathname);
}

/** Pre-launch legal pages stay open when the public app is still gated. */
function isPublicLegalPage(pathname: string) {
  return (
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/regolamento" ||
    pathname === "/iscriviti"
  );
}

function isDemoBookOrRating(pathname: string) {
  return (
    pathname === "/demo/book" ||
    pathname.startsWith("/demo/book/") ||
    pathname === "/demo/rating" ||
    pathname.startsWith("/demo/rating/")
  );
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

export async function proxy(request: NextRequest) {
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

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const refreshedCookies: {
    name: string;
    value: string;
    options?: Parameters<typeof withAuthCookieOptions>[0];
  }[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const supabase =
    supabaseUrl && supabaseAnon
      ? createServerClient(supabaseUrl, supabaseAnon, {
          cookieOptions: getAuthCookieOptions(),
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value);
              });
              response = NextResponse.next({
                request: {
                  headers: requestHeaders,
                },
              });
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, withAuthCookieOptions(options));
              });
              refreshedCookies.push(...cookiesToSet);
            },
          },
        })
      : null;

  if (supabase) {
    // Refresh session so Server Components see a valid user.
    await supabase.auth.getUser();
  }

  const gated = await gateRequest(request, supabase);
  if (!gated && shouldClearDemoCookie(request)) {
    clearDemoCookie(response);
  }
  const finalResponse = gated ?? response;
  if (gated) {
    refreshedCookies.forEach(({ name, value, options }) => {
      finalResponse.cookies.set(name, value, withAuthCookieOptions(options));
    });
  }

  applySecurityHeaders(finalResponse, csp, isDev);
  return finalResponse;
}

function shouldClearDemoCookie(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return false;
  }
  return isDemoKillSwitchOn() && hasDemoCookie(request);
}

async function gateRequest(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient> | null,
) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    isPublicLegalPage(pathname)
  ) {
    return null;
  }

  const killed = isDemoKillSwitchOn();
  if (killed && (pathname === "/demo" || pathname.startsWith("/demo/"))) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    clearDemoCookie(redirect);
    return redirect;
  }

  const demoOn = !killed && hasDemoCookie(request);

  if (!demoOn && isDemoBookOrRating(pathname)) {
    const redirect = NextResponse.redirect(new URL("/demo", request.url));
    if (killed) clearDemoCookie(redirect);
    return redirect;
  }

  if (!isPlatformLive() && isCatalogDetail(pathname) && !demoOn) {
    const staff = await requestIsStaff(supabase);
    if (!staff) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      if (killed) clearDemoCookie(redirect);
      return redirect;
    }
  }

  return null;
}

async function requestIsStaff(
  supabase: ReturnType<typeof createServerClient> | null,
) {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = data && typeof data.role === "string" ? data.role : null;
  return isStaffRole(role);
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
