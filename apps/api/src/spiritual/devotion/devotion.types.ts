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
  getById(id: string): Promise<DevotionEntry | null>;
  listForUser(userId: string, limit?: number): Promise<DevotionEntry[]>;
}