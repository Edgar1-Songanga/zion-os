export type PrayerVisibility = "private" | "community" | "organization";
export type PrayerStatus = "active" | "answered" | "archived";

export interface PrayerRequest {
  id: string;
  userId: string;
  title: string;
  content: string;
  visibility: PrayerVisibility;
  status: PrayerStatus;
  createdAt: string;
  answeredAt?: string;
}

export interface PrayerServicePort {
  create(input: Omit<PrayerRequest, "id" | "status" | "createdAt">): Promise<PrayerRequest>;
  answer(id: string, userId: string): Promise<PrayerRequest>;
}