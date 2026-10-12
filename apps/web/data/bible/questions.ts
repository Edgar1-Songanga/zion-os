export type BibleChallengeQuestion = {
  id: number;
  level: 1 | 2 | 3;
  question: string;
  options: string[];
  answer: string;
  points: number;
  reference: string;
  explanation: string;
};

export const bibleQuestions: BibleChallengeQuestion[] = [
  { id: 1, level: 1, question: "Quem construiu a arca antes do dilúvio?", options: ["Noé", "Moisés", "Abraão", "David"], answer: "Noé", points: 10, reference: "Génesis 6:13–22", explanation: "Deus instruiu Noé a construir a arca para preservar a vida durante o dilúvio." },
  { id: 2, level: 1, question: "Quantos livros tem a Bíblia protestante?", options: ["66", "39", "27", "72"], answer: "66", points: 10, reference: "Índice bíblico", explanation: "A Bíblia protestante reúne 39 livros no Antigo Testamento e 27 no Novo Testamento." },
  { id: 3, level: 1, question: "Quem derrotou Golias?", options: ["David", "Saul", "Pedro", "Josué"], answer: "David", points: 10, reference: "1 Samuel 17:45–50", explanation: "David enfrentou Golias confiando no nome do Senhor." },
  { id: 4, level: 1, question: "Em que cidade nasceu Jesus?", options: ["Belém", "Nazaré", "Jerusalém", "Cafarnaum"], answer: "Belém", points: 10, reference: "Mateus 2:1", explanation: "Mateus identifica Belém da Judeia como o lugar do nascimento de Jesus." },
  { id: 5, level: 1, question: "Quem recebeu os Dez Mandamentos no monte Sinai?", options: ["Moisés", "Arão", "Josué", "Elias"], answer: "Moisés", points: 10, reference: "Êxodo 31:18", explanation: "Moisés recebeu as tábuas do testemunho no monte Sinai." },
  { id: 6, level: 1, question: "Qual foi o primeiro livro da Bíblia?", options: ["Génesis", "Êxodo", "Salmos", "Mateus"], answer: "Génesis", points: 10, reference: "Génesis 1:1", explanation: "Génesis começa com o relato da criação dos céus e da terra." },
  { id: 7, level: 2, question: "Qual é o primeiro fruto do Espírito mencionado em Gálatas 5?", options: ["Amor", "Paciência", "Domínio próprio", "Fé"], answer: "Amor", points: 20, reference: "Gálatas 5:22–23", explanation: "Paulo começa a lista do fruto do Espírito com o amor." },
  { id: 8, level: 2, question: "Durante quantos dias e noites choveu no relato do dilúvio?", options: ["40", "7", "12", "30"], answer: "40", points: 20, reference: "Génesis 7:12", explanation: "A chuva caiu sobre a terra durante quarenta dias e quarenta noites." },
  { id: 9, level: 2, question: "Quem interpretou os sonhos do faraó no Egito?", options: ["José", "Daniel", "Neemias", "Samuel"], answer: "José", points: 20, reference: "Génesis 41:14–32", explanation: "José explicou os sonhos do faraó e aconselhou preparação para os anos de fome." },
  { id: 10, level: 2, question: "Qual discípulo caminhou sobre a água em direção a Jesus?", options: ["Pedro", "João", "André", "Tomé"], answer: "Pedro", points: 20, reference: "Mateus 14:28–31", explanation: "Pedro saiu do barco, caminhou sobre a água e começou a afundar quando teve medo." },
  { id: 11, level: 2, question: "Qual profeta foi engolido por um grande peixe?", options: ["Jonas", "Amós", "Isaías", "Jeremias"], answer: "Jonas", points: 20, reference: "Jonas 1:17", explanation: "O Senhor preparou um grande peixe que engoliu Jonas." },
  { id: 12, level: 2, question: "Que pedido Salomão fez a Deus ao começar a reinar?", options: ["Sabedoria para governar", "Um exército maior", "Riqueza imediata", "Vida sem dificuldades"], answer: "Sabedoria para governar", points: 20, reference: "1 Reis 3:7–12", explanation: "Salomão pediu um coração compreensivo para governar o povo e discernir entre o bem e o mal." },
  { id: 13, level: 3, question: "Segundo Miqueias 6:8, o que o Senhor pede ao ser humano?", options: ["Praticar a justiça, amar a misericórdia e andar humildemente com Deus", "Construir um templo em cada cidade", "Nunca falar com estrangeiros", "Oferecer sacrifícios sem praticar a justiça"], answer: "Praticar a justiça, amar a misericórdia e andar humildemente com Deus", points: 30, reference: "Miqueias 6:8", explanation: "O texto resume a resposta ética e espiritual que Deus espera do seu povo." },
  { id: 14, level: 3, question: "Em João 15, como Jesus descreve a relação entre Ele e os discípulos?", options: ["A videira e os ramos", "O pastor e os soldados", "O rei e os juízes", "A luz e o templo"], answer: "A videira e os ramos", points: 30, reference: "João 15:1–5", explanation: "Jesus é a videira verdadeira; os discípulos são os ramos chamados a permanecer nele." },
  { id: 15, level: 3, question: "Qual capítulo descreve a armadura de Deus?", options: ["Efésios 6", "Romanos 8", "Hebreus 11", "Apocalipse 21"], answer: "Efésios 6", points: 30, reference: "Efésios 6:10–18", explanation: "Paulo descreve a armadura de Deus como imagem de firmeza espiritual." },
  { id: 16, level: 3, question: "De acordo com Atos 1:8, o que os discípulos receberiam ao vir sobre eles o Espírito Santo?", options: ["Poder para serem testemunhas", "Um reino político imediato", "Conhecimento de todas as línguas sem missão", "Isenção de sofrimento"], answer: "Poder para serem testemunhas", points: 30, reference: "Atos 1:8", explanation: "Jesus liga o poder do Espírito à missão de testemunhar até aos confins da terra." },
  { id: 17, level: 3, question: "Qual é o grande mandamento destacado por Jesus em Mateus 22?", options: ["Amar a Deus e ao próximo", "Nunca viajar", "Guardar silêncio em todas as situações", "Evitar toda a vida comunitária"], answer: "Amar a Deus e ao próximo", points: 30, reference: "Mateus 22:37–40", explanation: "Jesus resume a Lei e os Profetas no amor a Deus e ao próximo." },
  { id: 18, level: 3, question: "Segundo Hebreus 11:1, como é definida a fé?", options: ["A certeza do que se espera e a convicção do que não se vê", "A ausência de perguntas", "Uma garantia de riqueza", "Uma tradição sem confiança"], answer: "A certeza do que se espera e a convicção do que não se vê", points: 30, reference: "Hebreus 11:1", explanation: "Hebreus descreve a fé como confiança no que se espera e convicção do que ainda não se vê." },
];
