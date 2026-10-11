export type MinistryCatalogCategory = "Crianças e Família" | "Juventude" | "Discipulado e Missão" | "Serviço e Comunidade" | "Administração e Comunicação";

export interface MinistryCatalogEntry {
  id: string;
  name: string;
  category: MinistryCatalogCategory;
  summary: string;
  mission: string;
  focusAreas: string[];
  ageRange?: string;
  coverImage: string;
  officialUrl: string;
  sourceLabel: string;
  featured?: boolean;
}

/**
 * Starter directory based on the General Conference Church Manual and official
 * Adventist department/ministry pages. Local church structures vary by territory;
 * this catalogue is an editable starting point, not a claim that every entity is
 * a separately elected department in every congregation.
 *
 * Cover images are illustrative photography, not official logos or endorsements.
 * Replace them with authorized local/official images where available.
 */
export const ADVENTIST_MINISTRY_CATALOG: MinistryCatalogEntry[] = [
  {
    id: "youth-ministry",
    name: "Ministério Jovem Adventista",
    category: "Juventude",
    summary: "Forma uma geração ligada a Cristo, comprometida com o discipulado, a liderança e a missão.",
    mission: "Ajudar os jovens a desenvolver uma relação salvadora com Jesus e a viver o seu chamado ao discipulado e ao serviço.",
    focusAreas: ["Discipulado e vida espiritual", "Liderança jovem", "Evangelismo e missão", "Serviço comunitário", "Programas e clubes"],
    ageRange: "Programas por faixa etária",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://www.gcyouthministries.org/",
    sourceLabel: "Adventist Youth Ministries — Associação Geral",
    featured: true
  },
  {
    id: "childrens-ministries",
    name: "Ministério da Criança",
    category: "Crianças e Família",
    summary: "Ajuda as crianças a conhecerem a Bíblia, crescerem na fé e desenvolverem uma relação pessoal com Jesus.",
    mission: "Promover experiências espirituais seguras, relevantes e adequadas à idade, em parceria com as famílias e a igreja.",
    focusAreas: ["Discipulado infantil", "Recursos bíblicos por idade", "Formação de professores", "Parceria com famílias"],
    ageRange: "Infância",
    coverImage: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "family-ministries",
    name: "Ministério da Família",
    category: "Crianças e Família",
    summary: "Fortalece relacionamentos familiares saudáveis e apoia o crescimento espiritual no lar.",
    mission: "Equipar famílias e indivíduos para construírem relações centradas em Cristo e comunidades de cuidado.",
    focusAreas: ["Preparação para o casamento", "Enriquecimento conjugal", "Educação parental", "Relações intergeracionais"],
    coverImage: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "adventurer-club",
    name: "Clube de Aventureiros",
    category: "Juventude",
    summary: "Programa para crianças e famílias que promove descoberta, fé, aprendizagem e serviço.",
    mission: "Ajudar crianças a crescerem em sabedoria, estatura e graça através de experiências centradas em Jesus.",
    focusAreas: ["Classes e atividades", "Participação familiar", "Descoberta da natureza", "Desenvolvimento espiritual"],
    ageRange: "Aproximadamente 4–9 anos",
    coverImage: "https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://www.gcyouthministries.org/ministries/adventurers/",
    sourceLabel: "Adventist Youth Ministries — Aventureiros"
  },
  {
    id: "pathfinder-club",
    name: "Clube de Desbravadores",
    category: "Juventude",
    summary: "Desenvolve caráter, competências práticas, liderança, amizade e compromisso com o serviço.",
    mission: "Formar jovens para seguirem Jesus e servirem a igreja e a comunidade através de aprendizagem ativa.",
    focusAreas: ["Classes e especialidades", "Acampamentos e natureza", "Liderança", "Serviço comunitário", "Investiduras"],
    ageRange: "Aproximadamente 10–15 anos",
    coverImage: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://www.gcyouthministries.org/ministries/pathfinders/",
    sourceLabel: "Adventist Youth Ministries — Desbravadores"
  },
  {
    id: "ambassadors",
    name: "Ministério dos Embaixadores",
    category: "Juventude",
    summary: "Acompanha adolescentes mais velhos e jovens na formação de caráter, liderança e missão.",
    mission: "Apoiar jovens a tornarem-se discípulos de Cristo, líderes de influência positiva e agentes de serviço.",
    focusAreas: ["Discipulado", "Liderança", "Mentoria", "Projetos de serviço", "Formação e conquistas"],
    ageRange: "Aproximadamente 16–21 anos",
    coverImage: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://www.gcyouthministries.org/ministries/ambassadors/",
    sourceLabel: "Adventist Youth Ministries — Embaixadores"
  },
  {
    id: "young-adults",
    name: "Ministério de Jovens Adultos",
    category: "Juventude",
    summary: "Acompanha jovens adultos na fé, nos relacionamentos, na vocação e no serviço cristão.",
    mission: "Ajudar jovens adultos a crescerem em Cristo e a integrarem fé, vida profissional, família e missão.",
    focusAreas: ["Discipulado adulto", "Liderança e mentoria", "Missão", "Comunidade e pertença", "Desenvolvimento vocacional"],
    ageRange: "Aproximadamente 22–30+ anos",
    coverImage: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://www.gcyouthministries.org/",
    sourceLabel: "Adventist Youth Ministries — Jovens Adultos"
  },
  {
    id: "public-campus-ministries",
    name: "Ministério de Universitários (PCM)",
    category: "Juventude",
    summary: "Apoia estudantes e profissionais adventistas nos campus públicos e no ambiente académico.",
    mission: "Ajudar estudantes a permanecerem enraizados em Jesus e a criar relações de discipulado com colegas no campus.",
    focusAreas: ["Grupos de campus", "Discipulado entre estudantes", "Apoio a professores", "Liderança estudantil", "Missão no meio académico"],
    ageRange: "Estudantes universitários e comunidade académica",
    coverImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://ted.adventist.org/youth/public-campus-ministries/",
    sourceLabel: "Trans-European Division — Public Campus Ministries"
  },
  {
    id: "communication",
    name: "Ministério da Comunicação",
    category: "Administração e Comunicação",
    summary: "Comunica a missão, as iniciativas e as histórias da igreja com clareza, responsabilidade e relevância.",
    mission: "Facilitar uma comunicação fiel, acessível e coordenada entre a igreja, os membros, os meios de comunicação e a comunidade.",
    focusAreas: ["Comunicação institucional", "Fotografia e vídeo", "Relações públicas", "Canais digitais", "Histórias de missão"],
    coverImage: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "education",
    name: "Ministério da Educação",
    category: "Crianças e Família",
    summary: "Promove educação integral, desenvolvimento do caráter e aprendizagem ao longo da vida.",
    mission: "Apoiar a educação cristã e a cooperação entre igreja, famílias, escolas e instituições educativas.",
    focusAreas: ["Educação cristã", "Família e escola", "Formação", "Apoio a estudantes", "Desenvolvimento integral"],
    coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "health-ministries",
    name: "Ministério da Saúde",
    category: "Serviço e Comunidade",
    summary: "Incentiva hábitos saudáveis e iniciativas de bem-estar físico, mental, social e espiritual.",
    mission: "Servir a comunidade através da promoção de saúde integral, educação preventiva e estilo de vida saudável.",
    focusAreas: ["Educação para a saúde", "Prevenção", "Bem-estar", "Temperança", "Ações comunitárias"],
    coverImage: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "womens-ministries",
    name: "Ministério da Mulher",
    category: "Crianças e Família",
    summary: "Apoia mulheres no crescimento espiritual, liderança, serviço e desenvolvimento de todo o seu potencial.",
    mission: "Encorajar, equipar e mobilizar mulheres como discípulas e líderes que servem a igreja e a sociedade.",
    focusAreas: ["Discipulado", "Liderança", "Mentoria", "Desenvolvimento pessoal", "Prevenção da violência"],
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://women.adventist.org/",
    sourceLabel: "Adventist Women's Ministries"
  },
  {
    id: "adventist-men",
    name: "Ministério dos Homens Adventistas",
    category: "Crianças e Família",
    summary: "Encoraja homens a crescerem espiritualmente, servirem as famílias e participarem ativamente na missão.",
    mission: "Equipar homens para uma vida de fé, responsabilidade, discipulado e serviço cristão.",
    focusAreas: ["Discipulado", "Família", "Mentoria", "Serviço comunitário", "Missão"],
    coverImage: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Homens Adventistas"
  },
  {
    id: "sabbath-school-personal-ministries",
    name: "Escola Sabatina e Ministério Pessoal",
    category: "Discipulado e Missão",
    summary: "Promove estudo bíblico, comunhão, crescimento espiritual e participação missionária.",
    mission: "Formar discípulos através do estudo das Escrituras, do relacionamento cristão, do serviço e da missão.",
    focusAreas: ["Classes da Escola Sabatina", "Estudo bíblico", "Pequenos grupos", "Evangelismo pessoal", "Acompanhamento"],
    coverImage: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Escola Sabatina e Ministério Pessoal"
  },
  {
    id: "stewardship",
    name: "Ministério de Mordomia Cristã",
    category: "Discipulado e Missão",
    summary: "Ensina a administração fiel e generosa do tempo, dons, recursos e responsabilidades confiadas por Deus.",
    mission: "Cultivar uma vida de fidelidade, gratidão, generosidade e responsabilidade cristã.",
    focusAreas: ["Dons espirituais", "Gestão de recursos", "Generosidade", "Tempo e talentos", "Educação financeira cristã"],
    coverImage: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://stewardship.adventist.org/",
    sourceLabel: "Adventist Stewardship Ministries"
  },
  {
    id: "publishing-ministries",
    name: "Ministério de Publicações",
    category: "Discipulado e Missão",
    summary: "Partilha literatura e recursos cristãos para apoiar o estudo bíblico, o discipulado e a evangelização.",
    mission: "Levar mensagens de esperança através de publicações e de pessoas preparadas para partilhar literatura.",
    focusAreas: ["Literatura missionária", "Colportagem", "Distribuição de recursos", "Formação", "Evangelismo"],
    coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Ministério de Publicações"
  },
  {
    id: "adventist-possibility-ministries",
    name: "Ministério Adventista das Possibilidades",
    category: "Serviço e Comunidade",
    summary: "Promove inclusão, dignidade, participação e apoio a pessoas e famílias com necessidades específicas.",
    mission: "Criar uma igreja acessível e acolhedora onde cada pessoa é valorizada, incluída e capacitada para servir.",
    focusAreas: ["Acessibilidade", "Inclusão", "Apoio a cuidadores", "Surdez e deficiência", "Participação plena"],
    coverImage: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Adventist Possibility Ministries"
  },
  {
    id: "public-affairs-religious-liberty",
    name: "Assuntos Públicos e Liberdade Religiosa",
    category: "Serviço e Comunidade",
    summary: "Acompanha questões de liberdade de consciência, liberdade religiosa e relações com a sociedade.",
    mission: "Promover a liberdade religiosa, a consciência e o respeito pelos direitos fundamentais de todas as pessoas.",
    focusAreas: ["Liberdade de consciência", "Diálogo institucional", "Educação pública", "Acompanhamento de questões cívicas"],
    coverImage: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Public Affairs and Religious Liberty"
  },
  {
    id: "chaplaincy-ministries",
    name: "Ministérios de Capelania Adventista",
    category: "Serviço e Comunidade",
    summary: "Apoia o serviço pastoral em ambientes como saúde, educação, comunidade, trabalho e instituições.",
    mission: "Oferecer cuidado espiritual e presença pastoral a pessoas em contextos institucionais e comunitários.",
    focusAreas: ["Capelania hospitalar", "Capelania educativa", "Apoio comunitário", "Formação profissional", "Cuidado espiritual"],
    coverImage: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Adventist Chaplaincy Ministries"
  },
  {
    id: "ministerial-association",
    name: "Associação Ministerial",
    category: "Discipulado e Missão",
    summary: "Apoia pastores e líderes no desenvolvimento ministerial, na formação e no cuidado da igreja.",
    mission: "Fortalecer o ministério pastoral e apoiar líderes na missão, no cuidado e na formação espiritual.",
    focusAreas: ["Formação pastoral", "Desenvolvimento de liderança", "Recursos ministeriais", "Cuidado e mentoria"],
    coverImage: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "evangelism",
    name: "Evangelismo e Missão",
    category: "Discipulado e Missão",
    summary: "Coordena iniciativas para partilhar o evangelho e criar oportunidades de discipulado na comunidade.",
    mission: "Convidar pessoas a conhecer Jesus através de testemunho, serviço, estudo bíblico e iniciativas missionárias.",
    focusAreas: ["Evangelismo público", "Estudos bíblicos", "Missão local", "Plantação de igrejas", "Acompanhamento de interessados"],
    coverImage: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/about-us/departments-services/",
    sourceLabel: "Associação Geral — Departamentos e Serviços"
  },
  {
    id: "spirit-of-prophecy",
    name: "Ministério do Espírito de Profecia",
    category: "Discipulado e Missão",
    summary: "Promove o estudo responsável dos escritos de Ellen G. White e a sua relação com a Bíblia e a missão.",
    mission: "Apoiar o estudo, a compreensão e a aplicação dos recursos do Espírito de Profecia na vida espiritual.",
    focusAreas: ["Estudo e leitura", "Recursos de referência", "Formação", "Aplicação espiritual"],
    coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Spirit of Prophecy Writings"
  },
  {
    id: "music-ministry",
    name: "Ministério da Música",
    category: "Discipulado e Missão",
    summary: "Apoia a música congregacional e o uso dos dons musicais na adoração e na missão.",
    mission: "Incentivar música que sirva à adoração, fortaleça a fé e contribua para a participação reverente da congregação.",
    focusAreas: ["Música congregacional", "Coros e grupos", "Formação musical", "Planeamento litúrgico"],
    coverImage: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Manual da Igreja — Música"
  },
  {
    id: "prayer-ministry",
    name: "Ministério de Oração",
    category: "Discipulado e Missão",
    summary: "Organiza oportunidades de oração, intercessão e apoio espiritual para membros e comunidade.",
    mission: "Cultivar uma vida de oração pessoal e comunitária, com cuidado pastoral e respeito pela confidencialidade.",
    focusAreas: ["Grupos de oração", "Intercessão", "Pedidos de oração", "Acompanhamento espiritual"],
    coverImage: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85",
    officialUrl: "https://gc.adventist.org/church-manual/",
    sourceLabel: "Área local configurável — verificar organização territorial"
  }
];

export const YOUTH_PROGRAM_IDS = [
  "adventurer-club",
  "pathfinder-club",
  "ambassadors",
  "young-adults",
  "public-campus-ministries"
] as const;

export function getMinistryCatalogEntry(idOrDepartment?: string | null) {
  if (!idOrDepartment) return undefined;
  return ADVENTIST_MINISTRY_CATALOG.find(
    (entry) => entry.id === idOrDepartment || entry.name === idOrDepartment
  );
}
