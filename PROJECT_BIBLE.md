```markdown
# Alpha Network - Bíblia do Projeto / Especificação Completa v1.0

**Versão:** 1.0 (2026)  
**Empresa:** Alpha Company  
**Duração da Fase Atual:** 2 semanas por módulo (equipa de 6 developers)  
**Objetivo deste documento:** Ser a **ÚNICA fonte de verdade** para todo o desenvolvimento.  

Este Markdown foi criado **exclusivamente** a partir dos documentos oficiais fornecidos (`v2-guia-bruno-fearless.docx`, `v2-guia-alexandre-landa.docx`, `v2-guia-obed-jorge.docx`, `v2-guia-luis-goncalves.docx`, `v2-guia-adolfo-figueiredo.pdf`, `v2-guia-pedro-evaristo.docx` e `alpha-network-roadmap.pdf`).

**Instruções obrigatórias para qualquer Agente IA (Cursor, Claude, etc.):**

- **NUNCA** refatore, renomeie pastas/ficheiros, altere padrões de nomenclatura, mude a estrutura de módulos ou "melhore" a arquitetura por iniciativa própria.
- Sempre que o Cursor sugerir uma refatoração, **pare e consulte este documento primeiro**. Qualquer alteração deve ser aprovada explicitamente num novo versionamento deste ficheiro.
- Siga **exactamente** os caminhos de ficheiros, nomes de modelos Prisma, nomes de rotas, nomes de eventos WebSocket, schemas e planos dia-a-dia descritos abaixo.
- Use os snippets de código presentes nos guias como templates literais (copie-colar e adapte apenas os dados específicos).
- Mantenha a separação rigorosa por modo (`modes/community`, `modes/bots`, `modes/creator`, `modes/developer`, `modes/lazer`, etc.). Cada modo é independente.
- Qualquer novo ficheiro ou funcionalidade deve seguir o padrão exacto dos guias (ex.: pastas `apps/api/src/modes/XXX/`, `apps/web/src/components/features/XXX/`).
- Se houver conflito entre este documento e qualquer outra coisa (documentação gerada pelo Cursor, código existente, etc.), este Markdown prevalece.

---

## 1. Visão Geral do Produto (do Roadmap Técnico Geral)

A **Alpha Network** é uma plataforma de rede social **adaptativa** que muda de forma, funcionalidades e layout conforme o propósito definido pelo próprio utilizador.  
- Um único perfil.  
- Um único login.  
- **5 Modos** que o utilizador ativa/desativa livremente.

### Os 5 Modos (v1.0)

| Modo            | Inspiração Principal              | Funcionalidades-chave v1.0                                      | Responsável       |
|-----------------|-----------------------------------|-----------------------------------------------------------------|-------------------|
| **Lazer**       | Facebook · Instagram              | Feed, posts, reações, comentários                              | Obed Jorge        |
| **Criador**     | LinkedIn · Medium · Behance       | Artigos (Markdown), rascunhos, portfólio, perfil público       | Pedro Evaristo    |
| **Desenvolvedor**| GitHub · Notion · Figma          | Projectos, ficheiros, tarefas, chat em tempo real              | Alexandre Landa   |
| **Comunidade**  | Discord · Telegram                | Servidores, canais, chat em tempo real, cargos                 | Bruno Fearless    |
| **Bot**         | Discord API · Zapier              | Bots com comandos, integração em servidores                     | Bruno Fearless    |

**Integração com Alpha AI:** As Sombras do Alpha AI serão assistentes contextuais nativos em cada modo (co-criadora no Criador, moderadora na Comunidade, assistente no Desenvolvedor). O back-end já deve estar preparado para chamadas assíncronas à API do Alpha AI.

**Arquitetura Geral (obrigatória):**
- Monorepo com `apps/api` (NestJS) + `apps/web` (Next.js App Router).
- API Gateway + JWT Auth (Adolfo Figueiredo).
- WebSocket com Socket.io (namespace por modo).
- Base de dados: PostgreSQL + Prisma (tabelas com prefixo do modo: `community_`, `creator_`, `dev_`, `lazer_`, `follows`, etc.).
- Frontend: Tailwind + Design System do Luís Gonçalves (obrigatório usar os componentes `ui/`).

---

## 2. Estrutura do Monorepo (obrigatória – não alterar)

```
apps/
├── api/
│   ├── src/
│   │   ├── modes/
│   │   │   ├── community/          ← Bruno Fearless
│   │   │   ├── bots/               ← Bruno Fearless
│   │   │   ├── creator/            ← Pedro Evaristo
│   │   │   ├── developer/          ← Alexandre Landa
│   │   │   └── lazer/              ← Obed Jorge
│   │   ├── users/                  ← Adolfo Figueiredo (perfil + follow)
│   │   ├── auth/                   ← Adolfo Figueiredo (já existe)
│   │   ├── prisma/schema.prisma    ← Schema consolidado
│   │   └── app.module.ts           ← Registar TODOS os módulos
│   └── prisma/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             ← Luís + Adolfo
│   │   │   ├── (main)/
│   │   │   │   ├── community/      ← Bruno
│   │   │   │   ├── creator/        ← Pedro
│   │   │   │   ├── developer/      ← Alexandre
│   │   │   │   ├── lazer/          ← Obed
│   │   │   │   ├── profile/        ← Adolfo
│   │   │   │   ├── settings/       ← Adolfo
│   │   │   │   └── page.tsx        ← Home + Mode Picker (Luís)
│   │   ├── components/
│   │   │   ├── ui/                 ← Luís (Button, Input, etc.)
│   │   │   ├── features/
│   │   │   │   ├── community/
│   │   │   │   ├── creator/
│   │   │   │   ├── developer/
│   │   │   │   ├── lazer/
│   │   │   │   └── profile/
│   │   │   └── layout/             ← Navbar + Sidebar (Luís)
│   ├── tailwind.config.ts
│   └── globals.css
```

---

## 3. Schema Prisma Consolidado (apps/api/prisma/schema.prisma)

```prisma
// ── Modelos do Adolfo (perfil + follow) ──
model User { ... }           // já existe (auth)
model Profile { ... }        // já existe

