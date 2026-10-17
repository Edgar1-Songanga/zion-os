import { BadRequestException } from '@nestjs/common';
import { getSupabaseUser } from '../../identity/infrastructure/supabase-auth.client';
import { DepartmentOperationsService } from './department-operations.service';

jest.mock('../../identity/infrastructure/supabase-auth.client', () => ({ getSupabaseUser: jest.fn() }));

describe('DepartmentOperationsService', () => {
  const orgId = '00000000-0000-4000-8000-000000000001';
  const ministryId = '00000000-0000-4000-8000-000000000002';
  const classId = '00000000-0000-4000-8000-000000000003';
  const memberId = '00000000-0000-4000-8000-000000000004';
  const userId = '00000000-0000-4000-8000-000000000005';
  let service: DepartmentOperationsService;
  let db: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; upsert: jest.Mock; rpc: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseUser as jest.Mock).mockResolvedValue({ id: userId });
    db = {
      get: jest.fn().mockResolvedValue([]),
      post: jest.fn().mockResolvedValue([{ id: classId }]),
      patch: jest.fn().mockResolvedValue([{ id: classId }]),
      upsert: jest.fn().mockResolvedValue([{ id: ministryId }]),
      rpc: jest.fn().mockResolvedValue({ id: classId }),
      delete: jest.fn().mockResolvedValue([]),
    };
    service = new DepartmentOperationsService(db as any);
  });

  it('requires explicit confirmation and bounded retention before saving an organization policy', async () => {
    await expect(service.confirmRetentionPolicy('token', orgId, {
      data_domain: 'PERSONAL_MINISTRY_FOLLOW_UP', retention_days: 90,
      approved_policy_label: 'Política aprovada pela igreja', policy_confirmed: false,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.upsert).not.toHaveBeenCalled();

    await expect(service.confirmRetentionPolicy('token', orgId, {
      data_domain: 'PERSONAL_MINISTRY_FOLLOW_UP', retention_days: 0,
      approved_policy_label: 'Política aprovada pela igreja', policy_confirmed: true,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('records the confirmed retention policy against the authenticated user', async () => {
    await service.confirmRetentionPolicy('token', orgId, {
      data_domain: 'SABBATH_SCHOOL_ATTENDANCE', retention_days: 365,
      approved_policy_label: 'Política de proteção de dados local', policy_confirmed: true,
    });
    expect(db.upsert).toHaveBeenCalledWith('department_data_retention_policies', 'token', expect.objectContaining({
      organization_id: orgId,
      data_domain: 'SABBATH_SCHOOL_ATTENDANCE',
      retention_days: 365,
      confirmed_by: userId,
    }), '?on_conflict=organization_id,data_domain');
  });

  it('rejects future or impossible Sabbath School attendance dates', async () => {
    await expect(service.saveAttendance('token', classId, {
      attendance_date: '2026-02-30', records: [{ member_record_id: memberId, attendance_status: 'PRESENT' }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('rejects duplicate members and unsupported status values in one attendance session', async () => {
    await expect(service.saveAttendance('token', classId, {
      attendance_date: '2026-10-10', records: [
        { member_record_id: memberId, attendance_status: 'PRESENT' },
        { member_record_id: memberId, attendance_status: 'ABSENT' },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.rpc).not.toHaveBeenCalled();

    await expect(service.saveAttendance('token', classId, {
      attendance_date: '2026-10-10', records: [{ member_record_id: memberId, attendance_status: 'UNKNOWN' as any }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('sends a complete attendance session to the atomic database function', async () => {
    await service.saveAttendance('token', classId, {
      attendance_date: '2026-10-10', lesson_reference: '4.º trimestre · Lição 2',
      records: [{ member_record_id: memberId, attendance_status: 'EXCUSED' }],
    });
    expect(db.rpc).toHaveBeenCalledWith('save_sabbath_school_attendance', 'token', {
      p_class_id: classId,
      p_attendance_date: '2026-10-10',
      p_lesson_reference: '4.º trimestre · Lição 2',
      p_records: [{ member_record_id: memberId, attendance_status: 'EXCUSED' }],
    });
  });

  it('does not create a Ministry Personal contact without explicit consent', async () => {
    await expect(service.createFollowUp('token', orgId, ministryId, {
      display_name: 'Pessoa', contact_method: 'IN_PERSON', contact_locator: 'encontrar após culto',
      consent_method: 'VERBAL', consent_confirmed: false, assigned_to: userId,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.post).not.toHaveBeenCalled();
  });

  it('stores only consent-based contact data and an assigned user', async () => {
    await service.createFollowUp('token', orgId, ministryId, {
      display_name: 'Pessoa consentida', contact_method: 'PHONE', contact_locator: '+351 910000000',
      consent_method: 'VERBAL', consent_confirmed: true, assigned_to: userId,
    });
    expect(db.post).toHaveBeenCalledWith('personal_ministry_follow_ups', 'token', expect.objectContaining({
      organization_id: orgId,
      ministry_id: ministryId,
      display_name: 'Pessoa consentida',
      contact_method: 'PHONE',
      consent_method: 'VERBAL',
      assigned_to: userId,
      consent_recorded_by: userId,
      follow_up_status: 'NEW',
    }));
  });

  it('suppresses stewardship participant totals under five', async () => {
    await expect(service.saveStewardshipReport('token', orgId, ministryId, {
      period_start: '2026-10-01', period_end: '2026-10-31', activities_count: 1,
      programs_completed_count: 0, participants_count: 4, materials_distributed_count: 0,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('saves only aggregated, non-financial stewardship indicators', async () => {
    await service.saveStewardshipReport('token', orgId, ministryId, {
      period_start: '2026-10-01', period_end: '2026-10-31', activities_count: 2,
      programs_completed_count: 1, participants_count: null, materials_distributed_count: 10,
    });
    expect(db.upsert).toHaveBeenCalledWith('stewardship_period_reports', 'token', expect.objectContaining({
      organization_id: orgId,
      ministry_id: ministryId,
      participants_count: null,
      activities_count: 2,
    }), '?on_conflict=ministry_id,period_start,period_end');
    const payload = db.upsert.mock.calls[0][2];
    expect(payload).not.toHaveProperty('donation_amount');
    expect(payload).not.toHaveProperty('tithe_amount');
  });
});
