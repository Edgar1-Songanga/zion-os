export interface DevotionEntry {
  id: string;
  userId: string;
  title: string;
  scriptureReferences: string[];
  reflection: string;
  prayer?: string;
  completedAt: string;
}

export interface DevotionProvider {
  save(entry: DevotionEntry): Promise<DevotionEntry>;
  listForUser(userId: string, limit?: number): Promise<DevotionEntry[]>;
}