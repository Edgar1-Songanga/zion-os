import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { IdentityController } from '../src/identity/presentation/identity.controller';
import { IdentityService } from '../src/identity/application/identity.service';
import { ResaController } from '../src/resa/presentation/resa.controller';
import { ResaSocialService } from '../src/resa/application/resa-social.service';
import { ResaOperationalController } from '../src/resa/presentation/resa-operational.controller';
import { ResaOperationalService } from '../src/resa/application/resa-operational.service';
import { ResaLiveEgressService } from '../src/resa/application/resa-live-egress.service';
import { ResaGroupMeetingService } from '../src/resa/application/resa-group-meeting.service';
import { ResaFeedMemoryController } from '../src/resa/presentation/feed-memory.controller';
import { ResaFeedMemoryService } from '../src/resa/application/feed-memory.service';

const TOKEN = 'resa-http-e2e-token';
const AUTHORIZATION = `Bearer ${TOKEN}`;
const MEETING_ID = '97100000-0000-4000-8000-000000000001';
const USER_ID = '97000000-0000-4000-8000-000000000004';

describe('RESA HTTP contracts (e2e)', () => {
  let app: INestApplication;

  const identity = {
    getCurrentUser: jest.fn(),
  };
  const social = {
    listContent: jest.fn(),
    feed: jest.fn(),
    createContent: jest.fn(),
    blockProfile: jest.fn(),
  };
  const operational = {
    listMessages: jest.fn(),
    sendMessage: jest.fn(),
    callJoinConfig: jest.fn(),
    listLiveChatMessages: jest.fn(),
    listLiveHandRaises: jest.fn(),
    raiseLiveHand: jest.fn(),
    withdrawLiveHand: jest.fn(),
    resolveLiveHand: jest.fn(),
  };
  const liveEgress = {};
  const groupMeetings = {
    handRaises: jest.fn(),
    raiseHand: jest.fn(),
    withdrawHandRaise: jest.fn(),
    resolveHandRaise: jest.fn(),
  };
  const feedMemory = {
    recordImpression: jest.fn(),
    resetMemory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        IdentityController,
        ResaController,
        ResaOperationalController,
        ResaFeedMemoryController,
      ],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: ResaSocialService, useValue: social },
        { provide: ResaOperationalService, useValue: operational },
        { provide: ResaLiveEgressService, useValue: liveEgress },
        { provide: ResaGroupMeetingService, useValue: groupMeetings },
        { provide: ResaFeedMemoryService, useValue: feedMemory },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated feed and meeting queue requests before invoking services', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/resa/feed')
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/resa/group-meetings/${MEETING_ID}/hand-raises`)
      .expect(401);

    expect(social.feed).not.toHaveBeenCalled();
    expect(groupMeetings.handRaises).not.toHaveBeenCalled();
  });

  it('resolves the current identity only from a bearer token', async () => {
    identity.getCurrentUser.mockResolvedValueOnce({
      id: USER_ID,
      email: 'member@example.test',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    expect(response.body).toEqual({
      id: USER_ID,
      email: 'member@example.test',
    });
    expect(identity.getCurrentUser).toHaveBeenCalledWith(TOKEN);
  });

  it('propagates invalid bearer-token rejection from the identity provider', async () => {
    identity.getCurrentUser.mockRejectedValueOnce(
      new UnauthorizedException('Invalid access token'),
    );

    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', AUTHORIZATION)
      .expect(401);

    expect(identity.getCurrentUser).toHaveBeenCalledWith(TOKEN);
  });

  it('serves institutional publications in the authenticated personalized RESA feed', async () => {
    social.feed.mockResolvedValueOnce({
      items: [
        {
          id: 'content-1',
          author_id: USER_ID,
          type: 'text',
          title: 'Community reflection',
          visibility: 'public',
          language: 'pt',
          created_at: '2026-11-10T08:00:00.000Z',
        },
        {
          id: 'institution-1',
          author_id: '97100000-0000-4000-8000-000000000002',
          type: 'bible_study',
          title: 'Jovens Adultos',
          body: 'Classe da Escola Sabatina',
          visibility: 'public',
          language: 'pt',
          created_at: '2026-11-10T07:00:00.000Z',
          is_institutional: true,
          institution_name: 'Igreja Central',
          ministry_name: 'Escola Sabatina',
          feed_item_type: 'institutional',
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/resa/feed?limit=10')
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[1]).toMatchObject({
      is_institutional: true,
      institution_name: 'Igreja Central',
      ministry_name: 'Escola Sabatina',
      feed_item_type: 'institutional',
    });
    expect(social.feed).toHaveBeenCalledWith(TOKEN, 10, 'for_you', undefined);
  });

  it('routes personalized feed filters and pagination to the social service', async () => {
    social.feed.mockResolvedValueOnce([{ id: 'content-1' }]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/resa/feed?limit=12&mode=following&before=cursor-1')
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    expect(response.body).toEqual([{ id: 'content-1' }]);
    expect(social.feed).toHaveBeenCalledWith(TOKEN, 12, 'following', 'cursor-1');
  });

  it('routes content creation and profile blocking through authenticated endpoints', async () => {
    const content = {
      content_type: 'POST',
      body: 'A public community update',
      visibility: 'PUBLIC',
    };
    social.createContent.mockResolvedValueOnce({ id: 'content-2', ...content });
    social.blockProfile.mockResolvedValueOnce({ blocked: true, user_id: USER_ID });

    const created = await request(app.getHttpServer())
      .post('/api/v1/resa/content')
      .set('Authorization', AUTHORIZATION)
      .send(content)
      .expect(201);

    const blocked = await request(app.getHttpServer())
      .post(`/api/v1/resa/profiles/${USER_ID}/block`)
      .set('Authorization', AUTHORIZATION)
      .expect(201);

    expect(created.body.id).toBe('content-2');
    expect(blocked.body.blocked).toBe(true);
    expect(social.createContent).toHaveBeenCalledWith(TOKEN, content);
    expect(social.blockProfile).toHaveBeenCalledWith(TOKEN, USER_ID);
  });

  it('routes persistent direct messages, live chat and call join configuration', async () => {
    operational.listMessages.mockResolvedValueOnce([{ id: 'message-1' }]);
    operational.sendMessage.mockResolvedValueOnce({ id: 'message-2' });
    operational.listLiveChatMessages.mockResolvedValueOnce([{ id: 'live-message-1' }]);
    operational.callJoinConfig.mockResolvedValueOnce({ token: 'ephemeral-room-token' });

    const history = await request(app.getHttpServer())
      .get('/api/v1/resa/conversations/conversation-1/messages?limit=25')
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    const sent = await request(app.getHttpServer())
      .post('/api/v1/resa/conversations/conversation-1/messages')
      .set('Authorization', AUTHORIZATION)
      .send({ body: 'Hello', parent_message_id: 'message-parent' })
      .expect(201);

    const liveChat = await request(app.getHttpServer())
      .get('/api/v1/resa/live/live-1/messages?limit=40')
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    const call = await request(app.getHttpServer())
      .post('/api/v1/resa/calls/call-1/join')
      .set('Authorization', AUTHORIZATION)
      .expect(201);

    expect(history.body).toEqual([{ id: 'message-1' }]);
    expect(sent.body.id).toBe('message-2');
    expect(liveChat.body).toEqual([{ id: 'live-message-1' }]);
    expect(call.body.token).toBe('ephemeral-room-token');
    expect(operational.listMessages).toHaveBeenCalledWith(TOKEN, 'conversation-1', 25);
    expect(operational.sendMessage).toHaveBeenCalledWith(
      TOKEN,
      'conversation-1',
      'Hello',
      'message-parent',
    );
    expect(operational.listLiveChatMessages).toHaveBeenCalledWith(TOKEN, 'live-1', 40);
    expect(operational.callJoinConfig).toHaveBeenCalledWith(TOKEN, 'call-1');
  });

  it('routes persistent Live speaker requests and moderator decisions', async () => {
    operational.listLiveHandRaises.mockResolvedValueOnce([{ id: 'raise-1', user_id: USER_ID, status: 'WAITING' }]);
    operational.raiseLiveHand.mockResolvedValueOnce({ id: 'raise-1', user_id: USER_ID, status: 'WAITING' });
    operational.withdrawLiveHand.mockResolvedValueOnce({ id: 'raise-1', user_id: USER_ID, status: 'WITHDRAWN' });
    operational.resolveLiveHand.mockResolvedValueOnce({ id: 'raise-1', user_id: USER_ID, status: 'APPROVED' });

    const queue = await request(app.getHttpServer())
      .get('/api/v1/resa/live/live-1/hand-raises')
      .set('Authorization', AUTHORIZATION)
      .expect(200);
    const raised = await request(app.getHttpServer())
      .post('/api/v1/resa/live/live-1/hand-raises')
      .set('Authorization', AUTHORIZATION)
      .expect(201);
    const withdrawn = await request(app.getHttpServer())
      .delete('/api/v1/resa/live/live-1/hand-raises/me')
      .set('Authorization', AUTHORIZATION)
      .expect(200);
    const resolved = await request(app.getHttpServer())
      .patch('/api/v1/resa/live/live-1/hand-raises/raise-1')
      .set('Authorization', AUTHORIZATION)
      .send({ decision: 'APPROVED' })
      .expect(200);

    expect(queue.body[0].id).toBe('raise-1');
    expect(raised.body.status).toBe('WAITING');
    expect(withdrawn.body.status).toBe('WITHDRAWN');
    expect(resolved.body.status).toBe('APPROVED');
    expect(operational.listLiveHandRaises).toHaveBeenCalledWith(TOKEN, 'live-1');
    expect(operational.raiseLiveHand).toHaveBeenCalledWith(TOKEN, 'live-1');
    expect(operational.withdrawLiveHand).toHaveBeenCalledWith(TOKEN, 'live-1');
    expect(operational.resolveLiveHand).toHaveBeenCalledWith(TOKEN, 'live-1', 'raise-1', 'APPROVED');
  });

  it('routes raise, withdraw and moderator resolution for the persisted meeting hand queue', async () => {
    groupMeetings.handRaises.mockResolvedValueOnce([{ user_id: USER_ID, status: 'WAITING' }]);
    groupMeetings.raiseHand.mockResolvedValueOnce({ user_id: USER_ID, status: 'WAITING' });
    groupMeetings.withdrawHandRaise.mockResolvedValueOnce({ user_id: USER_ID, status: 'WITHDRAWN' });
    groupMeetings.resolveHandRaise.mockResolvedValueOnce({ user_id: USER_ID, status: 'ACKNOWLEDGED' });

    const queue = await request(app.getHttpServer())
      .get(`/api/v1/resa/group-meetings/${MEETING_ID}/hand-raises`)
      .set('Authorization', AUTHORIZATION)
      .expect(200);

    const raised = await request(app.getHttpServer())
      .post(`/api/v1/resa/group-meetings/${MEETING_ID}/hand-raises`)
      .set('Authorization', AUTHORIZATION)
      .expect(201);

    const withdrawn = await request(app.getHttpServer())
      .post(`/api/v1/resa/group-meetings/${MEETING_ID}/hand-raises/withdraw`)
      .set('Authorization', AUTHORIZATION)
      .expect(201);

    const resolved = await request(app.getHttpServer())
      .patch(`/api/v1/resa/group-meetings/${MEETING_ID}/hand-raises/${USER_ID}`)
      .set('Authorization', AUTHORIZATION)
      .send({ status: 'ACKNOWLEDGED' })
      .expect(200);

    expect(queue.body[0].status).toBe('WAITING');
    expect(raised.body.status).toBe('WAITING');
    expect(withdrawn.body.status).toBe('WITHDRAWN');
    expect(resolved.body.status).toBe('ACKNOWLEDGED');
    expect(groupMeetings.handRaises).toHaveBeenCalledWith(TOKEN, MEETING_ID);
    expect(groupMeetings.raiseHand).toHaveBeenCalledWith(TOKEN, MEETING_ID);
    expect(groupMeetings.withdrawHandRaise).toHaveBeenCalledWith(TOKEN, MEETING_ID);
    expect(groupMeetings.resolveHandRaise).toHaveBeenCalledWith(
      TOKEN,
      MEETING_ID,
      USER_ID,
      'ACKNOWLEDGED',
    );
  });

  it('validates feed-impression duration before recording feed memory', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/resa/content/content-1/impression')
      .set('Authorization', AUTHORIZATION)
      .send({ duration_ms: 500 })
      .expect(400);

    expect(feedMemory.recordImpression).not.toHaveBeenCalled();

    feedMemory.recordImpression.mockResolvedValueOnce({ recorded: true });
    const response = await request(app.getHttpServer())
      .post('/api/v1/resa/content/content-1/impression')
      .set('Authorization', AUTHORIZATION)
      .send({ duration_ms: 2500, completed: true })
      .expect(201);

    expect(response.body.recorded).toBe(true);
    expect(feedMemory.recordImpression).toHaveBeenCalledWith(
      TOKEN,
      'content-1',
      2500,
      true,
    );
  });
});
