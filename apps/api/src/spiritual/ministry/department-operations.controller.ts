import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, UnauthorizedException } from '@nestjs/common';
import { getSupabaseUser } from '../../identity/infrastructure/supabase-auth.client';
import { DepartmentOperationsService, type AttendanceStatus, type FollowUpStatus, type RetentionDomain } from './department-operations.service';

@Controller('v1/department-operations')
export class DepartmentOperationsController {
  constructor(private readonly operations: DepartmentOperationsService) {}

  private async token(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token || !(await getSupabaseUser(token))) throw new UnauthorizedException('A sessão Supabase é obrigatória.');
    return token;
  }

  @Get('retention/:organizationId')
  retention(@Headers('authorization') authorization: string | undefined, @Param('organizationId') organizationId: string) {
    return this.token(authorization).then((token) => this.operations.retentionPolicies(token, organizationId));
  }

  @Put('retention/:organizationId')
  confirmRetention(
    @Headers('authorization') authorization: string | undefined,
    @Param('organizationId') organizationId: string,
    @Body() body: { data_domain: RetentionDomain; retention_days: number; approved_policy_label: string; policy_confirmed: boolean },
  ) {
    return this.token(authorization).then((token) => this.operations.confirmRetentionPolicy(token, organizationId, body));
  }

  @Get('sabbath/classes')
  classes(@Headers('authorization') authorization: string | undefined, @Query('organizationId') organizationId: string) {
    return this.token(authorization).then((token) => this.operations.listClasses(token, organizationId));
  }

  @Post('sabbath/classes')
  createClass(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { organization_id: string; ministry_id: string; name: string; meeting_day?: number | null; meeting_time?: string | null; room_label?: string | null; teacher_user_id?: string | null },
  ) {
    return this.token(authorization).then((token) => this.operations.createClass(token, body.organization_id, body));
  }

  @Patch('sabbath/classes/:classId')
  updateClass(@Headers('authorization') authorization: string | undefined, @Param('classId') classId: string, @Body() body: Record<string, unknown>) {
    return this.token(authorization).then((token) => this.operations.updateClass(token, classId, body));
  }

  @Get('sabbath/classes/:classId/roster')
  roster(@Headers('authorization') authorization: string | undefined, @Param('classId') classId: string) {
    return this.token(authorization).then((token) => this.operations.roster(token, classId));
  }

  @Get('sabbath/member-candidates')
  memberCandidates(@Headers('authorization') authorization: string | undefined, @Query('organizationId') organizationId: string) {
    return this.token(authorization).then((token) => this.operations.memberCandidates(token, organizationId));
  }

  @Post('sabbath/classes/:classId/members')
  enroll(@Headers('authorization') authorization: string | undefined, @Param('classId') classId: string, @Body() body: { member_record_id: string }) {
    return this.token(authorization).then((token) => this.operations.enroll(token, classId, body.member_record_id));
  }

  @Delete('sabbath/classes/:classId/members/:memberRecordId')
  removeMember(@Headers('authorization') authorization: string | undefined, @Param('classId') classId: string, @Param('memberRecordId') memberRecordId: string) {
    return this.token(authorization).then((token) => this.operations.removeClassMember(token, classId, memberRecordId));
  }

  @Get('sabbath/classes/:classId/sessions')
  sessions(@Headers('authorization') authorization: string | undefined, @Param('classId') classId: string) {
    return this.token(authorization).then((token) => this.operations.classSessions(token, classId));
  }

  @Get('sabbath/sessions/:sessionId/attendance')
  attendance(@Headers('authorization') authorization: string | undefined, @Param('sessionId') sessionId: string) {
    return this.token(authorization).then((token) => this.operations.sessionAttendance(token, sessionId));
  }

  @Post('sabbath/classes/:classId/attendance')
  saveAttendance(
    @Headers('authorization') authorization: string | undefined,
    @Param('classId') classId: string,
    @Body() body: { attendance_date: string; lesson_reference?: string | null; records: Array<{ member_record_id: string; attendance_status: AttendanceStatus }> },
  ) {
    return this.token(authorization).then((token) => this.operations.saveAttendance(token, classId, body));
  }

  @Get('personal-follow-ups')
  followUps(@Headers('authorization') authorization: string | undefined, @Query('organizationId') organizationId: string, @Query('ministryId') ministryId: string) {
    return this.token(authorization).then((token) => this.operations.listFollowUps(token, organizationId, ministryId));
  }

  @Post('personal-follow-ups')
  createFollowUp(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { organization_id: string; ministry_id: string; display_name: string; contact_method: 'IN_PERSON' | 'PHONE' | 'EMAIL'; contact_locator: string; consent_method: 'VERBAL' | 'WRITTEN' | 'DIGITAL'; consent_confirmed: boolean; assigned_to: string },
  ) {
    return this.token(authorization).then((token) => this.operations.createFollowUp(token, body.organization_id, body.ministry_id, body));
  }

  @Patch('personal-follow-ups/:followUpId')
  updateFollowUp(@Headers('authorization') authorization: string | undefined, @Param('followUpId') followUpId: string, @Body() body: { follow_up_status: FollowUpStatus }) {
    return this.token(authorization).then((token) => this.operations.updateFollowUpStatus(token, followUpId, body.follow_up_status));
  }

  @Get('stewardship/reports')
  stewardshipReports(@Headers('authorization') authorization: string | undefined, @Query('organizationId') organizationId: string, @Query('ministryId') ministryId: string) {
    return this.token(authorization).then((token) => this.operations.listStewardshipReports(token, organizationId, ministryId));
  }

  @Post('stewardship/reports')
  saveStewardshipReport(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { organization_id: string; ministry_id: string; period_start: string; period_end: string; activities_count: number; programs_completed_count: number; participants_count: number | null; materials_distributed_count: number },
  ) {
    return this.token(authorization).then((token) => this.operations.saveStewardshipReport(token, body.organization_id, body.ministry_id, body));
  }
}
