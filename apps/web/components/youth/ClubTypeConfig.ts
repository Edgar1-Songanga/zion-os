export type ClubType =
  | "Aventureiros"
  | "Desbravadores"
  | "Embaixadores"
  | "Jovens Adultos"
  | "Ministério de Universitários (PCM)";

export interface ClubTypeConfig {
  name: string;
  description: string;
  philosophy: string;
  ageRange: string;
  classes: string[];
}

export const CLUB_TYPES: ClubTypeConfig[] = [
  {
    name: "Aventureiros",
    description:
      "Programa de desenvolvimento espiritual, familiar e pessoal para crianças, com experiências adequadas à infância e participação ativa das famílias.",
    philosophy:
      "Ajudar a criança a conhecer Jesus, desenvolver carácter e aprender a servir.",
    ageRange: "4–9 anos",
    classes: [
      "Abelhinha Laboriosa",
      "Raio de Sol",
      "Construtor",
      "Mãos Ajudadoras",
    ],
  },
  {
    name: "Desbravadores",
    description:
      "Programa de discipulado e desenvolvimento integral que combina classes progressivas, especialidades, competências práticas, liderança, natureza e serviço comunitário.",
    philosophy: "Salvar do pecado e guiar no serviço.",
    ageRange: "10–15 anos",
    classes: [
      "Amigo",
      "Companheiro",
      "Pesquisador",
      "Pioneiro",
      "Excursionista",
      "Guia",
    ],
  },
  {
    name: "Embaixadores",
    description:
      "Programa para jovens que desenvolve discipulado, liderança, mentoria, competências e compromisso com a missão.",
    philosophy:
      "Preparar jovens para uma vida de liderança espiritual, influência positiva e serviço.",
    ageRange: "16–21 anos",
    classes: ["Embaixador"],
  },
  {
    name: "Jovens Adultos",
    description:
      "Comunidade de discipulado e missão que acompanha os jovens na vida adulta, na vocação, na liderança e no serviço.",
    philosophy:
      "Integrar fé, vocação, comunidade e serviço ao longo da vida adulta.",
    ageRange: "22–30+ anos",
    classes: ["Líder Jovem"],
  },
  {
    name: "Ministério de Universitários (PCM)",
    description:
      "Ministério de discipulado e missão em campus universitários, envolvendo estudantes, docentes e a comunidade académica.",
    philosophy:
      "Ajudar a comunidade universitária a crescer em Cristo e a viver a fé e a missão no ambiente académico.",
    ageRange: "Estudantes universitários e comunidade académica",
    classes: [],
  },
];
