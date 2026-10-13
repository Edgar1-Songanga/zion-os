# ZION OS — internacionalização e tradução

## Comportamento do locale

- `zion.locale` guarda a escolha local do utilizador; um locale inválido é ignorado.
- `document.documentElement.lang` e `dir` são atualizados na mudança (árabe usa RTL).
- O seletor recebe catálogos offline versionados para todas as mensagens atualmente declaradas em `sourceStrings`. Essa parte muda imediatamente e não depende de sessão, rede, API ou modelo.
- A CI valida que cada locale do seletor tem exatamente todas as mensagens fonte; uma nova mensagem exige atualização de todos os catálogos.
- Apenas mensagens que usam `t()` ou `LocalizedText` participam do provider. Texto literal em páginas/componentes ainda não internacionalizados permanece na língua de origem e deve ser migrado gradualmente para chaves de mensagem; os catálogos não traduzem DOM arbitrário.

## Tradução de conteúdo dinâmico

Texto que vem de conteúdos, lições ou dados de API usa `translateText`/`LocalizedText` e é uma capacidade distinta dos rótulos offline. Requer utilizador autenticado, `NEXT_PUBLIC_ZION_API_URL` no frontend e, no projeto Vercel da API, `AI_GATEWAY_API_KEY` e `TRANSLATION_MODEL` (opcionalmente `AI_GATEWAY_ENDPOINT`). Se estas dependências não responderem, o texto original é mantido e a interface assinala que conteúdo dinâmico não foi traduzido; erros não são tratados como sucesso.

## Eficiência e validação

O endpoint batch usa uma única conclusão estruturada para até 50 itens, verifica IDs e rejeita respostas incompletas/duplicadas. Não deve ser invocado uma vez por rótulo em cada carregamento: as mensagens estáticas são resolvidas localmente. As chaves de acesso ao modelo permanecem exclusivamente no backend e nunca devem ser adicionadas ao frontend.

## Qualidade linguística

Os recursos gerados automaticamente são uma camada inicial de interface, não uma certificação de localização. Uma revisão por falantes nativos é necessária antes de promover as variantes africanas de menor disponibilidade de dados e textos de elevada sensibilidade espiritual/jurídica. Não usar a tradução automática para alterar o texto canónico de Escrituras ou doutrina.
