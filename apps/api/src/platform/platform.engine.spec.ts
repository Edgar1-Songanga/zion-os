import { PlatformEngine } from './platform.engine';

describe('PlatformEngine', () => {
  it('creates a queued job with a durable identity', () => {
    const job = new PlatformEngine().job('search.index', { entityId: 'abc' });
    expect(job.id).toMatch(/^[0-9a-f-]{16,}$/i);
    expect(job.status).toBe('queued');
    expect(job.attempts).toBe(0);
  });

  it('normalizes searchable documents without changing identity fields', () => {
    const document = new PlatformEngine().normalizeSearch({ id: '1', type: 'content', title: '  Hello  ', body: '  World  ' });
    expect(document).toEqual({ id: '1', type: 'content', title: 'Hello', body: 'World' });
  });
});
