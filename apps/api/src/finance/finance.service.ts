import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { IdentityService } from '../identity/application/identity.service';
import { SupabaseRestClient } from '../common/supabase/supabase-rest.client';
import { env } from '../config/env';
import { StripePaymentService } from './stripe-payment.service';

@Injectable()
export class FinanceService {
  private readonly db = new SupabaseRestClient();
  constructor(private readonly identity: IdentityService, private readonly stripe: StripePaymentService) {}

  async summary(token: string, organizationId: string) {
    await this.identity.getCurrentUser(token);
    const [contributions, staff, payrollRuns] = await Promise.all([
      this.db.get<any[]>('finance_contributions', token, `?select=id,contribution_type,amount_minor,currency,status,occurred_on&organization_id=eq.${organizationId}&order=occurred_on.desc&limit=100`),
      this.db.get<any[]>('finance_staff', token, `?select=id,legal_name,employee_number,department,base_salary_minor,currency,payment_method,active&organization_id=eq.${organizationId}&order=legal_name.asc`),
      this.db.get<any[]>('finance_payroll_runs', token, `?select=id,period_start,period_end,currency,status,total_gross_minor,total_deductions_minor,total_net_minor,approved_at,paid_at,external_payment_reference&organization_id=eq.${organizationId}&order=period_end.desc&limit=30`),
    ]);
    return { contributions, staff, payrollRuns };
  }

