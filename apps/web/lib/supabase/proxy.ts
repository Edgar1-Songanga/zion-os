import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/ministry",
  "/youth",
  "/resa",
  "/bible-engine",
  "/communities",
  "/spiritual-chat",
  "/admin",
  "/finance",
  "/reports",
  "/secretariat",
  "/church-administration",
  "/hr",
  "/payroll",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: claimsData } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claimsData?.claims?.sub);
  const { pathname, search } = request.nextUrl;
  if (!isAuthenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (isAuthenticated && (pathname === "/auth/sign-in" || pathname === "/auth/sign-up")) {
    const requestedNext = request.nextUrl.searchParams.get("next");
    let destination = new URL("/dashboard", request.nextUrl.origin);
    if (requestedNext) {
      try {
        const candidate = new URL(requestedNext, request.nextUrl.origin);
        if (candidate.origin === request.nextUrl.origin && candidate.pathname.startsWith("/") && !candidate.pathname.startsWith("//")) {
          destination = candidate;
        }
      } catch {
        // Ignore malformed or external redirect targets and use the dashboard.
      }
    }
    return NextResponse.redirect(destination);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
