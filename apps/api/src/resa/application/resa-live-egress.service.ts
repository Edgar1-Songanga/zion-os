import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LiveKitAPI, StreamOutput, StreamProtocol } from 'livekit-server-sdk';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { env } from '../../config/env';

@Injectable()
export class ResaLiveEgressService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  private client() {
    if (!env.livekitUrl || !env.livekitApiKey || !env.livekitApiSecret) throw new BadGatewayException('A transmissão externa não está configurada no servidor.');
    return new LiveKitAPI({ host: env.livekitUrl, apiKey: env.livekitApiKey, secret: env.livekitApiSecret });
  }

  private async ownedLive(token: string, liveId: string) {
    const user = await this.identity.getCurrentUser(token);
    if (!user?.id) throw new NotFoundException('Utilizador autenticado não encontrado.');
    if (!/^[0-9a-f-]{16,80}$/i.test(liveId)) throw new BadRequestException('Identificador de live inválido.');
    const rows = await this.db.get<any[]>('resa_live_sessions', token, '?select=id,host_id,status&id=eq.' + liveId + '&host_id=eq.' + user.id + '&limit=1');
    const live = rows[0];
    if (!live) throw new NotFoundException('Live não encontrada ou não és o anfitrião.');
    return live;
  }

  async startExternalStream(token: string, liveId: string, rawUrl: unknown) {
    const live = await this.ownedLive(token, liveId);
    if (live.status !== 'live') throw new BadRequestException('A live tem de estar ativa antes de iniciar a transmissão externa.');
    if (typeof rawUrl !== 'string' || rawUrl.length > 2048) throw new BadRequestException('URL de transmissão inválido.');
    let destination: URL;
    try { destination = new URL(rawUrl.trim()); } catch { throw new BadRequestException('Introduz um URL RTMP/RTMPS válido do YouTube Live ou Facebook Live.'); }
    const allowedHosts = new Set(['a.rtmp.youtube.com', 'a.rtmps.youtube.com', 'live-api-s.facebook.com', 'live-api.facebook.com']);
    if (!['rtmp:', 'rtmps:'].includes(destination.protocol) || !allowedHosts.has(destination.hostname.toLowerCase()) || destination.username || destination.password || !destination.pathname || destination.pathname === '/') throw new BadRequestException('Por segurança, só são aceites destinos RTMP/RTMPS oficiais do YouTube Live e Facebook Live.');
    try {
      const egress = await this.client().egress.startRoomCompositeEgress('zion-live-' + liveId, { stream: new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [destination.toString()] }) });
      if (!egress.egressId) throw new Error('Missing egress ID');
      return { egressId: egress.egressId, status: 'starting', destination: destination.hostname.includes('youtube') ? 'YouTube Live' : 'Facebook Live' };
    } catch { throw new BadGatewayException('Não foi possível iniciar a transmissão externa. Confirma se o LiveKit Egress está disponível e configurado.'); }
  }

  async stopExternalStream(token: string, liveId: string, rawEgressId: unknown) {
    await this.ownedLive(token, liveId);
    if (typeof rawEgressId !== 'string' || !/^[A-Za-z0-9_-]{6,128}$/.test(rawEgressId)) throw new BadRequestException('Identificador de transmissão inválido.');
    try { await this.client().egress.stopEgress(rawEgressId); return { stopped: true }; }
    catch { throw new BadGatewayException('Não foi possível parar a transmissão externa. Verifica se ela ainda está ativa.'); }
  }
}
