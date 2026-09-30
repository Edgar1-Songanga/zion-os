import type { Ministry } from "@/components/ministry/types";

const ministries: Record<string, Ministry> = {
  "ministry-youth-001": {
    id: "ministry-youth-001",
    name: "Youth Ministry",
    department: "Youth",
    description:
      "Centraliza a gestão, acompanhamento e reporting do ministério de jovens.",
    status: "ACTIVE",
    organization: {
      church: "ZION Local Church",
      district: "Central District",
      conference: "ZION Conference",
      union: "ZION Union",
    },
    metrics: {
      members: 0,
      leaders: 0,
      programs: 0,
      participation: 0,
      growth: 0,
      impact: 0,
    },
    leadership: [],
    programs: [],
    reports: [],
  },
};

export const ministryService = {
  async getMinistry(id: string): Promise<Ministry | null> {
    return ministries[id] ?? null;
  },
};
