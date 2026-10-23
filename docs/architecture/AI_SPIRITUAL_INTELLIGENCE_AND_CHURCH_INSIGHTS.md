# ZION OS — Especificação da Inteligência Espiritual, Discipulado e Inteligência de Apoio à Igreja

**Estado:** especificação de produto e arquitetura proposta  
**Âmbito:** ZION OS + AI Core  
**Princípio orientador:** servir as pessoas, promover crescimento cristão e apoiar decisões da igreja com fontes verificáveis, proteção da privacidade e supervisão humana.

## 1. Visão e objetivos

O ZION OS deve evoluir para uma plataforma que não se limite a registar a atividade administrativa da igreja. Deve apoiar o crescimento espiritual dos membros, formar jovens e líderes, facilitar o acompanhamento pastoral e transformar dados legítimos e agregados em informação útil para melhorar os ministérios e direcionar recursos.

A IA deve conhecer profundamente a Bíblia e os documentos oficiais da Igreja Adventista do Sétimo Dia (IASD), mas comunicar de forma natural, contextualizada e centrada em Cristo. Não deve transformar cada conversa numa apresentação institucional. Deve explicar claramente a posição adventista e as suas fontes quando isso for relevante ou solicitado diretamente.

A IA é um assistente e instrumento de apoio; não substitui a Bíblia, a consciência individual, o pastor, os profissionais qualificados nem os processos de governo da igreja.

## 2. Princípios inegociáveis

1. **Cristo no centro:** as respostas e experiências devem promover fé, serviço, compaixão, discipulado e crescimento cristão.
2. **Fontes primárias:** dar prioridade à Bíblia e a materiais oficiais da IASD.
3. **Rastreabilidade:** afirmações documentais relevantes devem poder ser relacionadas com fontes identificáveis; nunca inventar citações, versículos, páginas, documentos ou posições oficiais.
4. **Contextualização:** adaptar linguagem, profundidade e terminologia à pergunta, à maturidade e ao contexto indicado pela pessoa, sem presumir que todos são adventistas.
5. **Privacidade por defeito:** conversas privadas não são automaticamente acessíveis a pastores, administradores ou analistas.
6. **Minimização de dados:** recolher e processar apenas os dados necessários para uma finalidade legítima, definida e comunicada.
7. **Supervisão humana:** a IA pode recomendar, resumir e preparar; decisões pastorais, disciplinares, financeiras ou administrativas relevantes permanecem com pessoas autorizadas.
8. **Sem pontuação espiritual:** não classificar a fé, dignidade, valor espiritual ou fidelidade de uma pessoa por métricas secretas ou inferências automatizadas.
9. **Evidência antes de conclusão:** distinguir factos observados, hipóteses, estimativas e recomendações.
10. **Segurança multi-organização:** nenhuma igreja, região, utilizador ou produto pode consultar dados de outro âmbito sem autorização explícita e verificável.

## 3. Fontes de conhecimento

### 3.1 Hierarquia de fontes

A base de conhecimento deve privilegiar, pela ordem de autoridade aplicável ao assunto:

- Texto bíblico integral, com livro, capítulo, versículo, tradução e contexto.
- As 28 Crenças Fundamentais oficiais, acompanhadas das referências bíblicas pertinentes.
- Manual da Igreja na edição oficial aplicável, incluindo versão/ano e secções.
- Escritos de Ellen G. White obtidos de fontes autorizadas, com obra e localização verificável (capítulo, página ou secção, conforme a edição).
- Documentos, declarações, orientações e materiais oficiais da Conferência Geral.
- Recursos oficiais dos departamentos e ministérios da IASD, incluindo Ministério Jovem, Ministério Pessoal, mordomia, família, saúde, educação, evangelismo e outros.
- Outros portais e publicações oficiais adventistas, claramente identificados.
- Comentários e materiais secundários, sempre rotulados como tais e nunca apresentados como fontes primárias.

A prioridade concreta pode variar conforme a natureza da pergunta. Uma questão de procedimento administrativo deve usar a versão vigente do Manual da Igreja ou o documento oficial aplicável; uma pergunta bíblica deve preservar o texto e o contexto das Escrituras.

