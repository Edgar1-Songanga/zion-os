import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../../identity/application/identity.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

@Injectable()
export class GovernanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  private async actor(token: string) { return this.identity.getCurrentUser(token); }
  private async audit(token: string, orgId: string, actorId: string, action: string, type: string, id: string, metadata: unknown = {}) {
    await this.db.post('audit_logs', token, { organization_id: orgId, actor_user_id: actorId, action, resource_type: type, resource_id: id, metadata });
  }

  async councils(token: string, orgId: string) {
    return this.db.get('governance_councils', token, `?select=*&organization_id=eq.${orgId}&order=name.asc`);
  }

  async createCouncil(token: string, orgId: string, input: { name: string; description?: string; unit_id?: string | null }) {
    const a=await this.actor(token); if(!input.name?.trim()) throw new BadRequestException('name is required');
    const rows=await this.db.post<any[]>('governance_councils',token,{organization_id:orgId,name:input.name.trim(),description:input.description?.trim()||null,unit_id:input.unit_id??null,created_by:a.id});
    const row=rows[0]; if(!row) throw new BadRequestException('Council was not created');
    await this.audit(token,orgId,a.id,'council.created','governance_council',row.id); return row;
  }

  async meetings(token: string, councilId: string) {
    return this.db.get('governance_meetings',token,`?select=*&council_id=eq.${councilId}&order=scheduled_at.desc`);
  }

  async createMeeting(token:string,councilId:string,input:{title:string;description?:string;scheduled_at:string}) {
    const a=await this.actor(token); if(!input.title?.trim()||!input.scheduled_at) throw new BadRequestException('title and scheduled_at are required');
    const rows=await this.db.post<any[]>('governance_meetings',token,{council_id:councilId,title:input.title.trim(),description:input.description?.trim()||null,scheduled_at:input.scheduled_at,created_by:a.id});
    const row=rows[0]; if(!row) throw new BadRequestException('Meeting was not created'); return row;
  }

  async agenda(token:string,meetingId:string){return this.db.get('governance_agenda_items',token,`?select=*&meeting_id=eq.${meetingId}&order=position.asc`);}
  async addAgenda(token:string,meetingId:string,input:{title:string;position:number;description?:string;item_type?:string}) {
    if(!input.title?.trim()) throw new BadRequestException('title is required');
    const rows=await this.db.post<any[]>('governance_agenda_items',token,{meeting_id:meetingId,title:input.title.trim(),position:input.position,description:input.description?.trim()||null,item_type:input.item_type||'DISCUSSION'});
    return rows[0];
  }

  async motions(token:string,meetingId:string){return this.db.get('governance_motions',token,`?select=*&meeting_id=eq.${meetingId}&order=created_at.asc`);}
  async createMotion(token:string,meetingId:string,input:{title:string;body:string;agenda_item_id?:string|null}) {
    const a=await this.actor(token); if(!input.title?.trim()||!input.body?.trim()) throw new BadRequestException('title and body are required');
    const rows=await this.db.post<any[]>('governance_motions',token,{meeting_id:meetingId,title:input.title.trim(),body:input.body.trim(),agenda_item_id:input.agenda_item_id??null});
    const row=rows[0]; if(!row) throw new BadRequestException('Motion was not created'); return row;
  }

  async vote(token:string,motionId:string,councilMemberId:string,choice:string) {
    const a=await this.actor(token); const allowed=['YES','NO','ABSTAIN'];
    if(!allowed.includes(choice)) throw new BadRequestException('Invalid vote choice');
    const rows=await this.db.post<any[]>('governance_votes',token,{motion_id:motionId,council_member_id:councilMemberId,choice});
    const row=rows[0]; if(!row) throw new BadRequestException('Vote was not recorded'); return row;
  }

  async decide(token:string,motionId:string,outcome:string) {
    const a=await this.actor(token);
    if(!['APPROVED','REJECTED','NO_DECISION'].includes(outcome)) throw new BadRequestException('Invalid decision outcome');
    const votes=await this.db.get<any[]>('governance_votes',token,`?select=choice&motion_id=eq.${motionId}`);
    const yes=votes.filter(v=>v.choice==='YES').length,no=votes.filter(v=>v.choice==='NO').length,abstain=votes.filter(v=>v.choice==='ABSTAIN').length;
    const rows=await this.db.post<any[]>('governance_decisions',token,{motion_id:motionId,outcome,yes_count:yes,no_count:no,abstain_count:abstain,quorum_met:true,decided_by:a.id});
    return rows[0];
  }

  async minutes(token:string,meetingId:string){return this.db.get('governance_minutes',token,`?select=*&meeting_id=eq.${meetingId}&limit=1`);}
  async saveMinutes(token:string,meetingId:string,content:string,status='DRAFT') {
    const a=await this.actor(token);
    const rows=await this.db.post<any[]>('governance_minutes',token,{meeting_id:meetingId,content,status,created_by:a.id});
    return rows[0];
  }
}
