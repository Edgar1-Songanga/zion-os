import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
    const description = input.description?.trim();
    if (!description || description.length < 2 || description.length > 500 || !Array.isArray(input.lines) || input.lines.length < 2 || input.lines.length > 200) {
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
    const entryDate = input.entry_date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw new BadRequestException('entry_date must be a valid YYYY-MM-DD date');
    const parsedEntryDate = new Date(`${entryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedEntryDate.getTime()) || parsedEntryDate.toISOString().slice(0, 10) !== entryDate) {
      throw new BadRequestException('entry_date must be a valid YYYY-MM-DD date');
    }
    const accounts = await this.db.get<Array<{ id: string; currency_code: string; is_active: boolean }>>(
      'finance_accounts', token,
      `?select=id,currency_code,is_active&organization_id=eq.${encodeURIComponent(organizationId)}&id=in.(${[...accountIds].map(encodeURIComponent).join(',')})&limit=200`,
    );
    if (accounts.length !== accountIds.size || accounts.some((account) => !account.is_active)) throw new BadRequestException('All journal accounts must be active and belong to this organization');
    if (new Set(accounts.map((account) => account.currency_code)).size !== 1) throw new BadRequestException('A journal entry cannot mix currencies without an exchange-rate record');
    await this.identity.getCurrentUser(token);
    return this.db.rpc<Record<string, unknown>>('create_finance_manual_journal_entry', token, {
      p_organization_id: organizationId,
      p_description: description,
      p_entry_date: entryDate,
      p_lines: input.lines.map((line) => ({
        account_id: line.account_id,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        description: line.description?.trim() || null,
      })),
    });
  }

  async givingFunds(token: string, organizationId: string) {
    await this.identity.getCurrentUser(token);
    const rows = await this.db.get<Array<{id:string;code:string;name:string;kind:string;is_active:boolean}>>(
      'giving_funds', token,
      `?select=id,code,name,kind,is_active&organization_id=eq.${encodeURIComponent(organizationId)}&is_active=eq.true&order=name.asc`,
    );
    return rows.map((fund) => ({
      id: fund.id, code: fund.code, name: fund.name, fund_type: fund.kind,
      description: ({TITHE:'Dízimos e fidelidade cristã.',OFFERING:'Ofertas regulares para as necessidades da igreja.',BUILDING:'Construção, reparação e manutenção.',MISSIONS:'Missões e evangelismo.',OTHER:'Destino aprovado pela igreja.'} as Record<string,string>)[fund.kind] ?? 'Contribuição para a igreja.',
    }));
  }

  async createGivingContribution(token: string, organizationId: string, input: { fund_id: string; amount: number; payment_method?: string; method_id?: string; note?: string }) {
    const user = await this.identity.getCurrentUser(token);
    const amount = Number(input.amount);
    if (!input.fund_id || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
      throw new BadRequestException('Escolha um destino e indique um valor positivo com até duas casas decimais.');
    }
    if (input.payment_method && input.payment_method !== 'BANK_TRANSFER') {
      throw new BadRequestException('Este método de pagamento ainda não está integrado.');
    }
    const funds = await this.db.get<Array<{id:string}>>('giving_funds', token,
      `?select=id&organization_id=eq.${encodeURIComponent(organizationId)}&id=eq.${encodeURIComponent(input.fund_id)}&is_active=eq.true&limit=1`);
    if (!funds[0]) throw new NotFoundException('Destino de contribuição não encontrado ou inativo.');
    let methodId = input.method_id;
    if (!methodId) {
      const methods = await this.db.get<Array<{id:string;provider:string;public_details:Record<string,unknown>}>>(
        'giving_payment_methods', token,
        `?select=id,provider,public_details&organization_id=eq.${encodeURIComponent(organizationId)}&provider=eq.BANK_TRANSFER&is_enabled=eq.true&limit=1`,
      );
      if (!methods[0]) throw new BadRequestException('A tesouraria ainda não configurou os dados bancários desta igreja.');
      methodId = methods[0].id;
    }
    const created = await this.db.rpc<Record<string, unknown>>('create_giving_payment', token, {
      p_organization_id: organizationId,
      p_fund_id: input.fund_id,
      p_method_id: methodId,
      p_amount: Math.round(amount * 100) / 100,
      p_note: input.note?.trim() || null,
      p_idempotency_key: randomUUID(),
    });
    const paymentId = String(created?.id ?? '');
    if (!paymentId) throw new BadRequestException('O sistema não devolveu a referência da contribuição.');
    const rows = await this.db.get<Array<Record<string, unknown>>>('giving_payments', token,
      `?select=id,organization_id,fund_id,donor_user_id,method_id,amount,currency_code,status,reference,created_at,confirmed_at,expires_at&organization_id=eq.${encodeURIComponent(organizationId)}&id=eq.${encodeURIComponent(paymentId)}&limit=1`);
    const row = rows[0];
    if (!row) throw new BadRequestException('O pedido foi criado, mas não foi possível carregar os seus detalhes.');
    const methods = await this.db.get<Array<{id:string;provider:string;label:string;public_details:Record<string,unknown>}>>(
      'giving_payment_methods', token, `?select=id,provider,label,public_details&id=eq.${encodeURIComponent(String(row.method_id))}&limit=1`);
    return {...row, contributor_id: user.id, reference_code: row.reference, payment_method: methods[0]?.provider ?? 'BANK_TRANSFER', instructions: methods[0] ? {label:methods[0].label,provider:methods[0].provider,details:methods[0].public_details} : created?.instructions ?? null};
  }

  async myGivingContributions(token: string, organizationId: string) {
    const user = await this.identity.getCurrentUser(token);
    const rows = await this.db.get<Array<Record<string, unknown>>>('giving_payments', token,
      `?select=id,organization_id,fund_id,donor_user_id,method_id,amount,currency_code,status,reference,created_at,confirmed_at,expires_at&organization_id=eq.${encodeURIComponent(organizationId)}&donor_user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=100`);
    if (!rows.length) return [];
    const fundIds = [...new Set(rows.map((row) => String(row.fund_id)))];
    const paymentIds = rows.map((row) => String(row.id));
    const [funds, receipts, methods] = await Promise.all([
      this.db.get<Array<{id:string;name:string}>>('giving_funds', token, `?select=id,name&id=in.(${fundIds.map(encodeURIComponent).join(',')})`),
      this.db.get<Array<{payment_id:string;receipt_number:string;content_hash:string;verification_code:string;issued_at:string}>>('giving_receipts', token, `?select=payment_id,receipt_number,content_hash,verification_code,issued_at&payment_id=in.(${paymentIds.map(encodeURIComponent).join(',')})`),
      this.db.get<Array<{id:string;provider:string;label:string}>>('giving_payment_methods', token, `?select=id,provider,label&id=in.(${[...new Set(rows.map(row=>String(row.method_id)))].map(encodeURIComponent).join(',')})`),
    ]);
    return rows.map((row) => {
      const receipt = receipts.find((item) => item.payment_id === row.id);
      const method = methods.find((item) => item.id === row.method_id);
      return {...row, reference_code:row.reference, payment_method:method?.provider ?? 'BANK_TRANSFER',
        status:row.status === 'AWAITING_CONFIRMATION' ? 'UNDER_REVIEW' : row.status === 'FAILED' ? 'REJECTED' : row.status,
        fund:funds.find((fund) => fund.id === row.fund_id) ?? null,
        receipt:receipt ? {receipt_number:receipt.receipt_number,verification_hash:receipt.content_hash,verification_code:receipt.verification_code,issued_at:receipt.issued_at} : null};
    });
  }

  async treasuryGivingContributions(token: string, organizationId: string) {
    await this.identity.getCurrentUser(token);
    const rows = await this.db.rpc<Array<Record<string, unknown>>>('list_giving_payments', token, {
      p_organization_id: organizationId, p_status: null, p_limit: 200,
    });
    return rows.map((row) => ({...row, reference_code:row.reference, payment_method:row.method_label,
      status:row.status === 'AWAITING_CONFIRMATION' ? 'UNDER_REVIEW' : row.status === 'FAILED' ? 'REJECTED' : row.status}));
  }

  async confirmGivingContribution(token: string, organizationId: string, contributionId: string) {
    await this.identity.getCurrentUser(token);
    const payment = await this.db.get<Array<{id:string;organization_id:string}>>('giving_payments', token,
      `?select=id,organization_id&id=eq.${encodeURIComponent(contributionId)}&organization_id=eq.${encodeURIComponent(organizationId)}&limit=1`);
    if (!payment[0]) throw new NotFoundException('Pedido não encontrado nesta organização.');
    return this.db.rpc<Record<string, unknown>>('confirm_giving_payment', token, {
      p_payment_id: contributionId, p_provider_reference: null,
    });
  }

  async configureGivingBankTransfer(token: string, organizationId: string, input: { bank_name:string; account_holder:string; iban:string }) {
    await this.identity.getCurrentUser(token);
    const bankName = input.bank_name?.trim();
    const accountHolder = input.account_holder?.trim();
    const iban = input.iban?.replace(/\\s+/g, '').toUpperCase();
    if (!bankName || bankName.length < 2 || bankName.length > 120 || !accountHolder || accountHolder.length < 2 || accountHolder.length > 120 || !iban || !/^AO[0-9]{23}$/.test(iban)) {
      throw new BadRequestException('Indique o banco, o titular da conta e um IBAN angolano válido (AO + 23 dígitos).');
    }
    const methods = await this.db.get<Array<{id:string;provider:string;asset_account_id:string|null}>>('giving_payment_methods', token,
      `?select=id,provider,asset_account_id&organization_id=eq.${encodeURIComponent(organizationId)}&provider=eq.BANK_TRANSFER&limit=1`);
    if (!methods[0]?.asset_account_id) throw new BadRequestException('A configuração contabilística ainda não foi inicializada. Sincronize a migração Giving.');
    const payload = {is_enabled:true,public_details:{bank_name:bankName,account_holder:accountHolder,iban},updated_at:new Date().toISOString()};
    const updated = await this.db.patch<Array<Record<string,unknown>>>('giving_payment_methods', token, payload,
      `?id=eq.${encodeURIComponent(methods[0].id)}&organization_id=eq.${encodeURIComponent(organizationId)}`);
    if (!updated[0]) throw new ForbiddenException('Sem permissão para configurar os dados bancários. É necessária a permissão giving.manage.');
    return updated[0];
  }

}
