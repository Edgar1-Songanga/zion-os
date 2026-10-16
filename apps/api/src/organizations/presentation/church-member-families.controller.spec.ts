import { UnauthorizedException } from '@nestjs/common';
import { ChurchMemberFamiliesController } from './church-member-families.controller';
import { ChurchMemberFamiliesService } from '../application/church-member-families.service';

describe('ChurchMemberFamiliesController bearer token parsing', () => {
  const controller = new ChurchMemberFamiliesController({} as ChurchMemberFamiliesService);

  it('extracts a standard bearer token case-insensitively and tolerates whitespace', () => {
    expect((controller as any).token('Bearer access-token')).toBe('access-token');
    expect((controller as any).token('bearer   second-token  ')).toBe('second-token');
  });

  it('rejects missing or malformed authorization headers', () => {
    expect(() => (controller as any).token(undefined)).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Basic access-token')).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Bearer')).toThrow(UnauthorizedException);
    expect(() => (controller as any).token('Bearer token extra')).toThrow(UnauthorizedException);
  });
});
