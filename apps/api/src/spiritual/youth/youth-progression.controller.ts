import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { YouthProgressionService } from './youth-progression.service';

@Controller('v1/youth/progression')
export class YouthProgressionController {
  constructor(private readonly progression: YouthProgressionService) {}

  private token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token is required.');
    return token;
  }

  @Get('catalog/organization/:organizationId')
  listCatalog(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Query('program_id') programId?: string,
    @Query('kind') kind?: string,
  ) {
    return this.progression.listCatalog(this.token(authorization), organizationId, programId, kind);
  }

  @Post('catalog/organization/:organizationId')
  createCatalog(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: {
      program_id?: string; kind?: string; code?: string; name?: string; description?: string;
      level?: string; prerequisites?: unknown; official_reference_url?: string | null; is_active?: boolean;
    },
  ) {
    return this.progression.createCatalog(this.token(authorization), organizationId, body);
  }

  @Patch('catalog/:id')
  updateCatalog(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: {
      code?: string; name?: string; description?: string; level?: string;
      prerequisites?: unknown; official_reference_url?: string | null; is_active?: boolean;
    },
  ) {
    return this.progression.updateCatalog(this.token(authorization), id, body);
  }

  @Get('clubs/:clubId/progress')
  listProgress(@Headers('authorization') authorization: string | undefined, @Param('clubId') clubId: string) {
    return this.progression.listProgress(this.token(authorization), clubId);
  }

  @Post('clubs/:clubId/progress')
  assignProgress(
    @Headers('authorization') authorization: string | undefined,
    @Param('clubId') clubId: string,
    @Body() body: { user_id?: string; catalog_item_id?: string },
  ) {
    return this.progression.assignProgress(this.token(authorization), clubId, body);
  }

  @Patch('progress/:id')
  updateProgress(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { status?: string; evidence_url?: string | null; notes?: string },
  ) {
    return this.progression.updateProgress(this.token(authorization), id, body);
  }

  @Get('clubs/:clubId/investitures')
  listInvestitures(@Headers('authorization') authorization: string | undefined, @Param('clubId') clubId: string) {
    return this.progression.listInvestitures(this.token(authorization), clubId);
  }

  @Post('clubs/:clubId/investitures')
  createInvestiture(
    @Headers('authorization') authorization: string | undefined,
    @Param('clubId') clubId: string,
    @Body() body: {
      user_id?: string; class_catalog_id?: string; scheduled_date?: string | null;
      location?: string; notes?: string; officiated_by?: string | null;
    },
  ) {
    return this.progression.createInvestiture(this.token(authorization), clubId, body);
  }

  @Patch('investitures/:id')
  updateInvestiture(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: {
      status?: string; scheduled_date?: string | null; location?: string;
      notes?: string; officiated_by?: string | null;
    },
  ) {
    return this.progression.updateInvestiture(this.token(authorization), id, body);
  }
}
