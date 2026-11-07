import { createClient } from "@/lib/supabase/client";

type AccessContext = Awaited<ReturnType<typeof readAccessContext>>;
let accessContextInFlight: Promise<AccessContext> | null = null;

async function readAccessContext() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw new Error("Não foi possível validar a sessão RESA.");

  const session = data.session;
  if (!session?.access_token) throw new Error("Sessão ZION não encontrada.");

  return { supabase, session };
}

async function getAccessContext(): Promise<AccessContext> {
  // RESA opens several independent panels at once. Share the session lookup
  // while it is in flight instead of making every panel read auth storage again.
  if (!accessContextInFlight) {
    accessContextInFlight = readAccessContext();
  }
  const current = accessContextInFlight;
  try {
    return await current;
  } finally {
    if (accessContextInFlight === current) accessContextInFlight = null;
  }
}

export async function resaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const request = async (token: string) => {
    try {
      return await fetch(`/api/resa${normalizedPath}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch {
      throw new Error("Não foi possível comunicar com o serviço RESA. Verifique a ligação à API.");
    }
  };

  const { supabase, session } = await getAccessContext();
  let response = await request(session.access_token);

  // Refresh and retry once only when the server rejects the current token.
  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      response = await request(data.session.access_token);
    } else {
      throw new Error("A sessão ZION expirou. Entre novamente para continuar.");
    }
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : "Falha ao comunicar com o RESA.",
    );
  }

  return payload as T;
}