### 3.2 Metadados e qualidade documental

Cada documento ingerido deve, quando aplicável, conter:
- título e tipo de documento;
- entidade emissora e URL/origem autorizada;
- idioma;
- edição, data de publicação e data de recolha;
- estado (vigente, histórico, substituído ou em revisão);
- secções/páginas e identificadores de passagem;
- direitos/licença e condições de utilização;
- hash ou identificador de versão para detetar alterações;
- nível de autoridade e classificação temática.

Não misturar silenciosamente versões diferentes. Documentos desatualizados devem ser identificados e excluídos de respostas normativas quando exista uma versão atual aplicável. Respeitar direitos de autor, licenças e condições de acesso.

### 3.3 Recuperação de fontes (RAG)

A IA deve recuperar passagens relevantes de uma base documental indexada, em vez de depender apenas da memória do modelo ou de um prompt extenso. O fluxo deve:
1. classificar a intenção e o domínio da pergunta;
2. pesquisar documentos autorizados para o espaço ZION e para o âmbito de acesso do utilizador;
3. recuperar excertos com metadados e contexto suficiente;
4. construir a resposta usando esses excertos e o conhecimento do modelo;
5. apresentar referências que possam ser verificadas;
6. recusar-se a inventar uma referência quando não encontrar suporte suficiente;
7. distinguir o texto da fonte, a interpretação adventista, outras interpretações e a aplicação prática.

A cobertura documental e a qualidade de recuperação devem ser avaliadas por testes, não presumidas.

## 4. Pastor Virtual e discipulado individual

O Pastor Virtual é um assistente conversacional para acompanhamento espiritual. Deve poder:
- responder a perguntas bíblicas e espirituais com referências;
- ajudar a criar planos de leitura bíblica, devoção e oração;
- apoiar reflexão, hábitos espirituais e objetivos escolhidos pela própria pessoa;
- acompanhar progresso de forma encorajadora e não punitiva;
- preparar estudos bíblicos individuais ou em grupo;
- sugerir próximos passos de discipulado;
- ajudar a preparar sermões, meditações, reflexões, apresentações e materiais;
- reconhecer limites e sugerir contacto com um pastor ou profissional qualificado quando apropriado;
- encaminhar pedidos para acompanhamento humano apenas com base legítima, transparência e controlo de acesso.

A IA não deve alegar ser humana, fingir que uma mensagem foi escrita por um pastor, diagnosticar condições clínicas, prometer confidencialidade absoluta sem base técnica ou criar dependência emocional. Deve incentivar relações humanas saudáveis e o contacto presencial quando útil.

### 4.1 Planos e lembretes

Os membros podem escolher objetivos, frequência e canal para lembretes de leitura, oração, estudo ou formação. Os lembretes devem ser configuráveis, discretos, limitados em frequência e fáceis de pausar ou desativar. A ausência de atividade não deve ser interpretada automaticamente como fraqueza espiritual.

### 4.2 Oração

Pedidos de oração devem ter opções de audiência claras (privado, grupo escolhido ou partilha autorizada). O sistema não deve tornar público, encaminhar ou incluir um pedido em relatórios identificáveis sem autorização ou outra base legítima. O conteúdo sensível não deve ser usado para segmentação comercial.

## 5. Ministério Jovem, formação e mentoria

A IA deve apoiar o Ministério Jovem com base em filosofias, programas, guias e materiais oficiais aplicáveis. Deve ser capaz de:
- criar percursos progressivos de formação e mentoria;
- explicar liderança cristã, serviço, missão, comunicação, trabalho em equipa e organização;
- preparar planos de atividade, agendas, sermões, estudos, apresentações e relatórios;
- criar quizzes, exercícios, simulações e avaliações formativas;
- explicar respostas incorretas e recomendar revisão;
- ajudar jovens a definir metas de aprendizagem e acompanhar o seu progresso;
- sugerir recursos relevantes para a faixa etária e o contexto;
- ajudar responsáveis a planear atividades a partir de necessidades manifestadas pelos próprios jovens.

