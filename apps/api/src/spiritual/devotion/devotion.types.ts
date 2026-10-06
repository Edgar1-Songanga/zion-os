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
  save(token: string, entry: DevotionEntry): Promise<DevotionEntry>;
  getById(token: string, id: string): Promise<DevotionEntry | null>;
  listForUser(token: string, userId: string, limit?: number): Promise<DevotionEntry[]>;
}
