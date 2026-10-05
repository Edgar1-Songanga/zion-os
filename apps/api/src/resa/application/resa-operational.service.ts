import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const COMMUNITY_VISIBILITY = ['public', 'private', 'organization'] as const;
const EVENT_VISIBILITY = ['public', 'followers', 'community', 'organization', 'private'] as const;
const REPORT_REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'misinformation', 'copyright', 'other'] as const;

@Injectable()
export class ResaOperationalService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) {
    const user = await this.identity.getCurrentUser(token);
    if (!user?.id) throw new NotFoundException('Authenticated user was not found');
    return user;
  }

  private text(value: unknown, field: string, min = 1, max = 10000): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text`);
    const result = value.trim();
    if (result.length < min) throw new BadRequestException(`${field} is required`);
    if (result.length > max) throw new BadRequestException(`${field} is too long`);
    return result;
  }

  private id(value: unknown, field: string): string {
    const result = this.text(value, field, 1, 80);
    if (!/^[0-9a-f-]{16,80}$/i.test(result)) throw new BadRequestException(`${field} is invalid`);
    return result;
  }

  private slug(value: unknown): string {
    const result = this.text(value, 'slug', 2, 80).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new BadRequestException('slug is invalid');
    return result;
  }

  async listCommunities(token: string, limit = 30) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const communities = await this.db.get<any[]>(
      'resa_communities',
      token,
      `?select=*&status=eq.active&order=created_at.desc&limit=${size}`,
    );
    if (!communities.length) return [];
    const ids = communities.map((item) => item.id).join(',');
    const memberships = await this.db.get<any[]>(
      'resa_community_members',
      token,
      `?select=community_id,status,role&community_id=in.(${ids})&user_id=eq.${actor.id}`,
    );
    const membershipByCommunity = new Map(memberships.map((item) => [item.community_id, item]));
    return communities.map((community) => {
      const membership = membershipByCommunity.get(community.id);
      return {
        ...community,
        membership_status: membership?.status ?? 'not_member',
        membership_role: membership?.role ?? null,
      };
    });
  }

  async createCommunity(token: string, input: { name: unknown; slug: unknown; description?: unknown; visibility?: unknown; organization_id?: unknown }) {
    const actor = await this.actor(token);
    const visibility = input.visibility ?? 'public';
    if (!COMMUNITY_VISIBILITY.includes(visibility as never)) throw new BadRequestException('Invalid community visibility');
    const rows = await this.db.post<any[]>('resa_communities', token, {
      created_by: actor.id,
      name: this.text(input.name, 'name', 2, 120),
      slug: this.slug(input.slug),
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
      visibility,
      organization_id: input.organization_id ? this.id(input.organization_id, 'organization_id') : null,
    });
    return rows[0];
  }

  async joinCommunity(token: string, communityId: string) {
    const actor = await this.actor(token);
    const rows = await this.db.upsert<any[]>('resa_community_members', token, {
      community_id: this.id(communityId, 'community_id'), user_id: actor.id, status: 'active', role: 'member',
    }, '?on_conflict=community_id,user_id');
    return rows[0];
  }

  async leaveCommunity(token: string, communityId: string) {
    const actor = await this.actor(token);
    await this.db.patch('resa_community_members', token, { status: 'left' }, `?community_id=eq.${this.id(communityId, 'community_id')}&user_id=eq.${actor.id}`);
    return { left: true };
  }

  async listEvents(token: string, limit = 30) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const events = await this.db.get<any[]>(
      'resa_events',
      token,
      `?select=*&status=neq.cancelled&order=starts_at.asc&limit=${size}`,
    );
    if (!events.length) return [];
    const ids = events.map((item) => item.id).join(',');
    const responses = await this.db.get<any[]>(
      'resa_event_participants',
      token,
      `?select=event_id,response&event_id=in.(${ids})&user_id=eq.${actor.id}`,
    );
    const responseByEvent = new Map(responses.map((item) => [item.event_id, item.response]));
    return events.map((event) => ({
      ...event,
      my_response: responseByEvent.get(event.id) ?? null,
    }));
  }

  async createEvent(token: string, input: { title: unknown; description?: unknown; starts_at: unknown; ends_at?: unknown; location?: unknown; meeting_url?: unknown; visibility?: unknown; community_id?: unknown; organization_id?: unknown }) {
    const actor = await this.actor(token);
    const visibility = input.visibility ?? 'public';
    if (!EVENT_VISIBILITY.includes(visibility as never)) throw new BadRequestException('Invalid event visibility');
    const startsAt = this.text(input.starts_at, 'starts_at', 1, 80);
    if (Number.isNaN(Date.parse(startsAt))) throw new BadRequestException('starts_at is invalid');
    const endsAt = input.ends_at ? this.text(input.ends_at, 'ends_at', 1, 80) : null;
    if (endsAt && (Number.isNaN(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt))) throw new BadRequestException('ends_at must be after starts_at');
    const rows = await this.db.post<any[]>('resa_events', token, {
      created_by: actor.id,
      title: this.text(input.title, 'title', 2, 160),
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      location: typeof input.location === 'string' ? input.location.trim() || null : null,
      meeting_url: typeof input.meeting_url === 'string' ? input.meeting_url.trim() || null : null,
      visibility,
      community_id: input.community_id ? this.id(input.community_id, 'community_id') : null,
      organization_id: input.organization_id ? this.id(input.organization_id, 'organization_id') : null,
    });
    return rows[0];
  }

  async respondToEvent(token: string, eventId: string, response: string) {
    const actor = await this.actor(token);
    if (!['interested', 'going', 'declined'].includes(response)) throw new BadRequestException('Invalid event response');
    const rows = await this.db.upsert<any[]>('resa_event_participants', token, {
      event_id: this.id(eventId, 'event_id'), user_id: actor.id, response,
    }, '?on_conflict=event_id,user_id');
    return rows[0];
  }

  async listPrayerRequests(token: string, limit = 30) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const prayers = await this.db.get<any[]>('resa_prayer_requests', token, `?select=id,author_id,title,body,visibility,status,created_at,answered_at&status=neq.archived&order=created_at.desc&limit=${size}`);
    if (!prayers.length) return [];
    const ids = prayers.map((p) => p.id).join(',');
    const intercessions = await this.db.get<any[]>('resa_prayer_intercessions', token, `?select=prayer_id,user_id&prayer_id=in.(${ids})`);
    const own = new Set(intercessions.filter((row) => row.user_id === actor.id).map((row) => row.prayer_id));
    const counts = new Map<string, number>();
    for (const row of intercessions) counts.set(row.prayer_id, (counts.get(row.prayer_id) ?? 0) + 1);
    return prayers.map((prayer) => ({ ...prayer, intercession_count: counts.get(prayer.id) ?? 0, has_interceded: own.has(prayer.id) }));
  }

  async createPrayerRequest(token: string, input: { title: unknown; body: unknown; visibility?: unknown; organization_id?: unknown }) {
    const actor = await this.actor(token);
    const visibility = input.visibility ?? 'community';
    if (!['public', 'community', 'organization', 'private'].includes(visibility as string)) throw new BadRequestException('Invalid prayer visibility');
    const rows = await this.db.post<any[]>('resa_prayer_requests', token, {
      author_id: actor.id, title: this.text(input.title, 'title', 3, 160), body: this.text(input.body, 'body', 3, 5000),
      visibility, organization_id: input.organization_id ? this.id(input.organization_id, 'organization_id') : null,
    });
    return { ...rows[0], intercession_count: 0, has_interceded: false };
  }

  async intercedeForPrayer(token: string, prayerId: string) {
    const actor = await this.actor(token);
    const id = this.id(prayerId, 'prayer_id');
    const prayer = await this.db.get<any[]>('resa_prayer_requests', token, `?select=id,status&id=eq.${id}&limit=1`);
    if (!prayer[0]) throw new NotFoundException('Prayer request not found');
    if (prayer[0].status !== 'active') throw new BadRequestException('This prayer request is no longer active');
    const rows = await this.db.upsert<any[]>('resa_prayer_intercessions', token, { prayer_id: id, user_id: actor.id }, '?on_conflict=prayer_id,user_id');
    return { prayer_id: id, user_id: actor.id, interceded: true, record: rows[0] };
  }

  async removeIntercession(token: string, prayerId: string) {
    const actor = await this.actor(token);
    const id = this.id(prayerId, 'prayer_id');
    await this.db.delete('resa_prayer_intercessions', token, `?prayer_id=eq.${id}&user_id=eq.${actor.id}`);
    return { prayer_id: id, user_id: actor.id, interceded: false };
  }

  async answerPrayerRequest(token: string, prayerId: string) {
    const actor = await this.actor(token);
    const id = this.id(prayerId, 'prayer_id');
    const rows = await this.db.patch<any[]>('resa_prayer_requests', token, { status: 'answered', answered_at: new Date().toISOString() }, `?id=eq.${id}&author_id=eq.${actor.id}&status=eq.active`);
    if (!rows[0]) throw new NotFoundException('Active prayer request not found');
    return rows[0];
  }

  async listLiveSessions(token: string, limit = 30) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    return this.db.get('resa_live_sessions', token, `?select=*&or=(visibility.eq.public,host_id.eq.${actor.id})&status=neq.ended&order=scheduled_at.asc.nullslast,created_at.desc&limit=${size}`);
  }

  async createLiveSession(token: string, input: { title: unknown; description?: unknown; visibility?: unknown; scheduled_at?: unknown }) {
    const actor = await this.actor(token);
    const visibility = input.visibility ?? 'public';
    if (!['public', 'followers', 'community', 'organization', 'private'].includes(visibility as string)) throw new BadRequestException('Invalid live visibility');
    const scheduledAt = input.scheduled_at ? this.text(input.scheduled_at, 'scheduled_at', 1, 80) : null;
    if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) throw new BadRequestException('scheduled_at is invalid');
    const rows = await this.db.post<any[]>('resa_live_sessions', token, {
      host_id: actor.id, title: this.text(input.title, 'title', 2, 160),
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
      visibility, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, status: 'scheduled',
    });
    return rows[0];
  }

  async updateLiveStatus(token: string, liveId: string, status: 'scheduled' | 'live' | 'ended') {
    const actor = await this.actor(token);
    const id = this.id(liveId, 'live_id');
    if (!['scheduled', 'live', 'ended'].includes(status)) throw new BadRequestException('Invalid live status');
    const patch: Record<string, string | null> = { status };
    if (status === 'live') patch.started_at = new Date().toISOString();
    if (status === 'ended') patch.ended_at = new Date().toISOString();
    const rows = await this.db.patch<any[]>('resa_live_sessions', token, patch, `?id=eq.${id}&host_id=eq.${actor.id}`);
    if (!rows[0]) throw new NotFoundException('Live session not found');
    return rows[0];
  }

  async createConversation(token: string, memberIds: unknown[], title?: unknown) {
    const actor = await this.actor(token);
    if (!Array.isArray(memberIds) || memberIds.length > 0 && memberIds.length > 49) throw new BadRequestException('member_ids is invalid');
    const members = [...new Set([actor.id, ...memberIds.map((value) => this.id(value, 'member_id'))])];
    const conversationRows = await this.db.post<any[]>('resa_conversations', token, { created_by: actor.id, kind: members.length > 2 ? 'group' : 'direct', title: typeof title === 'string' ? title.trim() || null : null });
    const conversation = conversationRows[0];
    if (!conversation?.id) throw new Error('Conversation could not be created');
    await this.db.post('resa_conversation_members', token, members.map((userId) => ({ conversation_id: conversation.id, user_id: userId, role: userId === actor.id ? 'owner' : 'member' })));
    return conversation;
  }

  async listConversations(token: string) {
    const actor = await this.actor(token);
    const members = await this.db.get<any[]>('resa_conversation_members', token, `?select=conversation_id,role,joined_at,last_read_at&user_id=eq.${actor.id}&order=joined_at.desc`);
    if (!members.length) return [];
    const ids = members.map((item) => item.conversation_id).join(',');
    return this.db.get('resa_conversations', token, `?select=*&id=in.(${ids})&order=updated_at.desc`);
  }

  async listMessages(token: string, conversationId: string, limit = 50) {
    const actor = await this.actor(token);
    const id = this.id(conversationId, 'conversation_id');
    await this.db.get('resa_conversation_members', token, `?select=conversation_id&conversation_id=eq.${id}&user_id=eq.${actor.id}&limit=1`);
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.db.get('resa_messages', token, `?select=*&conversation_id=eq.${id}&order=created_at.desc&limit=${size}`);
  }

  async sendMessage(token: string, conversationId: string, body: unknown, parentMessageId?: unknown) {
    const actor = await this.actor(token);
    const id = this.id(conversationId, 'conversation_id');
    const membership = await this.db.get<any[]>('resa_conversation_members', token, `?select=conversation_id&conversation_id=eq.${id}&user_id=eq.${actor.id}&limit=1`);
    if (!membership.length) throw new NotFoundException('Conversation not found');
    let parentId: string | null = null;
    if (parentMessageId) {
      parentId = this.id(parentMessageId, 'parent_message_id');
      const parent = await this.db.get<any[]>('resa_messages', token, `?select=id&conversation_id=eq.${id}&id=eq.${parentId}&limit=1`);
      if (!parent.length) throw new NotFoundException('Parent message not found');
    }
    const rows = await this.db.post<any[]>('resa_messages', token, { conversation_id: id, sender_id: actor.id, body: this.text(body, 'body', 1, 10000), parent_message_id: parentId });
    const message = rows[0];
    const members = await this.db.get<any[]>('resa_conversation_members', token, `?select=user_id&conversation_id=eq.${id}&user_id=neq.${actor.id}`);
    if (members.length && message?.id) {
      await this.db.post('resa_notifications', token, members.map((member) => ({ user_id: member.user_id, actor_id: actor.id, type: parentId ? 'message_reply' : 'message', title: parentId ? 'Nova resposta' : 'Nova mensagem', body: this.text(body, 'body', 1, 10000).slice(0, 240), conversation_id: id, message_id: message.id })));
    }
    return message;
  }

  async listNotifications(token: string, limit = 30) {
    const actor = await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    return this.db.get('resa_notifications', token, `?select=*&user_id=eq.${actor.id}&order=created_at.desc&limit=${size}`);
  }

  async markNotificationRead(token: string, notificationId: string) {
    const actor = await this.actor(token);
    const id = this.id(notificationId, 'notification_id');
    const rows = await this.db.patch<any[]>('resa_notifications', token, { read_at: new Date().toISOString() }, `?id=eq.${id}&user_id=eq.${actor.id}`);
    if (!rows[0]) throw new NotFoundException('Notification not found');
    return rows[0];
  }

  async markNotificationsRead(token: string) {
    const actor = await this.actor(token);
    await this.db.patch('resa_notifications', token, { read_at: new Date().toISOString() }, `?user_id=eq.${actor.id}&read_at=is.null`);
    return { read: true };
  }

  async report(token: string, input: { content_id?: unknown; message_id?: unknown; reason: unknown; details?: unknown }) {
    const actor = await this.actor(token);
    const contentId = input.content_id ? this.id(input.content_id, 'content_id') : null;
    const messageId = input.message_id ? this.id(input.message_id, 'message_id') : null;
    if ((contentId ? 1 : 0) + (messageId ? 1 : 0) !== 1) throw new BadRequestException('Exactly one report target is required');
    const reason = this.text(input.reason, 'reason', 1, 40);
    if (!REPORT_REASONS.includes(reason as never)) throw new BadRequestException('Invalid report reason');
    let organizationId: string | null = null;
    if (contentId) {
      const content = (await this.db.get<any[]>('resa_contents', token, `?select=organization_id&id=eq.${contentId}&limit=1`))[0];
      organizationId = content?.organization_id ?? null;
    }
    const rows = await this.db.post<any[]>('resa_moderation_reports', token, {
      reporter_id: actor.id, content_id: contentId, message_id: messageId, organization_id: organizationId, reason,
      details: typeof input.details === 'string' ? input.details.trim() || null : null,
    });
    return rows[0];
  }

  async moderationQueue(token: string, status = 'open', limit = 50) {
    await this.actor(token);
    const size = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const allowed = ['open', 'reviewing', 'resolved', 'dismissed'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid moderation status');
    return this.db.get('resa_moderation_reports', token, `?select=*&status=eq.${status}&order=created_at.asc&limit=${size}`);
  }

  async moderateReport(token: string, reportId: string, status: 'reviewing' | 'resolved' | 'dismissed') {
    const actor = await this.actor(token);
    if (!['reviewing', 'resolved', 'dismissed'].includes(status)) throw new BadRequestException('Invalid moderation action');
    const id = this.id(reportId, 'report_id');
    const rows = await this.db.patch<any[]>('resa_moderation_reports', token, {
      status, reviewed_by: actor.id, reviewed_at: new Date().toISOString(),
    }, `?id=eq.${id}`);
    if (!rows[0]) throw new NotFoundException('Moderation report was not found or access was denied');
    return rows[0];
  }

  async search(token: string, query: string, type?: string, limit = 30) {
    await this.actor(token);
    const normalized = this.text(query, 'query', 2, 120).replace(/[(),]/g, ' ');
    const size = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const typeFilter = type ? `&entity_type=eq.${encodeURIComponent(this.text(type, 'type', 1, 40))}` : '';
    return this.db.get('zion_search_documents', token, `?select=*&or=(title.ilike.*${encodeURIComponent(normalized)}*,body.ilike.*${encodeURIComponent(normalized)}*)&order=updated_at.desc&limit=${size}${typeFilter}`);
  }
}