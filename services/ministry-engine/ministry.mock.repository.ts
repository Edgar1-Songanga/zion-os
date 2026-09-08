import { Ministry } from "@/components/ministry/types";
import { MinistryRepository } from "./ministry.repository";


const ministries: Ministry[] = [
  {
    id: "ministry-youth-001",

    name: "Ministério Jovem",

    department: "Youth Ministry",

    description:
      "Ministério dedicado ao desenvolvimento espiritual, liderança e discipulado dos jovens.",

    status: "ACTIVE",


    organization: {
      church: "Igreja Central",
      district: "Distrito Viana",
      conference: "Conferência Sul de Angola",
      union: "União Angola",
      division: "África Austral-Oceano Índico",
      generalConference: "General Conference",
    },


    metrics: {
      members: 450,
      leaders: 18,
      programs: 12,
      participation: 86,
      growth: 14,
      impact: 91,
    },


    leadership: [
      {
        id: "leader-001",
        name: "João Manuel",
        role: "Director do Ministério Jovem",
        verified: true,
      },

      {
        id: "leader-002",
        name: "Maria José",
        role: "Secretária",
        verified: true,
      },
    ],


    programs: [
      {
        id: "program-001",
        name: "Semana Jovem",
        description:
          "Programa espiritual anual para jovens.",
        status: "ACTIVE",
      },

      {
        id: "program-002",
        name: "Pequenos Grupos",
        status: "ACTIVE",
      },
    ],


    reports: [
      {
        id: "report-001",
        title: "Relatório Mensal Setembro",
        status: "PENDING",
      },
    ],
  },
];


export class MinistryMockRepository
  implements MinistryRepository {

  async getById(
    id: string
  ): Promise<Ministry | null> {

    return (
      ministries.find(
        (ministry) => ministry.id === id
      ) ?? null
    );

  }


  async getAll(): Promise<Ministry[]> {

    return ministries;

  }

}
