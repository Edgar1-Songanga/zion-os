import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

type CheckoutInput = { contributionId: string; amountMinor: number; currency: string; contributionType: string; organizationId: string; idempotencyKey: string };
type StripeCheckout = { id: string; url: string; payment_intent?: string };

@Injectable()
export class StripePaymentService {
  private configured() {
    if (env.paymentProvider !== 'stripe' || !env.stripeSecretKey || !env.stripeWebhookSecret || !env.paymentSuccessUrl || !env.paymentCancelUrl) {
      throw new ServiceUnavailableException('Online payments are not configured. Set ZION_PAYMENT_PROVIDER=stripe, Stripe credentials, webhook secret, and success/cancel URLs.');
    }
  }

  async createCheckout(input: CheckoutInput): Promise<StripeCheckout> {
    this.configured();
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${env.paymentSuccessUrl}?contribution_id=${encodeURIComponent(input.contributionId)}&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${env.paymentCancelUrl}?contribution_id=${encodeURIComponent(input.contributionId)}`);
    params.set('client_reference_id', input.contributionId);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
    params.set('line_items[0][price_data][unit_amount]', String(input.amountMinor));
    params.set('line_items[0][price_data][product_data][name]', `ZION ${input.contributionType.toLowerCase()}`);
    params.set('metadata[contribution_id]', input.contributionId);
    params.set('metadata[organization_id]', input.organizationId);
    params.set('metadata[idempotency_key]', input.idempotencyKey);
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': input.idempotencyKey }, body: params });
    const payload = await response.json() as StripeCheckout & { error?: { message?: string } };
    if (!response.ok || !payload.id || !payload.url) throw new BadRequestException(payload.error?.message ?? 'Stripe checkout session was not created');
    return payload;
  }

  verifyWebhook(rawBody: Buffer, signature: string) {
    this.configured();
    const timestamp = signature.split(',').find((part) => part.startsWith('t='))?.slice(2);
    const signatures = signature.split(',').filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
    if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new BadRequestException('Invalid or expired Stripe webhook signature');
    const expected = createHmac('sha256', env.stripeWebhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
    if (!signatures.some((candidate) => candidate.length === expected.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)))) throw new BadRequestException('Invalid Stripe webhook signature');
  }
}