  async createContribution(token: string, organizationId: string, input: any) {
    const user = await this.identity.getCurrentUser(token);
    const amount = Number(input.amount_minor);
    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('amount_minor must be a positive integer');
    if (!['DONATION', 'TITHE', 'OFFERING'].includes(input.contribution_type)) throw new BadRequestException('Invalid contribution_type');
    const rows = await this.db.post<any[]>('finance_contributions', token, {
      organization_id: organizationId,
      donor_user_id: input.donor_user_id ?? null,
      contribution_type: input.contribution_type,
      amount_minor: amount,
      currency: String(input.currency ?? '').toUpperCase(),
      payment_method: input.payment_method ?? 'OFFLINE',
      status: input.status ?? 'PENDING',
      occurred_on: input.occurred_on ?? new Date().toISOString().slice(0, 10),
      external_reference: input.external_reference ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    return rows[0];
  }

  async memberContributions(token: string, organizationId: string) {
    const user = await this.identity.getCurrentUser(token);
    return this.db.get<any[]>('finance_contributions', token, `?select=id,organization_id,contribution_type,amount_minor,currency,payment_method,status,occurred_on,receipt_number,paid_at,payment_provider,payment_intent_id,created_at&organization_id=eq.${organizationId}&donor_user_id=eq.${user.id}&order=created_at.desc&limit=100`);
  }

  async submitMemberContribution(token: string, organizationId: string, input: { contribution_type: string; amount_minor: number; currency: string; payment_method: string; idempotency_key?: string }) {
    const user = await this.identity.getCurrentUser(token);
    const amount = Number(input.amount_minor);
    const type = String(input.contribution_type ?? '').toUpperCase();
    const currency = String(input.currency ?? '').toUpperCase();
    const method = String(input.payment_method ?? '').toUpperCase();
    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('amount_minor must be a positive integer');
    if (!['DONATION', 'TITHE', 'OFFERING'].includes(type)) throw new BadRequestException('Invalid contribution_type');
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('currency must be a three-letter code');
    if (!['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH'].includes(method)) throw new BadRequestException('Invalid payment_method');
    const idempotencyKey = input.idempotency_key?.trim() || crypto.randomUUID();
    const existing = await this.db.get<any[]>('finance_contributions', token, `?select=*&organization_id=eq.${organizationId}&donor_user_id=eq.${user.id}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`);
    if (existing[0]) return { contribution: existing[0], checkout_url: existing[0].checkout_url ?? null, next_step: existing[0].status === 'RECEIVED' ? 'Payment already confirmed.' : 'Resume the existing payment.' };
    const rows = await this.db.post<any[]>('finance_contributions', token, { organization_id: organizationId, donor_user_id: user.id, contribution_type: type, amount_minor: amount, currency, payment_method: method, status: 'PENDING', payment_provider: method === 'CARD' ? 'stripe' : null, payment_intent_id: `pending_${crypto.randomUUID()}`, idempotency_key: idempotencyKey, created_by: user.id });
    const contribution = rows[0];
    if (!contribution) throw new BadRequestException('Contribution payment intent was not created');
    if (method !== 'CARD') return { contribution, checkout_url: null, next_step: method === 'CASH' || method === 'BANK_TRANSFER' ? 'Await confirmation by the finance office.' : 'This payment method requires an enabled provider connector.' };
    const checkout = await this.stripe.createCheckout({ contributionId: contribution.id, amountMinor: amount, currency, contributionType: type, organizationId, idempotencyKey });
    const updated = await this.db.patch<any[]>('finance_contributions', token, { provider_checkout_id: checkout.id, checkout_url: checkout.url, external_reference: checkout.id, provider_status: 'checkout.session.created' }, `?id=eq.${contribution.id}&donor_user_id=eq.${user.id}`);
    return { contribution: updated[0] ?? { ...contribution, provider_checkout_id: checkout.id }, checkout_url: checkout.url, next_step: 'Complete payment in the secure Stripe Checkout window.' };
  }

  async processStripeWebhook(rawBody: Buffer, signature: string) {
    this.stripe.verifyWebhook(rawBody, signature);
    const event = JSON.parse(rawBody.toString('utf8')) as { id: string; type: string; data: { object: Record<string, any> } };
    const serviceToken = env.supabaseServiceRoleKey;
    if (!serviceToken) throw new ServiceUnavailableException('SUPABASE_SERVICE_ROLE_KEY is required for payment webhooks');
    const hash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const existing = await this.db.get<any[]>('finance_payment_events', serviceToken, `?select=id,processed_at&provider=eq.stripe&provider_event_id=eq.${encodeURIComponent(event.id)}&limit=1`);
    if (existing[0]?.processed_at) return { received: true, duplicate: true };
    const object = event.data?.object ?? {};
    const contributionId = String(object.metadata?.contribution_id ?? object.client_reference_id ?? '');
    const contribution = contributionId ? (await this.db.get<any[]>('finance_contributions', serviceToken, `?select=id,status& id=eq.${contributionId}&limit=1`.replace('& id=', '&id=')))[0] : null;
    const inserted = existing[0] ? existing : await this.db.post<any[]>('finance_payment_events', serviceToken, { provider: 'stripe', provider_event_id: event.id, event_type: event.type, contribution_id: contribution?.id ?? null, payload_hash: hash, payload: event });
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && contribution?.status !== 'RECEIVED') {
      await this.db.patch('finance_contributions', serviceToken, { status: 'RECEIVED', paid_at: new Date().toISOString(), provider_status: String(object.payment_status ?? event.type), external_reference: String(object.payment_intent ?? object.id) }, `?id=eq.${contribution.id}&status=eq.PENDING`);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await this.db.patch('finance_contributions', serviceToken, { provider_status: event.type }, `?id=eq.${contribution?.id ?? ''}&status=eq.PENDING`);
    }
    if (inserted[0]) await this.db.patch('finance_payment_events', serviceToken, { processed_at: new Date().toISOString() }, `?id=eq.${inserted[0].id}`);
    return { received: true, duplicate: false };
  }

  async contributionReceipt(token: string, contributionId: string) {
    const user = await this.identity.getCurrentUser(token);
    const rows = await this.db.get<any[]>('finance_contributions', token, `?select=id,organization_id,donor_user_id,contribution_type,amount_minor,currency,payment_method,status,occurred_on,receipt_number,paid_at,created_at&id=eq.${contributionId}&donor_user_id=eq.${user.id}&limit=1`);
    const contribution = rows[0];
    if (!contribution) throw new NotFoundException('Contribution not found');
    if (contribution.status !== 'RECEIVED' || !contribution.receipt_number) throw new BadRequestException('Receipt is available after payment confirmation');
    if (!env.receiptSigningSecret) throw new ServiceUnavailableException('ZION_RECEIPT_SIGNING_SECRET is not configured');
    const issuedAt = contribution.paid_at ?? contribution.created_at;
    const canonical = [contribution.id, contribution.receipt_number, contribution.amount_minor, contribution.currency, contribution.contribution_type, issuedAt].join('|');
    const signature = crypto.createHmac('sha256', env.receiptSigningSecret).update(canonical).digest('hex');
    return { receipt_number: contribution.receipt_number, issued_at: issuedAt, signature, verification: `ZION:${contribution.receipt_number}:${signature}`, contribution };
  }

  async createStaff(token: string, organizationId: string, input: any) {
    const user = await this.identity.getCurrentUser(token);
    if (!input.legal_name?.trim() || !input.employee_number?.trim()) throw new BadRequestException('legal_name and employee_number are required');
    const salary = Number(input.base_salary_minor);
    if (!Number.isInteger(salary) || salary < 0) throw new BadRequestException('base_salary_minor must be a non-negative integer');
    const rows = await this.db.post<any[]>('finance_staff', token, {
      organization_id: organizationId,
      user_id: input.user_id ?? null,
      legal_name: input.legal_name.trim(),
      employee_number: input.employee_number.trim(),
      department: input.department?.trim() || null,
      pay_frequency: input.pay_frequency ?? 'MONTHLY',
      base_salary_minor: salary,
      currency: String(input.currency ?? '').toUpperCase(),
      payment_method: input.payment_method ?? 'BANK_TRANSFER',
      payment_account_last4: input.payment_account_last4 ?? null,
      created_by: user.id,
    });
    return rows[0];
  }

  async createPayrollRun(token: string, organizationId: string, input: { period_start: string; period_end: string; currency: string; deductions_minor?: number }) {
    const user = await this.identity.getCurrentUser(token);
    if (!input.period_start || !input.period_end || input.period_end < input.period_start) throw new BadRequestException('A valid payroll period is required');
    const staff = await this.db.get<any[]>('finance_staff', token, `?select=id,base_salary_minor,currency&organization_id=eq.${organizationId}&active=eq.true&currency=eq.${String(input.currency).toUpperCase()}`);
    if (!staff.length) throw new BadRequestException('No active staff found for this currency');
    const deductions = Number(input.deductions_minor ?? 0);
    if (!Number.isInteger(deductions) || deductions < 0) throw new BadRequestException('deductions_minor must be a non-negative integer');
    const gross = staff.reduce((sum, member) => sum + Number(member.base_salary_minor), 0);
    if (deductions > gross) throw new BadRequestException('Deductions cannot exceed gross payroll');
    const runRows = await this.db.post<any[]>('finance_payroll_runs', token, {
      organization_id: organizationId,
      period_start: input.period_start,
      period_end: input.period_end,
      currency: String(input.currency).toUpperCase(),
      total_gross_minor: gross,
      total_deductions_minor: deductions,
      total_net_minor: gross - deductions,
      status: 'PENDING_APPROVAL',
      created_by: user.id,
    });
    const run = runRows[0];
    if (!run) throw new BadRequestException('Payroll run was not created');
    const perItemDeduction = Math.floor(deductions / staff.length);
    for (const member of staff) {
      await this.db.post('finance_payroll_items', token, {
        payroll_run_id: run.id,
        staff_id: member.id,
        gross_minor: Number(member.base_salary_minor),
        deductions_minor: perItemDeduction,
        status: 'PENDING',
        payslip_number: `ZION-${run.id.slice(0, 8).toUpperCase()}-${member.id.slice(0, 8).toUpperCase()}`,
      });
    }
    return run;
  }

  async payrollItems(token: string, runId: string) {
    await this.identity.getCurrentUser(token);
    return this.db.get<any[]>('finance_payroll_items', token, `?select=id,staff_id,gross_minor,deductions_minor,net_minor,status,payslip_number,paid_at,external_reference&payroll_run_id=eq.${runId}&order=payslip_number.asc`);
  }

  async approvePayroll(token: string, runId: string) {
    const user = await this.identity.getCurrentUser(token);
    const rows = await this.db.patch<any[]>('finance_payroll_runs', token, { status: 'APPROVED', approved_by: user.id, approved_at: new Date().toISOString() }, `?id=eq.${runId}&status=eq.PENDING_APPROVAL`);
    if (!rows[0]) throw new NotFoundException('Payroll run not found or not awaiting approval');
    await this.db.patch('finance_payroll_items', token, { status: 'APPROVED' }, `?payroll_run_id=eq.${runId}&status=eq.PENDING`);
    return rows[0];
  }

  async recordSettlement(token: string, runId: string, externalReference: string) {
    await this.identity.getCurrentUser(token);
    if (!externalReference?.trim()) throw new BadRequestException('external_reference is required to record settlement');
    const rows = await this.db.patch<any[]>('finance_payroll_runs', token, { status: 'PAID', paid_at: new Date().toISOString(), external_payment_reference: externalReference.trim() }, `?id=eq.${runId}&status=eq.APPROVED`);
    if (!rows[0]) throw new NotFoundException('Approved payroll run not found');
    await this.db.patch('finance_payroll_items', token, { status: 'PAID', paid_at: new Date().toISOString(), external_reference: externalReference.trim() }, `?payroll_run_id=eq.${runId}&status=eq.APPROVED`);
    return rows[0];
  }
}
