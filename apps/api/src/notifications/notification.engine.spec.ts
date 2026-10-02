import { NotificationEngine } from './notification.engine';

describe('NotificationEngine', () => {
  it('respects enabled channels and muted types', () => {
    const engine = new NotificationEngine();
    const preferences = { userId: 'u1', enabled: true, channels: ['in_app'] as const, mutedTypes: ['resa.comment'] };
    expect(engine.shouldDeliver({ type: 'resa.follow', channel: 'in_app' }, preferences)).toBe(true);
    expect(engine.shouldDeliver({ type: 'resa.comment', channel: 'in_app' }, preferences)).toBe(false);
    expect(engine.shouldDeliver({ type: 'resa.follow', channel: 'email' }, preferences)).toBe(false);
  });

  it('creates a notification with generated id and timestamp', () => {
    const notification = new NotificationEngine().create({ userId: 'u1', type: 'resa.follow', title: 'Follow', body: 'New follow', channel: 'in_app', priority: 'normal' });
    expect(notification.id).toMatch(/^[0-9a-f-]{16,}$/i);
    expect(new Date(notification.createdAt).toString()).not.toBe('Invalid Date');
  });
});
