import { resaRequest } from "@/lib/resa/api";
import type { Ministry } from "@/components/ministry/types";

export const ministryService = {
  async getMinistry(id: string): Promise<Ministry | null> {
    try {
      return await resaRequest<Ministry>(`/v1/ministries/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  },
};