import { createClient } from "@/lib/supabase/client";

export async function resaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const supabase = createClient();
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error("Não foi possível validar a sessão RESA.");
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão ZION não encontrada.");

  let response: Response;
  try {
    response = await fetch(`/api/resa${normalizedPath}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new Error("Não foi possível comunicar com o serviço RESA. Verifique a ligação à API.");
  }

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = { message: raw }; }
  }
  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload && "message" in payload ? String(payload.message) : "Falha ao comunicar com o RESA.");
  }
  return payload as T;
}
