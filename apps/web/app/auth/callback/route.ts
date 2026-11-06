import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";

  let destination = new URL("/dashboard", requestUrl.origin);
  try {
    const candidate = new URL(requestedNext, requestUrl.origin);
    if (
      candidate.origin === requestUrl.origin &&
      candidate.pathname.startsWith("/") &&
      !candidate.pathname.startsWith("//")
    ) {
      destination = candidate;
    }
  } catch {
    // Invalid or external redirect targets fall back to the dashboard.
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(destination);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  const errorResponse = NextResponse.redirect(new URL("/auth/auth-code-error", requestUrl.origin));
  errorResponse.headers.set("Cache-Control", "private, no-store");
  return errorResponse;
}
