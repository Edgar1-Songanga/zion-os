import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { env } from '../../config/env';

type MediaType = 'image' | 'video';
type ModerationClaims = {
  sub: string;
  path: string;
  mediaType: MediaType;
  mimeType: string;
  provider: string;
  confidence: number;
  categories: string[];
  issuedAt: number;
  exp: number;
};

const MAX_BYTES = 50 * 1024 * 1024;
const MIME_TYPES: Record<MediaType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

@Injectable()
export class ResaMediaModerationService {
  private readonly db = new SupabaseRestClient();

  constructor(private readonly identity: IdentityService) {}

  private tokenSecret(): string {
    if (!env.resaMediaModerationTokenSecret || env.resaMediaModerationTokenSecret.length < 32) {
      throw new ServiceUnavailableException('A protecção de media ainda não está configurada.');
    }
    return env.resaMediaModerationTokenSecret;
  }

  private sign(payload: ModerationClaims): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.tokenSecret()).update(encoded).digest('base64url');
    return encoded + '.' + signature;
  }

  verifyApprovalToken(
    token: unknown,
    expected: { userId: string; mediaPath: string; mediaType: MediaType },
  ): ModerationClaims {
    if (typeof token !== 'string' || token.length > 4096) {
      throw new ForbiddenException('A imagem ou vídeo ainda não foi aprovado pela moderação automática.');
    }
    const [encoded, suppliedSignature, extra] = token.split('.');
    if (!encoded || !suppliedSignature || extra !== undefined) {
      throw new ForbiddenException('Comprovativo de moderação inválido.');
    }
    let supplied: Buffer;
    try {
      supplied = Buffer.from(suppliedSignature, 'base64url');
    } catch {
      throw new ForbiddenException('Comprovativo de moderação inválido.');
    }
    const expectedSignature = createHmac('sha256', this.tokenSecret()).update(encoded).digest();
    if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) {
      throw new ForbiddenException('Comprovativo de moderação inválido.');
    }

    let claims: ModerationClaims;
    try {
      claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ModerationClaims;
    } catch {
      throw new ForbiddenException('Comprovativo de moderação inválido.');
    }
    const now = Math.floor(Date.now() / 1000);
    if (claims.sub !== expected.userId || claims.path !== expected.mediaPath
      || claims.mediaType !== expected.mediaType || !claims.provider
      || !Number.isFinite(claims.confidence) || claims.confidence < 0 || claims.confidence > 1
      || !Array.isArray(claims.categories) || claims.exp <= now || claims.issuedAt > now + 30
      || claims.exp - claims.issuedAt > 600) {
      throw new ForbiddenException('A aprovação não corresponde a este ficheiro ou já expirou. Analise novamente a media.');
    }
    return claims;
  }

  async moderate(token: string, input: {
    media_path?: unknown;
    media_type?: unknown;
    mime_type?: unknown;
    file_size?: unknown;
  }) {
    const actor = await this.identity.getCurrentUser(token);
    const mediaType = input.media_type;
    const mimeType = typeof input.mime_type === 'string' ? input.mime_type.toLowerCase().trim() : '';
    const mediaPath = typeof input.media_path === 'string' ? input.media_path.trim() : '';
    const fileSize = input.file_size;

    if (mediaType !== 'image' && mediaType !== 'video') throw new BadRequestException('Tipo de media inválido.');
    if (!MIME_TYPES[mediaType].includes(mimeType)) throw new BadRequestException('Formato de ficheiro não permitido.');
    if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
      throw new BadRequestException('O ficheiro excede o limite permitido de 50 MB.');
    }
    if (!mediaPath.startsWith(actor.id + '/') || mediaPath.length > 500
      || mediaPath.includes('..') || mediaPath.includes('\\') || mediaPath.startsWith('/')) {
      throw new ForbiddenException('O ficheiro não pertence à conta autenticada.');
    }
    const filename = mediaPath.slice(mediaPath.lastIndexOf('/') + 1);
    if (!/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(filename)) {
      throw new BadRequestException('O caminho do ficheiro não é válido.');
    }
    if (!env.resaMediaModerationUrl || !env.resaMediaModerationSecret) {
      throw new ServiceUnavailableException('A análise automática de media ainda não está operacional. A publicação foi bloqueada por segurança.');
    }

    const signedUrl = await this.db.createSignedStorageUrl('resa-content-private', mediaPath, token, 300);
    let response: Response;
    try {
      response = await fetch(env.resaMediaModerationUrl.replace(/\/$/, '') + '/v1/moderate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.resaMediaModerationSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: signedUrl,
          media_type: mediaType,
          mime_type: mimeType,
          file_size: fileSize,
          policy: 'resa-explicit-sexual-nudity-v1',
          video_sampling: mediaType === 'video'
            ? { sample_interval_seconds: 1, minimum_coverage_ratio: 0.9, inspect_entire_duration: true }
            : null,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ServiceUnavailableException('A análise de segurança não respondeu. O ficheiro não foi publicado; tente novamente.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('O serviço de análise de segurança está indisponível. A publicação foi bloqueada.');
    }

    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new ServiceUnavailableException('A análise devolveu uma resposta inválida. A publicação foi bloqueada.');
    }
    const decision = result?.decision;
    const confidence = Number(result?.confidence);
    const provider = typeof result?.provider === 'string' ? result.provider.slice(0, 100) : '';
    const categories = Array.isArray(result?.categories)
      ? result.categories.filter((value: unknown): value is string => typeof value === 'string').slice(0, 20).map((value: string) => value.slice(0, 80))
      : [];
    if (!['approved', 'rejected', 'review'].includes(decision)
      || !provider || !Number.isFinite(confidence) || confidence < 0 || confidence > 1
      || result?.detected_mime_type !== mimeType || Number(result?.bytes_processed) !== fileSize) {
      throw new ServiceUnavailableException('A análise não produziu um resultado verificável. A publicação foi bloqueada.');
    }
    if (mediaType === 'video') {
      const frames = Number(result?.frames_analyzed);
      const coverage = Number(result?.coverage_ratio);
      if (!Number.isSafeInteger(frames) || frames < 1 || !Number.isFinite(coverage) || coverage < 0.9 || coverage > 1) {
        throw new ServiceUnavailableException('A análise do vídeo não cobriu suficientemente a sua duração. A publicação foi bloqueada.');
      }
    }
    if (decision === 'rejected') {
      throw new UnprocessableEntityException('Esta imagem ou vídeo contém conteúdo sexual explícito ou nudez não permitida pelas regras do RESA.');
    }
    if (decision === 'review') {
      throw new ConflictException('Este ficheiro precisa de revisão adicional antes de poder ser publicado.');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const claims: ModerationClaims = {
      sub: actor.id,
      path: mediaPath,
      mediaType,
      mimeType,
      provider,
      confidence,
      categories,
      issuedAt,
      exp: issuedAt + 600,
    };
    return { approved: true, moderation_token: this.sign(claims), expires_in: 600 };
  }
}
