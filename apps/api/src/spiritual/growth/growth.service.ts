import { BadRequestException, Inject, Injectable, Optional, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import type { GrowthEvent, GrowthRepository, GrowthSnapshot } from "./growth.types";

export const GROWTH_REPOSITORY = Symbol("GROWTH_REPOSITORY");

@Injectable()
export class GrowthService {
  constructor(
    @Optional() @Inject(GROWTH_REPOSITORY)
    private readonly repository?: GrowthRepository,
  ) {}

  async record(token: string, input: Omit<GrowthEvent, "id" | "occurredAt">): Promise<GrowthEvent> {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    if (!input?.userId || !input.source) {
      throw new BadRequestException("Growth events require user and source.");
    }

    const event: GrowthEvent = {
      ...input,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    };

    if (!this.repository) {
      throw new ServiceUnavailableException("Growth persistence is not configured.");
    }

    return this.repository.record(token, event);
  }

  async snapshot(token: string, userId: string, period: string, from?: string, to?: string): Promise<GrowthSnapshot> {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    if (!userId || !period) {
      throw new BadRequestException("Growth snapshot requires user and period.");
    }
    if (!this.repository) {
      throw new ServiceUnavailableException("Growth persistence is not configured.");
    }

    const events = await this.repository.listForUser(token, userId, from, to);
    return { userId, period, events };
  }
}
