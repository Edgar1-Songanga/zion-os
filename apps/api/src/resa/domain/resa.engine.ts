export type ResaContentType = "text" | "image" | "video" | "short_video" | "audio" | "live" | "story" | "article" | "bible_study" | "sermon" | "testimony" | "prayer";
export type ResaVisibility = "public" | "followers" | "community" | "organization" | "private";
export interface ResaContent { id: string; authorId: string; type: ResaContentType; title?: string; body?: string; visibility: ResaVisibility; language: string; organizationId?: string; ministryId?: string; scriptureReferences?: string[]; createdAt: string; }
export interface ResaProfile { userId: string; activeProfile: "personal" | "professional" | "pastor" | "ministry" | "organization" | "creator"; verified: boolean; skills?: string[]; organizationIds?: string[]; }
export interface ResaFeedSignal { relationship: number; community: number; relevance: number; freshness: number; trust: number; diversity: number; }
export interface ResaLiveSession { id: string; hostId: string; title: string; status: "scheduled" | "live" | "ended"; visibility: ResaVisibility; scheduledAt?: string; startedAt?: string; endedAt?: string; recordingId?: string; }
export class ResaEngine {
  scoreFeed(signal: ResaFeedSignal): number {
    return signal.relationship * 0.2 + signal.community * 0.18 + signal.relevance * 0.2 + signal.freshness * 0.14 + signal.trust * 0.16 + signal.diversity * 0.12;
  }
  canPublish(content: Pick<ResaContent, "authorId" | "type" | "visibility">) { return Boolean(content.authorId && content.type && content.visibility); }
  transitionLive(session: ResaLiveSession, next: ResaLiveSession["status"]): ResaLiveSession {
    const valid = session.status === "scheduled" && next === "live" || session.status === "live" && next === "ended";
    if (!valid) throw new Error("Invalid RESA Live transition.");
    const now = new Date().toISOString();
    return { ...session, status: next, ...(next === "live" ? { startedAt: now } : { endedAt: now }) };
  }
}