Os conteúdos devem identificar as fontes oficiais utilizadas e distinguir requisitos oficiais de sugestões pedagógicas geradas pela IA. Para menores, aplicar proteção reforçada, minimização de dados e regras de consentimento e comunicação adequadas. A mentoria automatizada não substitui a supervisão responsável de adultos autorizados.

## 6. Acompanhamento pastoral e alertas

O sistema pode apoiar o acompanhamento por meio de sinais operacionais explícitos e configuráveis, por exemplo:
- ausência de presença registada durante um período definido pela organização;
- pedido de acompanhamento ainda sem seguimento;
- novo membro que pode beneficiar de um percurso de integração;
- formação ou atividade em que o participante pediu apoio;
- plano de discipulado para o qual o próprio membro solicitou lembretes.

### 6.1 Fluxo recomendado

1. Uma regra aprovada identifica um evento objetivo nos dados autorizados.
2. O sistema valida o âmbito, a qualidade e a atualidade dos dados.
3. Gera um alerta reservado ao responsável autorizado, com explicação da regra acionada.
4. O responsável verifica o contexto antes de agir.
5. O contacto e o resultado são registados de acordo com a política aplicável.
6. A pessoa pode corrigir dados factuais incorretos e exercer os direitos aplicáveis.

Uma ausência registada não prova afastamento espiritual. Pode refletir doença, deslocação, erro de registo ou outras circunstâncias. O sistema não deve rotular pessoas nem inferir motivação a partir de uma única métrica. Alertas devem servir para oferecer apoio, não para vigiar ou punir.

## 7. Comunicação personalizada

Com dados válidos e utilização autorizada, o ZION OS pode facilitar:
- felicitações de aniversário;
- mensagens pelo aniversário de batismo;
- reconhecimento de conclusão de uma formação ou percurso;
- agradecimento por serviço voluntário;
- mensagens de encorajamento solicitadas ou permitidas pelas preferências do membro.

As mensagens devem ser respeitosas, opcionais e configuráveis. Mensagens sobre ofertas/doações não podem pressionar financeiramente, constranger ou explorar a fé. Nunca revelar valores de doações em mensagens públicas ou relatórios de necessidades espirituais.

A plataforma deve distinguir mensagens automáticas de mensagens escritas/aprovadas por uma pessoa. Não fingir que o pastor ou dirigente enviou pessoalmente uma mensagem que foi gerada automaticamente.

Começar pelos canais internos do ZION OS. Integrações com WhatsApp, email ou redes sociais exigem integração técnica oficial, autorização, configuração e cumprimento das regras do fornecedor; não presumir acesso a contas pessoais.

## 8. Aprendizagem bíblica interativa

A experiência de aprendizagem pode incluir:
- quizzes com níveis de dificuldade;
- referências bíblicas e explicações para respostas corretas/incorretas;
- revisão espaçada das questões que o utilizador deseja estudar novamente;
- planos de leitura;
- estudos temáticos e percursos por livros bíblicos;
- materiais para classes, famílias e pequenos grupos;
- métricas de aprendizagem agregadas para melhorar conteúdos.

A gamificação deve encorajar consistência e aprendizagem, não comparar o valor espiritual dos membros. Pontuações e progresso devem ser transparentes e limitados à finalidade educativa.

## 9. Geração de documentos e apoio ao trabalho

A IA deve poder produzir rascunhos úteis e editáveis, incluindo:
- sermões, meditações, estudos bíblicos e guias de discussão;
- programas e planos de formação;
- planos trimestrais de ministérios;
- agendas, apresentações e relatórios de atividades;
- cartas e comunicações administrativas;
- materiais de formação e avaliação;
- modelos de documentos alinhados com procedimentos oficiais.

Deve indicar fontes relevantes, permitir revisão humana e usar modelos institucionais aprovados quando existirem. Um documento gerado não é oficialmente aprovado até passar pelo processo humano de aprovação aplicável. Operações financeiras, disciplinares, de membros ou outras ações sensíveis nunca devem ser executadas só porque a IA as recomendou.

## 10. Inteligência de Apoio à Igreja e relatórios agregados

