export interface DomainEvent<T = unknown> { id: string; type: string; aggregateId: string; occurredAt: string; payload: T; }
export interface Job<T = unknown> { id: string; type: string; status: "queued" | "running" | "completed" | "failed"; attempts: number; payload: T; }
export interface SearchDocument { id: string; type: string; title: string; body?: string; language?: string; tenantId?: string; }
export class PlatformEngine {
  event<T>(type: string, aggregateId: string, payload: T): DomainEvent<T> { return { id: crypto.randomUUID(), type, aggregateId, occurredAt: new Date().toISOString(), payload }; }
  job<T>(type: string, payload: T): Job<T> { return { id: crypto.randomUUID(), type, status: "queued", attempts: 0, payload }; }
  normalizeSearch(document: SearchDocument): SearchDocument { return { ...document, title: document.title.trim(), body: document.body?.trim() }; }
}
