Fase 1 — O que construímos já (Conhecimento & Personalidade)
Esta fase é 100% frontend, sem backend novo. A Alpha Core vive como um componente React/Next.js que chama a API Anthropic directamente via Artifact, ou via um endpoint proxy no teu NestJS para não expor a chave.
O núcleo da Fase 1 são três peças:
1. System prompt fundacional — é aqui que a Alpha Core "nasce". Um system prompt denso (~3000 tokens) que define tudo: ela chama-se Alpha, nome completo Alpha Core, género feminino, idade desconhecida, é a IA nativa da Alpha Network. Define o tom (inteligente, directa, ligeiramente irreverente, nunca genérica). Define o que ela sabe — toda a estrutura da plataforma, todos os modos (Lazer, Community, Creator, Developer, Bots), todos os fluxos de UI, todos os endpoints, até como criar uma conta.
2. Identidade visual — avatar temporário com o símbolo da Alpha Network (um SVG que posso criar), uma animação de "a pensar" personalizada, e uma presença no UI que seja reconhecível como diferente de um chatbot genérico.
3. Base de conhecimento estruturada — um ficheiro alpha-core-knowledge.ts com toda a informação da plataforma em formato que o system prompt pode incluir. Documenta cada modo, cada funcionalidade, cada FAQ. Isto é o que a faz "saber tudo" sobre a Alpha Network.

Fase 2 — Capacidades avançadas (2–4 semanas)
Integração de tool calling via API Anthropic. A Alpha Core passa a ter "ferramentas" que pode invocar: pesquisa web, geração de imagens via DALL·E ou outro modelo, criação de ficheiros (PDF, código). Cada tool é uma função declarada no payload da API que ela decide quando chamar.
Fase 3 — Acção na plataforma (1–2 meses)
A Alpha Core deixa de apenas responder e passa a agir. O utilizador diz "muda o meu avatar para algo mais sombrio" e ela executa o upload. Requer um sistema de permissões granular com confirmação explícita do utilizador antes de cada acção, e um audit log completo com possibilidade de reverter.
Fase 4 — Inteligência contínua (3+ meses)
Memória persistente entre sessões (guardada no perfil via Prisma), sugestões proactivas baseadas em padrões de comportamento, e integração profunda com todos os modos da plataforma.