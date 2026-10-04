import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

type ClubInput = { program_id: string; name: string; motto?: string; church_name?: string };
type MemberInput = { user_id?: string; legal_name: string; date_of_birth?: string; guardian_user_id?: string; consent_status?: string };
type ActivityInput = { club_id: string; title: string; activity_type: string; scheduled_on: string; status?: string; participants_count?: number; service_hours?: number; spiritual_actions?: number; skills_completed?: number };
type AchievementInput = { member_id: string; program_id: string; title: string; achievement_type?: string; achieved_on?: string };

@Injectable()
export class YouthService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) { return this.identity.getCurrentUser(token); }
  private required(value: unknown, label: string) { if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} is required`); return value.trim(); }
  private integer(value: unknown, label: string, min = 0) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < min) throw new BadRequestException(`${label} must be an integer >= ${min}`); return parsed; }

  async overview(token: string, organizationId: string) {
    await this.actor(token);
    const [programs, clubs, members, leaders, activities, achievements, certificates] = await Promise.all([
      this.db.get<any[]>('youth_programs', token, `?select=id,program_key,name,age_range,philosophy,active&organization_id=eq.${organizationId}&order=name.asc`),
      this.db.get<any[]>('youth_clubs', token, `?select=id,name,motto,church_name,status,program_id,created_at&organization_id=eq.${organizationId}&order=name.asc`),
      this.db.get<any[]>('youth_members', token, `?select=id,legal_name,date_of_birth,consent_status,safeguarding_status,active&organization_id=eq.${organizationId}&active=eq.true&order=legal_name.asc`),
      this.db.get<any[]>('youth_club_members', token, `?select=member_id,club_id,role&role=in.(LEADER,ASSISTANT_LEADER,COORDINATOR)`),
      this.db.get<any[]>('youth_activities', token, `?select=id,club_id,title,activity_type,scheduled_on,status,participants_count,service_hours,spiritual_actions,skills_completed&organization_id=eq.${organizationId}&order=scheduled_on.desc&limit=50`),
      this.db.get<any[]>('youth_achievements', token, `?select=id,member_id,program_id,title,achievement_type,verified,achieved_on&organization_id=eq.${organizationId}&order=achieved_on.desc&limit=50`),
      this.db.get<any[]>('youth_certificates', token, `?select=id,member_id,program_id,title,verification_code,status,issued_at&organization_id=eq.${organizationId}&order=issued_at.desc&limit=50`),
    ]);
    const completed = activities.filter((activity) => activity.status === 'COMPLETED');
    return {
      programs, clubs, members,
      metrics: {
        clubs: clubs.length,
        members: members.length,
        leaders: leaders.length,
        activities: activities.length,
        completedActivities: completed.length,
        participation: completed.reduce((sum, item) => sum + Number(item.participants_count ?? 0), 0),
        serviceHours: completed.reduce((sum, item) => sum + Number(item.service_hours ?? 0), 0),
        spiritualActions: completed.reduce((sum, item) => sum + Number(item.spiritual_actions ?? 0), 0),
        skillsCompleted: completed.reduce((sum, item) => sum + Number(item.skills_completed ?? 0), 0),
        verifiedAchievements: achievements.filter((item) => item.verified).length,
        validCertificates: certificates.filter((item) => item.status === 'VALID').length,
      },
      activities, achievements, certificates,
    };
  }

  async createProgram(token: string, organizationId: string, input: { program_key: string; name: string; age_range: string; philosophy: string }) {
    const user = await this.actor(token);
    const rows = await this.db.post<any[]>('youth_programs', token, { organization_id: organizationId, program_key: this.required(input.program_key, 'program_key'), name: this.required(input.name, 'name'), age_range: this.required(input.age_range, 'age_range'), philosophy: input.philosophy ?? '', created_by: user.id });
    return rows[0];
  }

  async createClub(token: string, organizationId: string, input: ClubInput) {
    const user = await this.actor(token);
    const programId = this.required(input.program_id, 'program_id');
    const rows = await this.db.post<any[]>('youth_clubs', token, { organization_id: organizationId, program_id: programId, name: this.required(input.name, 'name'), motto: input.motto ?? null, church_name: input.church_name ?? null, created_by: user.id });
    return rows[0];
  }

  async createMember(token: string, organizationId: string, input: MemberInput) {
    const user = await this.actor(token);
    const rows = await this.db.post<any[]>('youth_members', token, { organization_id: organizationId, user_id: input.user_id ?? null, legal_name: this.required(input.legal_name, 'legal_name'), date_of_birth: input.date_of_birth ?? null, guardian_user_id: input.guardian_user_id ?? null, consent_status: input.consent_status ?? 'PENDING', created_by: user.id });
    return rows[0];
  }

  async addClubMember(token: string, clubId: string, memberId: string, role = 'MEMBER') {
    this.required(clubId, 'club_id'); this.required(memberId, 'member_id');
    if (!['MEMBER', 'LEADER', 'ASSISTANT_LEADER', 'COORDINATOR'].includes(role)) throw new BadRequestException('Invalid Youth club role');
    const rows = await this.db.upsert<any[]>('youth_club_members', token, { club_id: clubId, member_id: memberId, role }, '?on_conflict=club_id,member_id');
    return rows[0];
  }

  async createActivity(token: string, organizationId: string, input: ActivityInput) {
    const user = await this.actor(token);
    if (!['SPIRITUAL', 'SERVICE', 'TRAINING', 'OUTREACH', 'FELLOWSHIP'].includes(input.activity_type)) throw new BadRequestException('Invalid activity_type');
    const rows = await this.db.post<any[]>('youth_activities', token, { organization_id: organizationId, club_id: this.required(input.club_id, 'club_id'), title: this.required(input.title, 'title'), activity_type: input.activity_type, scheduled_on: this.required(input.scheduled_on, 'scheduled_on'), status: input.status ?? 'PLANNED', participants_count: this.integer(input.participants_count ?? 0, 'participants_count'), service_hours: Number(input.service_hours ?? 0), spiritual_actions: this.integer(input.spiritual_actions ?? 0, 'spiritual_actions'), skills_completed: this.integer(input.skills_completed ?? 0, 'skills_completed'), created_by: user.id });
    return rows[0];
  }

  async createAchievement(token: string, organizationId: string, input: AchievementInput) {
    const user = await this.actor(token);
    const rows = await this.db.post<any[]>('youth_achievements', token, { organization_id: organizationId, member_id: this.required(input.member_id, 'member_id'), program_id: this.required(input.program_id, 'program_id'), title: this.required(input.title, 'title'), achievement_type: input.achievement_type ?? 'CLASS', achieved_on: input.achieved_on ?? new Date().toISOString().slice(0, 10), created_by: user.id });
    return rows[0];
  }

  async verifyAchievement(token: string, achievementId: string) {
    const user = await this.actor(token);
    const rows = await this.db.patch<any[]>('youth_achievements', token, { verified: true, verified_by: user.id, verified_at: new Date().toISOString() }, `?id=eq.${this.required(achievementId, 'achievement_id')}&verified=eq.false`);
    if (!rows[0]) throw new NotFoundException('Achievement not found or already verified');
    return rows[0];
  }

  async issueCertificate(token: string, organizationId: string, input: { member_id: string; program_id: string; title: string }) {
    const user = await this.actor(token);
    const code = `ZION-YOUTH-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const rows = await this.db.post<any[]>('youth_certificates', token, { organization_id: organizationId, member_id: this.required(input.member_id, 'member_id'), program_id: this.required(input.program_id, 'program_id'), title: this.required(input.title, 'title'), verification_code: code, issued_by: user.id });
    return rows[0];
  }

  async verifyCertificate(token: string, code: string) {
    await this.actor(token);
    const rows = await this.db.get<any[]>('youth_certificates', token, `?select=id,title,status,verification_code,issued_at&verification_code=eq.${encodeURIComponent(this.required(code, 'verification_code'))}&limit=1`);
    if (!rows[0]) throw new NotFoundException('Certificate not found');
    return { valid: rows[0].status === 'VALID', certificate: rows[0] };
  }
}
