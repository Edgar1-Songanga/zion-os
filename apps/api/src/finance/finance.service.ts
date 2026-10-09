import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';

@Injectable()
export class FinanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService) {}

  accounts(token:string, organizationId:string) {
    return this.db.get('finance_accounts', token, `?select=id,code,name,account_type,currency_code,parent_account_id,is_active&organization_id=eq.${organizationId}&order=code.asc`);
  }

  async createAccount(token: string, organizationId: string, input: { code: string; name: string; account_type: string; currency_code?: string; parent_account_id?: string | null }) {
    await this.identity.getCurrentUser(token);
    const code = input.code?.trim().toUpperCase();
    const name = input.name?.trim();
    const accountType = input.account_type?.trim().toUpperCase();
    const currency = (input.currency_code ?? 'AOA').trim().toUpperCase();
    if (!code || !/^[A-Z0-9][A-Z0-9._-]{1,31}$/.test(code)) throw new BadRequestException('Account code must contain 2–32 letters, numbers, dots, underscores or hyphens');
    if (!name || name.length > 160) throw new BadRequestException('Account name is required and must be at most 160 characters');
    if (!['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].includes(accountType)) throw new BadRequestException('Invalid account_type');
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('currency_code must be a three-letter ISO code');
    const parentId = input.parent_account_id?.trim() || null;
    if (parentId) {
      const parents = await this.db.get<Array<{ id: string }>>('finance_accounts', token,
        `?select=id&organization_id=eq.${encodeURIComponent(organizationId)}&id=eq.${encodeURIComponent(parentId)}&limit=1`);
      if (!parents[0]) throw new NotFoundException('Parent account not found in this organization');
    }
    const rows = await this.db.post<Array<{ id: string; code: string; name: string; account_type: string; currency_code: string; parent_account_id: string | null; is_active: boolean }>>(
      'finance_accounts', token,
      { organization_id: organizationId, code, name, account_type: accountType, currency_code: currency, parent_account_id: parentId },
    );
    if (!rows[0]) throw new BadRequestException('Finance account was not created');
    return rows[0];
  }

  journal(token:string, organizationId:string) {
    return this.db.get('finance_journal_entries', token, `?select=id,entry_number,entry_date,description,source_type,source_id,status,created_by,created_at&organization_id=eq.${organizationId}&order=entry_date.desc,entry_number.desc`);
  }

  async createJournal(token:string, organizationId:string, input:{description:string;entry_date?:string;lines:Array<{account_id:string;debit?:number;credit?:number;description?:string}>}) {
    if (!input.description?.trim() || !Array.isArray(input.lines) || input.lines.length < 2 || input.lines.length > 200) {
      throw new BadRequestException('A journal entry requires a description and at least two lines');
    }
    let debitCents = 0, creditCents = 0;
    const accountIds = new Set<string>();
    for (const line of input.lines) {
      const d = Number(line.debit ?? 0), c = Number(line.credit ?? 0);
      if (!line.account_id || !Number.isFinite(d) || !Number.isFinite(c) || d < 0 || c < 0 || (d > 0 && c > 0) || (d <= 0 && c <= 0) || Math.abs(d * 100 - Math.round(d * 100)) > 1e-8 || Math.abs(c * 100 - Math.round(c * 100)) > 1e-8 || !Number.isSafeInteger(Math.round(d * 100)) || !Number.isSafeInteger(Math.round(c * 100))) throw new BadRequestException('Each journal line must contain one positive amount with at most two decimal places');
      if (accountIds.has(line.account_id)) throw new BadRequestException('Each journal line must use a different account');
      accountIds.add(line.account_id);
      debitCents += Math.round(d * 100); creditCents += Math.round(c * 100);
    }
    if (debitCents !== creditCents) throw new BadRequestException('Journal entry is not balanced');
    const accounts = await this.db.get<Array<{ id: string; currency_code: string; is_active: boolean }>>(
      'finance_accounts', token,
      `?select=id,currency_code,is_active&organization_id=eq.${encodeURIComponent(organizationId)}&id=in.(${[...accountIds].map(encodeURIComponent).join(',')})&limit=200`,
    );
    if (accounts.length !== accountIds.size || accounts.some((account) => !account.is_active)) throw new BadRequestException('All journal accounts must be active and belong to this organization');
    if (new Set(accounts.map((account) => account.currency_code)).size !== 1) throw new BadRequestException('A journal entry cannot mix currencies without an exchange-rate record');
    await this.identity.getCurrentUser(token);
    const entryDate = input.entry_date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || Number.isNaN(Date.parse(`${entryDate}T00:00:00Z`))) throw new BadRequestException('entry_date must be a valid YYYY-MM-DD date');
    return this.db.rpc<Record<string, unknown>>('create_finance_manual_journal_entry', token, {
      p_organization_id: organizationId,
      p_description: input.description.trim(),
      p_entry_date: entryDate,
      p_lines: input.lines.map((line) => ({
        account_id: line.account_id,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        description: line.description?.trim() || null,
      })),
    });
  }
}
