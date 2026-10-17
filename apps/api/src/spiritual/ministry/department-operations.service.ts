import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';
import { getSupabaseUser } from '../../identity/infrastructure/supabase-auth.client';

export type RetentionDomain = 'SABBATH_SCHOOL_ATTENDANCE' | 'PERSONAL_MINISTRY_FOLLOW_UP';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';
export type FollowUpStatus = 'NEW' | 'CONTACT_ATTEMPTED' | 'MEETING_SCHEDULED' | 'BIBLE_STUDY_STARTED' | 'DECLINED' | 'COMPLETED';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class DepartmentOperationsService {
  constructor(private readonly db: SupabaseRestClient) {}

  async retentionPolicies(token: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    return this.db.get<any[]>('department_data_retention_policies', token,
      `?select=organization_id,data_domain,retention_days,approved_policy_label,confirmed_at&organization_id=eq.${organizationId}&order=data_domain.asc`);
  }

  async confirmRetentionPolicy(token: string, organizationId: string, input: {
    data_domain: RetentionDomain; retention_days: number; approved_policy_label: string; policy_confirmed: boolean;
  }) {
    this.assertUuid(organizationId, 'organizationId');
    if (!input || !['SABBATH_SCHOOL_ATTENDANCE', 'PERSONAL_MINISTRY_FOLLOW_UP'].includes(input.data_domain)) {
      throw new BadRequestException('data_domain is not supported.');
    }
    if (!Number.isInteger(input.retention_days) || input.retention_days < 1 || input.retention_days > 3650) {
      throw new BadRequestException('retention_days must be an integer between 1 and 3650.');
    }
    const label = this.text(input.approved_policy_label, 'approved_policy_label', 3, 200);
    if (input.policy_confirmed !== true) throw new BadRequestException('An approved local retention policy must be confirmed.');
    const rows = await this.db.upsert<any[]>('department_data_retention_policies', token, {
      organization_id: organizationId,
      data_domain: input.data_domain,
      retention_days: input.retention_days,
      approved_policy_label: label,
      confirmed_by: await this.currentUserId(token),
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, '?on_conflict=organization_id,data_domain');
    if (!rows[0]) throw new BadRequestException('The retention policy was not saved.');
    return rows[0];
  }

  async listClasses(token: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    await this.purge(token, organizationId, 'SABBATH_SCHOOL_ATTENDANCE');
    return this.db.get<any[]>('sabbath_school_classes', token,
      `?select=id,name,meeting_day,meeting_time,room_label,is_active,created_at&organization_id=eq.${organizationId}&order=name.asc`);
  }

  async createClass(token: string, organizationId: string, input: {
    ministry_id: string; name: string; meeting_day?: number | null; meeting_time?: string | null;
    room_label?: string | null; teacher_user_id?: string | null;
  }) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(input?.ministry_id, 'ministry_id');
    const name = this.text(input.name, 'name', 2, 120);
    if (input.meeting_day != null && (!Number.isInteger(input.meeting_day) || input.meeting_day < 0 || input.meeting_day > 6)) {
      throw new BadRequestException('meeting_day must be between 0 (Sunday) and 6 (Saturday).');
    }
    if (input.teacher_user_id != null) this.assertUuid(input.teacher_user_id, 'teacher_user_id');
    const room = input.room_label == null ? null : this.text(input.room_label, 'room_label', 1, 120);
    const rows = await this.db.post<any[]>('sabbath_school_classes', token, {
      organization_id: organizationId,
      ministry_id: input.ministry_id,
      name,
      meeting_day: input.meeting_day ?? null,
      meeting_time: this.optionalTime(input.meeting_time),
      room_label: room,
      teacher_user_id: input.teacher_user_id ?? null,
      created_by: await this.currentUserId(token),
    });
    if (!rows[0]) throw new BadRequestException('Class was not created.');
    return rows[0];
  }

  async updateClass(token: string, classId: string, input: Record<string, unknown>) {
    this.assertUuid(classId, 'classId');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BadRequestException('A class update object is required.');
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = this.text(input.name, 'name', 2, 120);
    if (input.meeting_day !== undefined) {
      if (input.meeting_day !== null && (!Number.isInteger(input.meeting_day) || Number(input.meeting_day) < 0 || Number(input.meeting_day) > 6)) throw new BadRequestException('meeting_day must be between 0 and 6.');
      body.meeting_day = input.meeting_day;
    }
    if (input.meeting_time !== undefined) body.meeting_time = this.optionalTime(input.meeting_time);
    if (input.room_label !== undefined) body.room_label = input.room_label == null ? null : this.text(input.room_label, 'room_label', 1, 120);
    if (input.teacher_user_id !== undefined) {
      if (input.teacher_user_id !== null) this.assertUuid(input.teacher_user_id, 'teacher_user_id');
      body.teacher_user_id = input.teacher_user_id;
    }
    if (input.is_active !== undefined) {
      if (typeof input.is_active !== 'boolean') throw new BadRequestException('is_active must be boolean.');
      body.is_active = input.is_active;
    }
    if (!Object.keys(body).length) throw new BadRequestException('Provide at least one supported class field.');
    body.updated_at = new Date().toISOString();
    const rows = await this.db.patch<any[]>('sabbath_school_classes', token, body, `?id=eq.${classId}`);
    if (!rows[0]) throw new NotFoundException('Class not found or not accessible.');
    return rows[0];
  }

  async memberCandidates(token: string, organizationId: string) {
    this.assertUuid(organizationId, 'organizationId');
    return this.db.rpc<any[]>('sabbath_school_member_candidates', token, { p_organization_id: organizationId });
  }

  async roster(token: string, classId: string) {
    this.assertUuid(classId, 'classId');
    await this.purgeForClass(token, classId);
    return this.db.rpc<any[]>('sabbath_school_class_roster', token, { p_class_id: classId });
  }

  async enroll(token: string, classId: string, memberRecordId: string) {
    this.assertUuid(classId, 'classId');
    this.assertUuid(memberRecordId, 'member_record_id');
    const classes = await this.db.get<any[]>('sabbath_school_classes', token, `?select=organization_id&id=eq.${classId}&limit=1`);
    if (!classes[0]) throw new NotFoundException('Class not found or not accessible.');
    const rows = await this.db.post<any[]>('sabbath_school_class_members', token, {
      class_id: classId,
      organization_id: classes[0].organization_id,
      member_record_id: memberRecordId,
    });
    if (!rows[0]) throw new BadRequestException('Member could not be enrolled.');
    return rows[0];
  }

  async removeClassMember(token: string, classId: string, memberRecordId: string) {
    this.assertUuid(classId, 'classId');
    this.assertUuid(memberRecordId, 'member_record_id');
    return this.db.delete<any[]>('sabbath_school_class_members', token, `?class_id=eq.${classId}&member_record_id=eq.${memberRecordId}`);
  }

  async saveAttendance(token: string, classId: string, input: {
    attendance_date: string; lesson_reference?: string | null; records: Array<{ member_record_id: string; attendance_status: AttendanceStatus }>;
  }) {
    this.assertUuid(classId, 'classId');
    if (!this.isValidDate(input?.attendance_date) || input.attendance_date > new Date().toISOString().slice(0, 10)) throw new BadRequestException('attendance_date must be a valid date not in the future.');
    if (!Array.isArray(input.records) || input.records.length < 1 || input.records.length > 1000) throw new BadRequestException('records must contain between 1 and 1000 members.');
    const seen = new Set<string>();
    const records = input.records.map((row) => {
      this.assertUuid(row.member_record_id, 'member_record_id');
      if (seen.has(row.member_record_id)) throw new BadRequestException('A member can appear only once per attendance session.');
      seen.add(row.member_record_id);
      if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(row.attendance_status)) throw new BadRequestException('attendance_status is not supported.');
      return row;
    });
    const lesson = input.lesson_reference == null ? null : this.text(input.lesson_reference, 'lesson_reference', 1, 160);
    return this.db.rpc<any>('save_sabbath_school_attendance', token, {
      p_class_id: classId,
      p_attendance_date: input.attendance_date,
      p_lesson_reference: lesson,
      p_records: records,
    });
  }

  async classSessions(token: string, classId: string) {
    this.assertUuid(classId, 'classId');
    await this.purgeForClass(token, classId);
    return this.db.get<any[]>('sabbath_school_attendance_sessions', token,
      `?select=id,class_id,attendance_date,lesson_reference,recorded_at,expires_at&class_id=eq.${classId}&order=attendance_date.desc&limit=100`);
  }

  async sessionAttendance(token: string, sessionId: string) {
    this.assertUuid(sessionId, 'sessionId');
    return this.db.get<any[]>('sabbath_school_attendance', token,
      `?select=id,session_id,member_record_id,attendance_status,recorded_at&session_id=eq.${sessionId}&order=recorded_at.asc&limit=1000`);
  }

  async listFollowUps(token: string, organizationId: string, ministryId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(ministryId, 'ministryId');
    await this.purge(token, organizationId, 'PERSONAL_MINISTRY_FOLLOW_UP');
    return this.db.get<any[]>('personal_ministry_follow_ups', token,
      `?select=id,organization_id,ministry_id,display_name,contact_method,contact_locator,consent_method,consent_recorded_at,follow_up_status,expires_at,created_at,updated_at&organization_id=eq.${organizationId}&ministry_id=eq.${ministryId}&order=expires_at.asc&limit=500`);
  }

  async createFollowUp(token: string, organizationId: string, ministryId: string, input: {
    display_name: string; contact_method: 'IN_PERSON' | 'PHONE' | 'EMAIL'; contact_locator: string;
    consent_method: 'VERBAL' | 'WRITTEN' | 'DIGITAL'; consent_confirmed: boolean; assigned_to: string;
  }) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(ministryId, 'ministryId');
    this.assertUuid(input?.assigned_to, 'assigned_to');
    if (input.consent_confirmed !== true) throw new BadRequestException('Explicit consent is required before recording a follow-up.');
    if (!['IN_PERSON', 'PHONE', 'EMAIL'].includes(input.contact_method)) throw new BadRequestException('contact_method is not supported.');
    if (!['VERBAL', 'WRITTEN', 'DIGITAL'].includes(input.consent_method)) throw new BadRequestException('consent_method is not supported.');
    const locator = this.text(input.contact_locator, 'contact_locator', 2, 254);
    if (input.contact_method === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(locator)) throw new BadRequestException('A valid email address is required for EMAIL contact.');
    const rows = await this.db.post<any[]>('personal_ministry_follow_ups', token, {
      organization_id: organizationId,
      ministry_id: ministryId,
      display_name: this.text(input.display_name, 'display_name', 1, 120),
      contact_method: input.contact_method,
      contact_locator: locator,
      consent_method: input.consent_method,
      assigned_to: input.assigned_to,
      follow_up_status: 'NEW',
      consent_recorded_by: await this.currentUserId(token),
    });
    if (!rows[0]) throw new BadRequestException('Follow-up was not created. Confirm an approved retention policy first.');
    return rows[0];
  }

  async updateFollowUpStatus(token: string, followUpId: string, status: FollowUpStatus) {
    this.assertUuid(followUpId, 'followUpId');
    if (!['NEW', 'CONTACT_ATTEMPTED', 'MEETING_SCHEDULED', 'BIBLE_STUDY_STARTED', 'DECLINED', 'COMPLETED'].includes(status)) throw new BadRequestException('follow_up_status is not supported.');
    const rows = await this.db.patch<any[]>('personal_ministry_follow_ups', token, { follow_up_status: status, updated_at: new Date().toISOString() }, `?id=eq.${followUpId}`);
    if (!rows[0]) throw new NotFoundException('Follow-up not found, expired, or not assigned to you.');
    return rows[0];
  }

  async listStewardshipReports(token: string, organizationId: string, ministryId: string) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(ministryId, 'ministryId');
    return this.db.get<any[]>('stewardship_period_reports', token,
      `?select=id,organization_id,ministry_id,period_start,period_end,activities_count,programs_completed_count,participants_count,materials_distributed_count,submitted_at&organization_id=eq.${organizationId}&ministry_id=eq.${ministryId}&order=period_start.desc&limit=120`);
  }

  async saveStewardshipReport(token: string, organizationId: string, ministryId: string, input: {
    period_start: string; period_end: string; activities_count: number; programs_completed_count: number;
    participants_count: number | null; materials_distributed_count: number;
  }) {
    this.assertUuid(organizationId, 'organizationId');
    this.assertUuid(ministryId, 'ministryId');
    if (!this.isValidDate(input?.period_start) || !this.isValidDate(input?.period_end) || input.period_end < input.period_start) throw new BadRequestException('Report period dates are invalid or reversed.');
    for (const field of ['activities_count', 'programs_completed_count', 'materials_distributed_count'] as const) {
      const maximum = field === 'materials_distributed_count' ? 100000 : 10000;
      if (!Number.isInteger(input[field]) || input[field] < 0 || input[field] > maximum) throw new BadRequestException(`${field} must be an integer between 0 and ${maximum}.`);
    }
    if (input.participants_count !== null && (!Number.isInteger(input.participants_count) || input.participants_count < 5 || input.participants_count > 100000)) throw new BadRequestException('participants_count must be null (suppressed) or at least 5.');
    const userId = await this.currentUserId(token);
    const rows = await this.db.upsert<any[]>('stewardship_period_reports', token, {
      organization_id: organizationId,
      ministry_id: ministryId,
      period_start: input.period_start,
      period_end: input.period_end,
      activities_count: input.activities_count,
      programs_completed_count: input.programs_completed_count,
      participants_count: input.participants_count,
      materials_distributed_count: input.materials_distributed_count,
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
    }, '?on_conflict=ministry_id,period_start,period_end');
    if (!rows[0]) throw new BadRequestException('Stewardship report was not saved.');
    return rows[0];
  }

  private async purge(token: string, organizationId: string, domain: RetentionDomain) {
    await this.db.rpc('purge_expired_department_records', token, { p_organization_id: organizationId, p_data_domain: domain });
  }

  private async purgeForClass(token: string, classId: string) {
    const rows = await this.db.get<any[]>('sabbath_school_classes', token, `?select=organization_id&id=eq.${classId}&limit=1`);
    if (rows[0]) await this.purge(token, rows[0].organization_id, 'SABBATH_SCHOOL_ATTENDANCE');
  }

  private async currentUserId(token: string): Promise<string> {
    const user = await getSupabaseUser(token);
    if (!user?.id || !UUID.test(user.id)) throw new BadRequestException('Unable to verify the current user.');
    return user.id;
  }

  private text(value: unknown, field: string, min: number, max: number): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be text.`);
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) throw new BadRequestException(`${field} must contain between ${min} and ${max} characters.`);
    return trimmed;
  }

  private assertUuid(value: unknown, field: string): asserts value is string {
    if (typeof value !== 'string' || !UUID.test(value)) throw new BadRequestException(`${field} must be a valid UUID.`);
  }

  private isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private optionalTime(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) throw new BadRequestException('meeting_time must use HH:MM or HH:MM:SS.');
    return value;
  }
}
