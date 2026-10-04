import { createClient } from "@/lib/supabase/client";

const RESA_API_URL = process.env.NEXT_PUBLIC_ZION_API_URL?.replace(/\/+$/, "");

export async function resaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!RESA_API_URL) {
    throw new Error("NEXT_PUBLIC_ZION_API_URL não está configurada.");
  }

  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão ZION não encontrada.");

  const response = await fetch(
    `${RESA_API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : "Falha ao comunicar com o RESA.",
    );
  }
  return payload as T;
}
