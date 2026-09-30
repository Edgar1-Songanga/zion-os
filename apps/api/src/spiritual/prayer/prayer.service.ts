import { Inject, Injectable, Optional } from "@nestjs/common";
import type { PrayerRepository, PrayerRequest, PrayerServicePort } from "./prayer.types";

export const PRAYER_REPOSITORY = Symbol("PRAYER_REPOSITORY");

@Injectable()
export class PrayerService implements PrayerServicePort {
  constructor(
    @Optional() @Inject(PRAYER_REPOSITORY)
    private readonly repository?: PrayerRepository,
  ) {}

  async create(input: Omit<PrayerRequest, "id" | "status" | "createdAt">): Promise<PrayerRequest> {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!input.userId || !title || !content) {
      throw new Error("Prayer request requires user, title and content.");
    }

    const request: PrayerRequest = {
      ...input,
      id: crypto.randomUUID(),
      title,
      content,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    return this.repository ? this.repository.create(request) : request;
  }

  async answer(id: string, userId: string): Promise<PrayerRequest> {
    if (!id || !userId) throw new Error("Prayer id and user id are required.");

    if (!this.repository) {
      throw new Error("Prayer persistence is not configured.");
    }

    const request = await this.repository.getById(id);
    if (!request) throw new Error("Prayer request not found.");

    if (request.status !== "active") {
      throw new Error("Only active prayer requests can be answered.");
    }

    const answered = await this.repository.markAnswered(id, new Date().toISOString());
    if (!answered) throw new Error("Prayer request could not be marked as answered.");

    return answered;
  }
}