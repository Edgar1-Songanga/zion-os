import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResaEnforcementService } from './resa-enforcement.service';
import { SupabaseRestClient } from '../../common/supabase/supabase-rest.client';

const ACTOR='11111111-1111-4111-8111-111111111111';
const CONTENT='22222222-2222-4222-8222-222222222222';
const ACTION='33333333-3333-4333-8333-333333333333';
const APPEAL='44444444-4444-4444-8444-444444444444';

describe('ResaEnforcementService',()=>{
  let service:ResaEnforcementService;
  let getSpy:jest.SpyInstance;
  let postSpy:jest.SpyInstance;
  let rpcSpy:jest.SpyInstance;

  beforeEach(()=>{
    getSpy=jest.spyOn(SupabaseRestClient.prototype,'get').mockResolvedValue([] as never);
    postSpy=jest.spyOn(SupabaseRestClient.prototype,'post').mockResolvedValue([{id:APPEAL}] as never);
    rpcSpy=jest.spyOn(SupabaseRestClient.prototype,'rpc').mockResolvedValue({id:ACTION} as never);
    const identity={getCurrentUser:jest.fn().mockResolvedValue({id:ACTOR})};
    service=new ResaEnforcementService(identity as never);
  });
  afterEach(()=>jest.restoreAllMocks());

  it('applies content removal through the atomic authorization RPC',async()=>{
    await expect(service.applyAction('token',CONTENT,{action_type:'content_removed',reason:'A regra de segurança foi violada.'})).resolves.toEqual({id:ACTION});
    expect(rpcSpy).toHaveBeenCalledWith('resa_apply_content_moderation_action','token',{
      p_content_id:CONTENT,p_action_type:'content_removed',p_reason:'A regra de segurança foi violada.',
    });
  });

  it('rejects unsupported moderation actions before calling the database',async()=>{
    await expect(service.applyAction('token',CONTENT,{action_type:'account_suspended',reason:'A regra de segurança foi violada.'})).rejects.toBeInstanceOf(BadRequestException);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('allows only the affected author to appeal an active removal',async()=>{
    getSpy.mockResolvedValueOnce([{id:ACTION,target_user_id:ACTOR,action_type:'content_removed',status:'active'}] as never);
    await service.appeal('token',ACTION,{reason:'A publicação foi retirada sem contexto suficiente.'});
    expect(postSpy).toHaveBeenCalledWith('resa_content_moderation_appeals','token',expect.objectContaining({action_id:ACTION,appellant_id:ACTOR}));
  });

  it('rejects an appeal when the sanction is not an active content removal',async()=>{
    getSpy.mockResolvedValueOnce([{id:ACTION,target_user_id:ACTOR,action_type:'formal_warning',status:'active'}] as never);
    await expect(service.appeal('token',ACTION,{reason:'A publicação foi retirada sem contexto suficiente.'})).rejects.toBeInstanceOf(NotFoundException);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('requires a reasoned final decision and delegates second-review enforcement to PostgreSQL',async()=>{
    await expect(service.decide('token',APPEAL,'overturned','')).rejects.toBeInstanceOf(BadRequestException);
    await service.decide('token',APPEAL,'overturned','A remoção foi excessiva após análise independente.');
    expect(rpcSpy).toHaveBeenCalledWith('resa_decide_content_moderation_appeal','token',{
      p_appeal_id:APPEAL,p_status:'overturned',p_decision_note:'A remoção foi excessiva após análise independente.',
    });
  });

  it('creates an account restriction through the global-admin RPC',async()=>{
    await service.createAccountSanction('token',{target_user_id:CONTENT,restriction_type:'publishing',reason:'Violações repetidas das regras da comunidade.',expires_at:'2027-01-01T00:00:00.000Z'});
    expect(rpcSpy).toHaveBeenCalledWith('resa_admin_create_account_sanction','token',{
      p_target_user_id:CONTENT,p_restriction_type:'publishing',p_reason:'Violações repetidas das regras da comunidade.',p_expires_at:'2027-01-01T00:00:00.000Z',
    });
  });

  it('rejects an invalid account restriction before database access',async()=>{
    await expect(service.createAccountSanction('token',{target_user_id:CONTENT,restriction_type:'ban_everything',reason:'Violação comprovada das regras.'})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits account-sanction appeals through the protected RPC',async()=>{
    await service.submitAccountSanctionAppeal('token',ACTION,{reason:'A restrição foi aplicada sem análise de contexto.'});
    expect(rpcSpy).toHaveBeenCalledWith('resa_submit_account_sanction_appeal','token',{
      p_sanction_id:ACTION,p_reason:'A restrição foi aplicada sem análise de contexto.',p_details:null,
    });
  });

  it('requires a reasoned independent decision for account-sanction appeals',async()=>{
    await expect(service.decideAccountSanctionAppeal('token',APPEAL,'overturned','')).rejects.toBeInstanceOf(BadRequestException);
    await service.decideAccountSanctionAppeal('token',APPEAL,'overturned','A revisão independente identificou erro na sanção.');
    expect(rpcSpy).toHaveBeenCalledWith('resa_admin_decide_account_sanction_appeal','token',{
      p_appeal_id:APPEAL,p_status:'overturned',p_decision_note:'A revisão independente identificou erro na sanção.',
    });
  });
});