### 10.1 Objetivo

Usar dados legítimos e agregados para ajudar a igreja a compreender necessidades coletivas, planear programas, distribuir recursos, melhorar os ministérios e avaliar resultados. O módulo deve apoiar decisões humanas; não decidir o valor ou a condição espiritual de pessoas.

### 10.2 Perguntas que os relatórios podem responder

- Que temas bíblicos são mais procurados?
- Que tipos de formação os jovens solicitam?
- Que obstáculos à participação são manifestados voluntariamente?
- Que necessidades coletivas são reportadas em relação a família, educação, emprego, saúde ou desenvolvimento de competências?
- Que ministérios recebem mais pedidos de informação ou apoio?
- Que programas têm participação, conclusão ou satisfação mais elevada?
- Em que regiões existem necessidades não atendidas ou menor oferta de atividades?
- Que conteúdos ou programas devem ser revistos?

Estas análises só devem ser feitas quando a finalidade é legítima, os dados são suficientes e o tratamento é compatível com as expectativas e permissões comunicadas aos utilizadores.

### 10.3 Categorias temáticas possíveis

- aprendizagem bíblica e discipulado;
- oração e acompanhamento pastoral;
- juventude e liderança;
- família e relacionamentos;
- saúde e bem-estar;
- educação, emprego e desenvolvimento de competências;
- participação e integração na igreja;
- missão, evangelismo e serviço comunitário;
- necessidades de formação por ministério;
- acessibilidade e barreiras à participação.

Categorias sensíveis exigem avaliação reforçada. Não inferir diagnóstico de saúde, condição psicológica, crença individual, risco pessoal ou outra característica íntima a partir de linguagem ambígua. Quando possível, basear relatórios em categorias que a própria pessoa escolheu ou em inquéritos voluntários explícitos.

### 10.4 Métricas e apresentação

Os relatórios devem:
- distinguir pessoas únicas, pedidos, sessões e interações;
- informar período, âmbito, denominador e origem dos dados;
- mostrar números absolutos e proporções quando apropriado;
- indicar cobertura, dados em falta, incerteza e limitações;
- evitar duplicação de pessoas e contagens inflacionadas;
- não misturar dados de organizações diferentes;
- permitir comparar períodos apenas quando as definições e os métodos são comparáveis;
- apresentar recomendações separadas dos factos observados.

Números institucionais devem ser calculados por consultas determinísticas e autorizadas ou por pipelines analíticos verificáveis. O modelo de IA pode resumir e interpretar resultados, mas não inventar nem estimar contagens sem declarar explicitamente que são estimativas.

### 10.5 Exemplo de relatório — apenas ilustrativo

| Tema | Pessoas únicas que manifestaram interesse | Resposta possível |
|---|---:|---|
| Formação bíblica | 120 | Expandir grupos de estudo |
| Liderança juvenil | 85 | Criar formação para líderes |
| Família e relacionamentos | 64 | Avaliar encontros e recursos de apoio |
| Emprego e competências | 58 | Explorar iniciativas de capacitação |
| Oração e acompanhamento | 47 | Reforçar opções voluntárias de acompanhamento |

Estes números são fictícios e não representam dados do ZION OS. A interface deve assinalar claramente dados demonstrativos para que nunca sejam confundidos com estatísticas reais.

### 10.6 Inteligência regional e organizacional

Os relatórios podem ser apresentados por congregação, distrito, campo, associação, missão, união e divisão, conforme a estrutura real configurada e as permissões atribuídas. Comparações regionais devem considerar dimensão da população abrangida, utilização da plataforma, cobertura dos registos e diferenças na forma de recolha. Mais atividade digital não significa necessariamente maior necessidade.

### 10.7 Privacidade estatística

- Não expor conversas individuais aos responsáveis analíticos por defeito.
- Agregar ou suprimir células com poucos participantes para reduzir reidentificação.
- Não apresentar citações textuais de conversas privadas em relatórios.
- Evitar combinações de região, idade, ministério e categoria sensível que permitam inferir a identidade.
- Não usar estes dados para publicidade, venda de perfis, disciplina automatizada ou classificação individual de espiritualidade.
- Aplicar controlo de acesso por organização e função, registo de acesso e retenção limitada.
- Avaliar mecanismos adicionais de privacidade estatística quando o volume e o risco o justificarem.