model Follow {
  id          String   @id @default(uuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@map("follows")
}

// ── Modo Comunidade + Bots (Bruno Fearless) ──
model Server { ... }         // community_servers
model Channel { ... }
model Message { ... }
model ServerMember { ... }

model Bot { ... }            // bots
model BotCommand { ... }
model ServerBot { ... }

// ── Modo Criador (Pedro Evaristo) ──
model CreatorArticle {
  id          String    @id @default(uuid())
  authorId    String    // UUID do utilizador — sem FK explícita
  title       String
  content     String    // Conteúdo em Markdown
  slug        String    @unique
  published   Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@map("creator_articles")
}

model CreatorPortfolioItem {
  id          String   @id @default(uuid())
  authorId    String
  title       String
  description String?
  link        String?
  imageUrl    String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("creator_portfolio_items")
}

// ── Modo Desenvolvedor (Alexandre Landa) ──
model DevProject { ... }     // dev_projects
model DevMember { ... }
model DevFile { ... }
model DevTask { ... }
model DevMessage { ... }

// ── Modo Lazer (Obed Jorge) ──
model LazerPost { ... }      // lazer_posts
model LazerReaction { ... }
model LazerComment { ... }

// Relations já definidas nos guias individuais (onDelete: Cascade, etc.)
```

**Comandos obrigatórios após qualquer alteração no schema:**
```bash
npx prisma migrate dev --name NOME_DA_MIGRATION
npx prisma generate
npx prisma studio
```

---

## 4. Design System (Luís Gonçalves) – Obrigatório para todo o frontend

- **Tailwind config** e cores exatas (gold, alpha, text, etc.) – ver guia do Luís.
- Componentes em `apps/web/src/components/ui/`:
  - `Button`, `Input`, `Card`, `Modal`, `Avatar`, `Badge`, `Spinner`.
- Exportados em `index.ts`.
- Navbar + Sidebar adaptativa em `components/layout/`.
- Mode Picker na home (`/page.tsx`).
- **Regra:** Todos os outros developers **devem** importar destes componentes. Nunca criar duplicados.

---

## 5. Guias Individuais (resumo + detalhes críticos)

### 5.1 Adolfo Figueiredo – Perfil de Utilizador + Seguimento Social
*(detalhes mantidos do documento anterior – ver versão anterior para tabela completa de endpoints)*

### 5.2 Bruno Fearless – Modo Comunidade + Modo Bot
*(detalhes mantidos do documento anterior)*

### 5.3 Alexandre Landa – Modo Desenvolvedor
*(detalhes mantidos do documento anterior)*

### 5.4 Obed Jorge – Modo Lazer
*(detalhes mantidos do documento anterior)*

### 5.5 Pedro Evaristo – Modo Criador
- **Totalmente independente**: tabelas com prefixo `creator_`, sem chamadas cruzadas com outros módulos (pode coordenar interface com Obed, mas lógica separada).
- **Funcionalidades v1**:
  - Artigos em Markdown (rascunhos + publicados).
  - Slug automático e único a partir do título.
  - Portfólio (itens com título, descrição, link, imagem).
  - Perfil público (`/creator/:username`) – acessível sem autenticação.
- **Endpoints exatos**:
  - `GET /api/v1/creator/articles`
  - `POST /api/v1/creator/articles`
  - `GET /api/v1/creator/articles/:slug` (público)
  - `PATCH /api/v1/creator/articles/:id`
  - `DELETE /api/v1/creator/articles/:id` (soft delete)
  - `GET /api/v1/creator/:username` (perfil público)
  - `GET /api/v1/creator/portfolio`
  - `POST /api/v1/creator/portfolio`
  - `DELETE /api/v1/creator/portfolio/:id`
- **Regras críticas**:
  - Slug gerado com `generateSlug()` + `ensureUniqueSlug()` (ver snippet exacto no guia).
  - Ao publicar pela primeira vez: preencher `publishedAt`.
  - Rascunhos **nunca** aparecem no perfil público.
  - Soft delete apenas em artigos (portfólio é hard delete).
- **Frontend**:
  - Dashboard: `/creator/page.tsx` (separar Publicados / Rascunhos).
  - Editor: `/creator/articles/new/page.tsx` + preview com `react-markdown`.
  - Perfil público: `/creator/[username]/page.tsx`.
  - Componentes: `ArticleCard`, `ArticleEditor`, `PortfolioItem` em `features/creator/`.
- **Instalação obrigatória**: `pnpm add react-markdown`

---

## 6. Endpoints Principais (resumo consolidado)

Ver tabelas completas nos guias individuais. Todos os endpoints de modos usam `@UseGuards(JwtAuthGuard)` excepto os perfis públicos (`/users/:username` e `/creator/:username`).

**Endpoints do Criador (Pedro):**
- `GET /api/v1/creator/articles`
- `POST /api/v1/creator/articles`
- `GET /api/v1/creator/articles/:slug`
- `PATCH /api/v1/creator/articles/:id`
- `DELETE /api/v1/creator/articles/:id`
- `GET /api/v1/creator/:username`
- `GET/POST/DELETE /api/v1/creator/portfolio`

---

## 7. Padrões de Código & Regras de Ouro (para o Cursor seguir)

1. **WebSocket** – Sempre validar JWT no `handleConnection` e desconectar token inválido.
2. **Membros** – Sempre verificar `assertMember` / `assertServerMember` antes de qualquer operação.
3. **Bots** – Lógica de trigger **case-insensitive** e com prefixo.
4. **Frontend** – Usar `credentials: 'include'` em todos os fetch. Socket.io-client com auth token.
5. **Paginação** – Cursor-based (nunca offset).
6. **Soft delete** – Usar `deletedAt` (Lazer, Criador artigos, etc.).
7. **Idempotência** – Join por inviteCode deve ser idempotente.
8. **Slug** – Gerar sempre com a função exacta do guia do Pedro.
9. **Testes manuais** – Seguir os “✅ Feito quando” de cada dia.

---

## 8. Plano de Desenvolvimento (Próximos Passos Recomendados)

1. Criar este ficheiro `PROJECT_BIBLE.md` na raiz do monorepo.
2. Executar as migrações pendentes (community, creator, developer, lazer, follow).
3. Registar todos os módulos no `AppModule`.
4. Implementar o Design System (Luís) primeiro – é bloqueante para os outros.
5. Seguir o plano dia-a-dia de cada guia individual (incluindo o novo guia do Pedro).