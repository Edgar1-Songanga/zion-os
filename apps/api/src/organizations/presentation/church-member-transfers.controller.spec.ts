import { UnauthorizedException } from '@nestjs/common';
import { ChurchMemberTransfersController } from './church-member-transfers.controller';
import { ChurchMemberTransfersService } from '../application/church-member-transfers.service';

describe('ChurchMemberTransfersController', () => {
  const controller = new ChurchMemberTransfersController({} as ChurchMemberTransfersService);

  it('extracts a bearer token from the Authorization header', () => {
    expect((controller as any).token('Bearer access-token')).toBe('access-token');
    expect((controller as any).token('bearer access-token')).toBe('access-token');
    expect((controller as any).token('Bearer   access-token  ')).toBe('access-token');
  });

  it('rejects a missing, empty, or malformed bearer header', () => {
    expect(() => (controller as any).token(undefined)).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Basic access-token')).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Bearer')).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Bearer   ')).toThrow(UnauthorizedException);
  });
});