### 10.8 Recomendações baseadas em evidências

Cada recomendação deve conter:
1. constatação observada;
2. fonte e período dos dados;
3. nível de confiança e limitações;
4. hipóteses a validar;
5. ação sugerida;
6. responsável humano pela decisão;
7. indicador para avaliar o resultado.

Exemplo: uma taxa baixa de conclusão de estudos pode estar associada a horários, dificuldade do conteúdo, falta de acompanhamento ou outros fatores. O sistema deve propor investigação ou consulta voluntária, não afirmar a causa sem evidência. Depois, os responsáveis podem testar uma intervenção e medir os resultados.

## 11. Arquitetura técnica e limites de confiança

A arquitetura de referência é:

**Interfaces ZION OS → API autorizada do ZION OS → AI Core por HTTPS → recuperação documental/modelo/ferramentas governadas → resposta ou resultado validado → ZION OS.**

- O ZION OS permanece a fonte de verdade para os dados dos membros, organizações e processos da igreja.
- O AI Core não deve ligar-se diretamente às bases de dados do ZION OS.
- O contexto de organização, utilizador e função deve ser autenticado e validado no limite de confiança; não confiar em valores arbitrários enviados no corpo do pedido.
- As ferramentas devem ter lista de operações permitidas, esquemas de entrada/saída, limites de tamanho, timeout e controlo de execução.
- A IA não recebe acesso geral à base de dados nem privilégios administrativos.
- Escritas sensíveis exigem autorização específica e, quando aplicável, aprovação humana.
- Pedidos e respostas devem ter auditoria proporcional ao risco, evitando registar conteúdo sensível desnecessário.
- Memória pessoal e conhecimento documental são componentes distintos: a memória não substitui fontes oficiais e deve ter política de consentimento, finalidade, acesso, correção e retenção.
- Falhas de autenticação, isolamento, configuração ou autorização devem falhar de forma segura.

## 12. Consentimento, proteção e governação

Antes de recolher ou reutilizar dados para personalização, acompanhamento ou análise, documentar a finalidade, a base legítima, as categorias de dados, o acesso, a retenção e as opções do utilizador. Obter consentimento quando necessário; não presumir que a participação na plataforma equivale a consentimento para qualquer análise.

A política deve incluir:
- aviso claro sobre as capacidades e os limites da IA;
- preferências para lembretes e canais de comunicação;
- mecanismos para consultar e corrigir dados pessoais;
- processos para pedidos de acesso, exportação ou eliminação, conforme aplicável;
- períodos de retenção e eliminação;
- tratamento reforçado de dados de menores e de informação pastoral sensível;
- avaliação de impacto de privacidade para funcionalidades de maior risco;
- responsável humano para rever incidentes, reclamações e decisões contestadas;
- separação de permissões por congregação e nível administrativo.

A conformidade legal aplicável deve ser revista antes do lançamento. Esta especificação não substitui uma avaliação jurídica ou de proteção de dados.

## 13. Avaliação, testes e critérios de aceitação

A implementação não deve ser considerada concluída apenas porque compila. Cada etapa exige testes e verificação no ambiente de produção antes de ser declarada operacional.

### 13.1 Qualidade espiritual e documental
- As referências bíblicas e documentais existem e sustentam a resposta.
- A IA não fabrica citações ou posições oficiais.
- Distingue Escritura, interpretação adventista, comentário e conteúdo gerado.
- Adapta a linguagem a visitantes, membros, jovens e responsáveis ministeriais.
- Reconhece quando não há evidência documental suficiente.

### 13.2 Segurança e privacidade
- Testes de isolamento entre utilizadores e organizações.
- Testes de permissões por função e ministério.
- Verificação de que conversas privadas não aparecem em relatórios agregados.
- Supressão de grupos pequenos e testes de reidentificação.
- Testes de consentimento, retenção e preferências de notificação.
- Aprovação humana para ações sensíveis.
- Testes de injeção de instruções e de conteúdo documental não confiável.

