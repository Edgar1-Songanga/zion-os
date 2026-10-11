export interface YouthProgram {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  philosophy: string;
  features: string[];
  officialUrl: string;
}

export const YOUTH_PROGRAMS: YouthProgram[] = [
  {
    id: "adventurers",
    name: "Aventureiros",
    description: "Programa de crescimento espiritual e desenvolvimento infantil que envolve as famílias.",
    ageRange: "4–9 anos",
    philosophy: "Ajudar as crianças a conhecer Jesus, amar a família, descobrir o mundo e servir.",
    features: ["Classes e atividades", "Participação familiar", "Descoberta espiritual", "Natureza e aprendizagem"],
    officialUrl: "https://www.gcyouthministries.org/ministries/adventurers/",
  },
  {
    id: "pathfinders",
    name: "Desbravadores",
    description: "Programa de formação do caráter, liderança, competências práticas e serviço.",
    ageRange: "10–15 anos",
    philosophy: "Salvar do pecado e guiar no serviço.",
    features: ["Classes", "Especialidades", "Acampamentos", "Serviço comunitário", "Investiduras"],
    officialUrl: "https://www.gcyouthministries.org/ministries/pathfinders/",
  },
  {
    id: "ambassadors",
    name: "Embaixadores",
    description: "Programa de formação de jovens líderes comprometidos com Cristo e com a missão.",
    ageRange: "16–21 anos",
    philosophy: "Desenvolver discipulado, liderança e influência positiva.",
    features: ["Liderança", "Mentoria", "Discipulado", "Serviço", "Conquistas"],
    officialUrl: "https://www.gcyouthministries.org/ministries/ambassadors/",
  },
  {
    id: "young-adults",
    name: "Jovens Adultos",
    description: "Comunidade de discipulado e missão que acompanha os jovens na vida adulta.",
    ageRange: "22–30+ anos",
    philosophy: "Integrar fé, vocação, comunidade e serviço ao longo da vida adulta.",
    features: ["Discipulado", "Liderança", "Mentoria", "Missão", "Comunidade"],
    officialUrl: "https://www.gcyouthministries.org/",
  },
  {
    id: "public-campus-ministries",
    name: "Ministério de Universitários (PCM)",
    description: "Ministério de discipulado e missão nos campus universitários e na comunidade académica.",
    ageRange: "Estudantes universitários e comunidade académica",
    philosophy: "Ajudar jovens a permanecerem enraizados em Jesus e a envolverem colegas num relacionamento com Ele.",
    features: ["Grupos de campus", "Discipulado", "Liderança estudantil", "Apoio a professores", "Missão académica"],
    officialUrl: "https://ted.adventist.org/youth/public-campus-ministries/",
  },
];
