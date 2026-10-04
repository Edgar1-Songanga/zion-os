import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_ZION_API_URL?.replace(/\/+$/, "");

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!API_URL) return NextResponse.json({ message: "NEXT_PUBLIC_ZION_API_URL não está configurada." }, { status: 500 });
  const { path } = await params;
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  try {
    const headers = new Headers();
    const authorization = request.headers.get("authorization");
    const contentType = request.headers.get("content-type");
    if (authorization) headers.set("authorization", authorization);
    if (contentType) headers.set("content-type", contentType);
    const init: RequestInit = { method: request.method, headers, cache: "no-store" };
    if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();
    const response = await fetch(target, init);
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Não foi possível alcançar a API RESA. O serviço de rede/API precisa de atenção." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
