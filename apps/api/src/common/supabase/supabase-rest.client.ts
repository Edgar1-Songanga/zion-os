import { Injectable } from '@nestjs/common';
import { assertSupabaseConfig, env } from '../../config/env';

type SupabaseErrorPayload = {
  code?: unknown;
  error?: { code?: unknown };
};

@Injectable()
export class SupabaseRestClient {
  private headers(accessToken: string, extra?: Record<string, string>) {
    assertSupabaseConfig();
    return {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async get<T>(table: string, accessToken: string, query = ''): Promise<T> {
    return this.request<T>(`GET ${table}`, `${env.supabaseUrl}/rest/v1/${table}${query}`, {
      headers: this.headers(accessToken),
    });
  }

  async post<T>(table: string, accessToken: string, body: unknown, query = ''): Promise<T> {
    return this.request<T>(`POST ${table}`, `${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
  }

  async rpc<T>(fn: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(`RPC ${fn}`, `${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify(body),
    });
  }

  async upsert<T>(table: string, accessToken: string, body: unknown, query = ''): Promise<T> {
    return this.request<T>(`UPSERT ${table}`, `${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: this.headers(accessToken, {
        Prefer: 'return=representation,resolution=merge-duplicates',
      }),
      body: JSON.stringify(body),
    });
  }

  async patch<T>(table: string, accessToken: string, body: unknown, query: string): Promise<T> {
    return this.request<T>(`PATCH ${table}`, `${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'PATCH',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
  }

  async delete<T>(table: string, accessToken: string, query: string): Promise<T> {
    return this.request<T>(`DELETE ${table}`, `${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'DELETE',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
    });
  }

  private async request<T>(operation: string, url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      console.error(JSON.stringify({
        event: 'zion_supabase_transport_failure',
        operation,
        failureKind: 'network_or_dns',
      }));
      throw new Error(`Supabase transport failed during ${operation}`);
    }
    return this.parse<T>(response, operation);
  }

  private async parse<T>(response: Response, operation: string): Promise<T> {
    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      const errorPayload = (typeof payload === 'object' && payload ? payload : {}) as SupabaseErrorPayload;
      const nested = errorPayload.error;
      const codeValue = errorPayload.code ?? nested?.code;
      const code = typeof codeValue === 'string' ? codeValue : 'unknown';
      const failureKind =
        ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code) ? 'schema_mismatch'
        : code === '42501' ? 'database_permission'
        : response.status === 401 || response.status === 403 ? 'auth_or_rls'
        : response.status >= 500 ? 'supabase_upstream'
        : 'database_rejection';

      // Never log SQL values, bearer tokens, or user-supplied error text.
      // Operation + status + PostgreSQL/PostgREST code are enough to classify common 500 causes.
      console.error(JSON.stringify({
        event: 'zion_supabase_rest_failure',
        operation,
        status: response.status,
        code,
        failureKind,
      }));

      throw new Error(`Supabase ${operation} failed (HTTP ${response.status}; code ${code})`);
    }

    return payload as T;
  }
}
