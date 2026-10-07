import { BadRequestException, Injectable } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

@Injectable()
export class FinanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  accounts(token:string, organizationId:string) {
    return this.db.get('finance_accounts', token, `?select=id,code,name,account_type,currency_code,parent_account_id,is_active&organization_id=eq.${organizationId}&order=code.asc`);
  }

  journal(token:string, organizationId:string) {
    return this.db.get('finance_journal_entries', token, `?select=id,entry_number,entry_date,description,source_type,source_id,status,created_by,created_at&organization_id=eq.${organizationId}&order=entry_date.desc,entry_number.desc`);
  }

  async createJournal(token:string, organizationId:string, input:{description:string;entry_date?:string;lines:Array<{account_id:string;debit?:number;credit?:number;description?:string}>}) {
    if (!input.description?.trim() || !Array.isArray(input.lines) || input.lines.length < 2) {
      throw new BadRequestException('A journal entry requires a description and at least two lines');
    }
    let debit = 0, credit = 0;
    for (const line of input.lines) {
      const d = Number(line.debit ?? 0), c = Number(line.credit ?? 0);
      if ((d > 0 && c > 0) || (d <= 0 && c <= 0)) throw new BadRequestException('Each journal line must contain either debit or credit');
      debit += d; credit += c;
    }
    if (Math.abs(debit-credit) > 0.0001) throw new BadRequestException('Journal entry is not balanced');
    const user = await this.identity.getCurrentUser(token);
    const entries = await this.db.post<Array<{id:string}>>('finance_journal_entries', token, {
      organization_id: organizationId, description: input.description.trim(), entry_date: input.entry_date ?? new Date().toISOString().slice(0,10),
      source_type: 'MANUAL', status: 'DRAFT', created_by: user.id,
    });
    const entry = entries[0];
    if (!entry) throw new BadRequestException('Journal entry was not created');
    for (const line of input.lines) {
      await this.db.post('finance_journal_lines', token, {
        journal_entry_id: entry.id, account_id: line.account_id, debit: Number(line.debit ?? 0), credit: Number(line.credit ?? 0),
        description: line.description ?? null,
      });
    }
    return this.db.patch('finance_journal_entries', token, {status:'POSTED'}, `?id=eq.${entry.id}&organization_id=eq.${organizationId}`);
  }
}