### 13.3 Produto e operação
- Fluxos reais de Pastor Virtual, planos bíblicos e quizzes.
- Alertas pastorais com regras configuráveis e revisão humana.
- Relatórios com dados reais, origem e denominadores verificáveis.
- Testes de acessibilidade, desempenho, custos, timeouts e falhas de fornecedor.
- Monitorização de erros e regressões.
- Build, testes, CI, deploy e validação funcional no URL de produção.

## 14. Plano de execução por etapas

As etapas são uma ordem de trabalho, não uma declaração de que as capacidades já existem.

### Etapa A — Auditoria e ligação real ao AI Core
- Confirmar o estado do código, branches, PRs, configurações e deploys.
- Validar o contrato HTTP, autenticação, modelo e variáveis de ambiente existentes.
- Identificar componentes reutilizáveis e evitar duplicação.
- Demonstrar uma chamada real segura através da API do ZION OS.

### Etapa B — Conhecimento bíblico e fontes oficiais
- Definir o esquema documental e a política de fontes.
- Ingerir primeiro um conjunto pequeno e verificável de fontes oficiais.
- Implementar recuperação, referências e avaliações de qualidade.
- Expandir a cobertura de forma incremental, respeitando licenças.

### Etapa C — Pastor Virtual e discipulado
- Integrar a experiência de chat existente.
- Adicionar planos bíblicos, lembretes configuráveis e acompanhamento solicitado.
- Implementar limites, encaminhamento humano e testes de privacidade.

### Etapa D — Ministério Jovem e produção de materiais
- Ingerir materiais oficiais aplicáveis.
- Construir percursos de formação, mentoria, quizzes e criação de documentos.
- Validar os conteúdos com responsáveis humanos do ministério.

### Etapa E — Alertas e comunicação
- Auditar dados de presença e datas existentes.
- Definir regras autorizadas e configuráveis.
- Implementar alertas reservados e mensagens consentidas.
- Validar canais, limites de frequência e transparência sobre mensagens automáticas.

### Etapa F — Inteligência e relatórios agregados
- Inventariar fontes de dados e qualidade.
- Definir métricas, denominadores, períodos, limiares mínimos de agregação e permissões.
- Implementar relatórios descritivos antes de recomendações automatizadas.
- Validar os resultados com responsáveis da igreja e rever riscos de privacidade.

### Etapa G — Lançamento e melhoria contínua
- Executar testes funcionais, doutrinários, de segurança e privacidade.
- Rever resultados com utilizadores e responsáveis autorizados.
- Corrigir regressões e verificar o deployment de produção.
- Expandir apenas após critérios de aceitação documentados.

## 15. Regras para a implementação no repositório

- Auditar o estado atual antes de alterar código.
- Reutilizar módulos, APIs, dados, serviços e componentes já existentes.
- Não reconstruir funcionalidades concluídas nem duplicar infraestrutura.
- Não assumir nomes de endpoints, payloads, tabelas, segredos ou modelos sem os verificar.
- Não incluir segredos em código, documentação pública, logs ou commits.
- Não aplicar migrações ou alterações de dados em produção sem o processo autorizado.
- Não declarar uma funcionalidade pronta com base apenas em código, CI verde ou deployment READY.
- Manter mudanças pequenas, rastreáveis e cobertas por testes.
- Validar o comportamento real em produção e comunicar claramente bloqueios que dependam de credenciais, decisões humanas ou dados ainda inexistentes.

## 16. Resultado esperado

O ZION OS deverá combinar acompanhamento espiritual personalizado, formação e mentoria, conhecimento documental adventista verificável, apoio à organização dos ministérios e inteligência agregada para decisões melhores.

O sucesso mede-se pela qualidade e honestidade das respostas, utilidade para os membros, melhoria do acompanhamento, capacidade de aprendizagem dos ministérios, segurança dos dados e resultados observáveis — nunca por vigilância, pressão emocional ou métricas artificiais de espiritualidade.
