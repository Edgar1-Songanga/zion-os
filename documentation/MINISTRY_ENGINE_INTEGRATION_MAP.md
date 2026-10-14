# Mapa de integração entre ministérios e engines do ZION OS

## Objectivo

Definir que módulos os ministérios podem consumir, distinguir navegação de integração real de dados e impedir que sejam criados motores duplicados. Este documento é um mapa de auditoria e implementação, não uma declaração de que todas as integrações estão concluídas.

## Regras de arquitectura

1. Cada engine tem um domínio de responsabilidade; os ministérios consomem as suas capacidades através de interfaces/API autorizadas.
2. Ligar uma página a outra não significa que exista sincronização de dados entre elas.
3. Não duplicar autenticação, identidade, permissões, notificações, conteúdos bíblicos, pagamentos, ficheiros ou relatórios quando já existe um serviço central.
4. Dados e métricas devem vir de registos reais. Sem dados suficientes, mostrar “sem dados” em vez de estimativas fictícias.
5. Respeitar organização, papel, permissões, privacidade, consentimento e trilho de auditoria.
6. Não alterar a base de dados fora do fluxo de gestão definido para o projecto.
7. Validar cada integração com build, testes e teste funcional autenticado antes de a marcar como concluída.

## Mapa inicial de dependências

| Ministério/área | Engine ou módulo relacionado | Uso esperado | Estado verificado nesta auditoria |
| --- | --- | --- | --- |
| Escola Sabatina e Ministério Pessoal | Bible Engine | Pesquisa de passagens, referências e apoio ao estudo bíblico | A interface Bible Engine existe. A página Escola Sabatina consome os endpoints `/v1/spiritual/sabbath-school` e `/v1/spiritual/bible/search`. Ainda não foi provado que os registos/relatórios do Ministério Pessoal sejam partilhados com essas páginas. |
| Evangelismo e Missão | Bible Engine; Escola Sabatina; RESA | Referências bíblicas, estudos, acompanhamento missionário e conteúdo espiritual | Ferramentas existentes; fluxo de dados entre actividade missionária, pessoas acompanhadas e lições ainda por validar. |
| Ministério do Espírito de Profecia | Bible Engine; biblioteca/recursos | Usar as Escrituras como referência e ligar recursos identificados | Navegação relacionada possível; integração com catálogo de recursos ainda por auditar. |
| Ministério de Oração | RESA Prayer; Bible Engine | Registo/acompanhamento de pedidos de oração e referências bíblicas | Páginas existem; partilha de indicadores e relatórios ministeriais ainda por validar. |
| Juventude e clubes | Youth/Clubs; Events; Notifications; Identity/Organizations | Participantes, dirigentes, actividades, presença, eventos e avisos | Componentes existem; completude dos fluxos e relatórios deve ser verificada individualmente. |
| Comunicação e Publicações | RESA Content/Media; Notifications | Conteúdos aprovados, recursos e distribuição autorizada | Integração end-to-end e permissões ainda por auditar. |
| Serviços Comunitários; Saúde; Família; Mulher; Criança | Events; Identity/Organizations; Media; Reports | Programas, participação, actividades, recursos e prestação de contas | Dependências candidatas; confirmar endpoints, políticas de acesso e modelos de dados antes de implementar. |
| Mordomia Cristã | Reports; Finance/Treasury (com fronteiras de acesso) | Formação e relatórios de iniciativas de mordomia; dados financeiros apenas quando autorizados | Não misturar relatórios de formação com registos contabilísticos. Integração financeira ainda por auditar. |
| Tesouraria/Finanças | Finance/Ledger; Reports; Audit | Lançamentos, reconciliação, aprovação e mapas financeiros | Requer auditoria própria; não inferir que está pronta por existir uma página ou endpoint. |
| Secretaria | Organizations/Church Member Registry; Reports; Audit | Registo de membros, baptismos, transferências e mapas estatísticos | Base funcional presente parcialmente; transferências, foto, relatórios oficiais e migrações pendentes exigem validação. |
| Administração | Identity/Organizations; Reports; Audit | Visão consolidada e autorização hierárquica de relatórios | A navegação central foi consolidada; fluxo completo de submissão/aprovação de relatórios ainda por implementar/auditar. |

## Bible Engine e Ministério Pessoal: contrato desejado

O Bible Engine deve ser a capacidade partilhada para pesquisa e referência bíblica, não um segundo registo de actividade ministerial. O Ministério Pessoal mantém os seus próprios registos de programas, estudos acompanhados, responsáveis, datas, estado e relatórios; quando necessário, esses registos referenciam passagens, lições ou recursos do Bible Engine/Escola Sabatina por identificadores/URLs estáveis.

A integração completa exige:
- referenciar conteúdo bíblico ou lições sem copiar desnecessariamente o conteúdo;
- guardar no registo ministerial as referências/recursos usados, responsáveis e estado de acompanhamento;
- aplicar permissões à informação de participantes e interessados;
- medir actividade a partir de eventos/registos reais;
- incluir os resultados agregados autorizados no relatório do ministério;
- garantir que alterações no catálogo bíblico não apagam o histórico de actividade;
- testar erros, ausência de dados, duplicação e isolamento entre organizações.

A navegação para `/bible-engine`, `/sabbath-school`, `/devotion` e `/resa/prayer` é apenas acesso às ferramentas. Não é, por si só, integração de dados nem prova de que o processo ministerial está concluído.

## Modelo de relatórios comum (proposta a validar)

O serviço de relatórios deve apoiar metadados partilhados: organização, departamento, período, autor, estado, datas de submissão/decisão, versão, fonte dos indicadores e histórico. Cada ministério define campos e regras próprias com base nos documentos oficiais aplicáveis à sua região.

Estados candidatos: rascunho → submetido → em análise → aprovado ou devolvido para correcção. A transição de estado deve ser autorizada no backend e auditada. Não apresentar estes estados como activos até confirmar endpoints, permissões e persistência.

## Sequência de implementação

1. Fechar o build e a revisão da interface de ferramentas relacionadas.
2. Auditar contratos e endpoints do Bible Engine, Escola Sabatina, RESA Prayer e programas ministeriais.
3. Definir a ligação entre registos de estudo/actividade e referências bíblicas sem duplicar conteúdos.
4. Implementar relatórios da Secretaria e validar transferências.
5. Construir o núcleo comum de relatórios com permissões, submissão, revisão e histórico.
6. Implementar e validar cada departamento em entregas separadas, começando por Ministério Pessoal/Escola Sabatina e Mordomia/Tesouraria.
7. Validar com CI verde e testes end-to-end autenticados antes de publicar.

## Fontes e limites institucionais

O catálogo ministerial do repositório aponta para páginas oficiais da Igreja Adventista e para o Manual da Igreja. Antes de codificar um formulário como “obrigatório”, confirmar a edição vigente do Manual e as instruções oficiais da Associação/Conferência, União e Divisão aplicáveis. Formulários locais podem diferir; a plataforma deve permitir configuração sem atribuir à Associação Geral requisitos que não publicou.
