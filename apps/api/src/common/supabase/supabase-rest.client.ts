import { assertSupabaseConfig, env } from '../../config/env';

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
    const response = await fetch(`${env.supabaseUrl}/rest/v1/${table}${query}`, {
      headers: this.headers(accessToken),
    });
    return this.parse<T>(response);
  }

  async post<T>(table: string, accessToken: string, body: unknown, query = ''): Promise<T> {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  async rpc<T>(fn: string, accessToken: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this.headers(accessToken),
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  async upsert<T>(table: string, accessToken: string, body: unknown, query = ''): Promise<T> {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'POST',
      headers: this.headers(accessToken, {
        Prefer: 'return=representation,resolution=merge-duplicates',
      }),
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  async patch<T>(table: string, accessToken: string, body: unknown, query: string): Promise<T> {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'PATCH',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
      body: JSON.stringify(body),
    });
    return this.parse<T>(response);
  }

  async delete<T>(table: string, accessToken: string, query: string): Promise<T> {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/${table}${query}`, {
      method: 'DELETE',
      headers: this.headers(accessToken, { Prefer: 'return=representation' }),
    });
    return this.parse<T>(response);
  }

  private async parse<T>(response: Response): Promise<T> {
    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : 'Supabase request failed';
      throw new Error(message);
    }
    return payload as T;
  }
}
