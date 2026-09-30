import { Injectable } from "@nestjs/common";
import type { PrayerRequest, PrayerServicePort } from "./prayer.types";

@Injectable()
export class PrayerService implements PrayerServicePort {
  async create(input: Omit<PrayerRequest, "id" | "status" | "createdAt">): Promise<PrayerRequest> {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!input.userId || !title || !content) throw new Error("Prayer request requires user, title and content.");
    return { ...input, id: crypto.randomUUID(), title, content, status: "active", createdAt: new Date().toISOString() };
  }

  async answer(id: string, userId: string): Promise<PrayerRequest> {
    if (!id || !userId) throw new Error("Prayer id and user id are required.");
    return { id, userId, title: "", content: "", visibility: "private", status: "answered", createdAt: new Date().toISOString(), answeredAt: new Date().toISOString() };
  }
}