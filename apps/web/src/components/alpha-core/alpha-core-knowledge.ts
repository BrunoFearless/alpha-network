// ════════════════════════════════════════════════════════════════════════════
// ALPHA CORE — Base de conhecimento completa da Alpha Network
// Este ficheiro é injectado no system prompt da Alpha Core.
// Actualiza este ficheiro sempre que a plataforma mudar.
// ════════════════════════════════════════════════════════════════════════════

export const ALPHA_NETWORK_KNOWLEDGE = `
## O QUE É A ALPHA NETWORK

A Alpha Network é uma rede social criativa focada em comunidades de anime, manga, ficção científica e cultura pop japonesa. Combina elementos de redes sociais convencionais (feed, perfis, amizades) com funcionalidades únicas orientadas para criadores e consumidores de conteúdo de nicho.

A plataforma é construída com:
- Frontend: Next.js 14 + Tailwind CSS + Zustand (gestão de estado)
- Backend: NestJS + Prisma + PostgreSQL
- Tempo real: Socket.io
- Autenticação: JWT (access 15min + refresh 30 dias em cookie HTTP-only) + Google OAuth

---

## MODOS DA PLATAFORMA

A Alpha Network é organizada em "Modos" — secções temáticas com funcionalidades específicas:

### 1. MODO LAZER (desenvolvido por Obed)
O feed social principal. Aqui os utilizadores publicam, comentam, reagem e interagem.

**Funcionalidades:**
- **Posts:** Texto com título (linha 1) e corpo (linhas seguintes). Suporta imagens e vídeos. Opção "Sparkle" para destaque especial. Tags para categorização. Fontes e cores personalizadas no título.
- **Feed:** Tabs "For You", "Following", "Anime", "Manga". Posts fixados aparecem no topo.
- **Comentários (Ecos):** Sistema de threading — respostas ficam ligadas visualmente ao comentário pai com linha vertical. Suporta emoji. Reações em comentários.
- **Reações:** Botão de coração (like). Contagem em tempo real.
- **Sistema de amigos:** Enviar pedido, aceitar, recusar, remover. Botão "Seguir" no post de outros utilizadores.
- **Perfil Lazer:** Banner (imagem ou vídeo), avatar, nome personalizado com fonte/efeito/cor, bio, status, tags, tema de cor, modo claro/escuro.
- **Modais:**
  - **Explorar:** Pesquisa de utilizadores e posts, categorias, criadores em destaque.
  - **Notificações:** Pedidos de amizade, reações, comentários em posts próprios.
  - **Rede:** Sugestões de amigos, lista de amigos, pedidos pendentes, Trending Tropes, Hot Discussions, Currently Watching, Active Now.
- **Bottom Bar de navegação:** Casa, Explorar, Botão central (volta ao feed), Notificações, Rede, Avatar (vai ao próprio perfil).

**Como publicar:**
1. Escreve no compositor do feed (caixa no topo)
2. Linha 1 = título (aparece em destaque)
3. Linhas seguintes = corpo
4. Opcionalmente: adiciona imagem/vídeo (ícone câmara), sparkle (estrela), tag (etiqueta), emoji, fonte personalizada, cor de título
5. Clica "Publicar"

**Como comentar:**
1. Clica no ícone de comentário num post
2. Aparece a secção de Ecos abaixo do post
3. Escreve e prime Enter ou clica ➤
4. Para responder a um comentário específico, clica "Responder" nesse comentário

**Como adicionar amigos:**
1. Clica "Seguir" no post de outro utilizador, ou
2. Vai ao modal "Rede" (ícone de pessoas na bottom bar) → Sugestões
3. O outro utilizador recebe notificação e pode aceitar/recusar

---

### 2. MODO COMMUNITY (desenvolvido por Bruno)
Servidores estilo Discord — comunidades com canais de texto, categorias, membros, roles, eventos.

**Funcionalidades:**
- Criar e gerir servidores com imagem/banner/cores
- Canais de texto organizados em categorias
- Threads dentro de canais
- Sistema de roles com permissões granulares (moderar, gerir servidor, gerir canais)
- Pins de mensagens
- Reações com emoji
- Eventos do servidor (com localização, data, frequência)
- Sistema de bans
- Audit log de acções moderativas
- Convites por código único
- Bots integrados no servidor

**Componentes principais:**
- \`ServerSidebar\` — lista de servidores e canais
- \`ChannelView\` — mensagens em tempo real via Socket.io
- \`MembersList\` — membros com roles e estado online
- \`ServerSettings\` — configurações, roles, eventos

---

### 3. MODO CREATOR (desenvolvido por Pedro)
Ferramentas para criadores de conteúdo — artigos, portfólio, publicações especiais.

**Funcionalidades:**
- Editor de artigos rich text
- Portfólio com itens ordenáveis
- Publicação com slug único
- Sistema de publicado/rascunho

---

### 4. MODO DEVELOPER (desenvolvido por Alexandre)
Ambiente colaborativo de código — projectos com ficheiros, tarefas e mensagens de equipa.

**Funcionalidades:**
- Criar projectos públicos ou privados
- Editor de ficheiros com estrutura de pastas
- Sistema de tarefas (to-do)
- Chat interno do projecto
- Membros com roles (owner, member)

---

### 5. MODO BOTS (desenvolvido por Bruno)
Criação e gestão de bots personalizados para servidores Community.

**Funcionalidades:**
- Builder visual de bots com fluxo drag-and-drop
- Comandos com trigger e resposta (texto, imagem, embed)
- Logs de execução
- Bots públicos partilháveis
- Versioning de bots

---

## SISTEMA DE AUTENTICAÇÃO

**Registo:**
1. Vai a /auth/register
2. Preenche email, password, e escolhe username único
3. Verifica o email (se activado)
4. Completa o perfil

**Login:**
- Email + password → recebe access token (15min) + refresh token em cookie (30 dias)
- Google OAuth disponível → botão "Continuar com Google"
- O refresh token renova automaticamente o access token

**Problemas comuns:**
- "401 Unauthorized" → sessão expirou. Faz logout e login novamente.
- "403 Forbidden" → não tens permissão para essa acção (ex: tentar editar o post de outro utilizador)
- Google OAuth falhou → verifica se o browser bloqueia popups

---

## PERFIL DO UTILIZADOR

**O que podes personalizar (no Modo Lazer → botão Editar Perfil no teu perfil):**
- Nome de exibição (displayName)
- Username (único na plataforma)
- Bio (descrição)
- Status (o que estás a fazer agora)
- Tags (ex: #Anime #Manga)
- Avatar (imagem ou GIF ou vídeo curto)
- Banner (imagem, GIF ou vídeo)
- Cor do banner (alternativa ao banner)
- Fonte do nome (Default, Serif, Mono, Display, Elegant)
- Efeito do nome (nenhum, brilho, gradiente, etc.)
- Cor do nome
- Tema Aurora (tema de cor da interface no Lazer)
- Modo claro/escuro
- Cor de destaque do tema

**Navegação para o próprio perfil:**
- Clica no teu avatar na Bottom Bar (canto direito)
- Ou vai directamente a /main/lazer e clica em "Editar Perfil" dentro do perfil

---

## ESTRUTURA DE FICHEIROS DO FRONTEND (apps/web)

\`\`\`
src/
  app/
    main/
      lazer/           → Modo Lazer
        page.tsx       → Página principal + navegação entre vistas
        components/
          home/
            LazerHomeView.tsx    → Feed + compositor + posts
          profile/
            LazerProfileView.tsx → Vista de perfil
            LazerProfileEditor.tsx → Editor de perfil
            types.ts             → Tipos TypeScript
            ThemeBg.tsx          → Background temático
          modals/
            ExploreModal.tsx     → Modal Explorar
            NotificationsModal.tsx → Modal Notificações
            FriendsModal.tsx     → Modal Rede/Amigos
      community/       → Modo Community
      creator/         → Modo Creator
      developer/       → Modo Developer
      bots/            → Modo Bots
  store/
    auth.store.ts      → Estado de autenticação (Zustand)
    lazer.store.ts     → Estado do Modo Lazer
  components/
    ui/
      Avatar.tsx       → Componente de avatar
      DisplayName.tsx  → Nome com estilos personalizados
      EmojiRenderer.tsx → Renderizador de emoji
      Badge.tsx        → Badges
    community/
      EmojiPicker.tsx  → Selector de emoji
\`\`\`

---

## ESTRUTURA DE FICHEIROS DO BACKEND (apps/api)

\`\`\`
src/
  auth/              → Autenticação JWT + Google OAuth
  users/             → Perfis, upload, amigos, pedidos de amizade
  modes/
    lazer/           → Posts, comentários, reações, feed
    community/       → Servidores, canais, mensagens
    creator/         → Artigos, portfólio
    developer/       → Projectos, ficheiros, tarefas
    bots/            → Bots, comandos, logs
  prisma/            → Serviço Prisma
\`\`\`

---

## ENDPOINTS PRINCIPAIS DA API (base: /api/v1)

**Auth:**
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET  /auth/google (OAuth)

**Users:**
- GET  /users/search?q= → pesquisar utilizadores
- GET  /users/id/:id → perfil por ID
- GET  /users/:username → perfil por username
- PATCH /users/me → actualizar perfil
- POST /users/me/avatar → upload avatar
- POST /users/me/banner → upload banner
- GET  /users/me/friends → lista de amigos
- DELETE /users/friends/:userId → remover amigo
- GET  /users/me/friend-requests → pedidos de amizade
- POST /users/friend-requests → enviar pedido
- DELETE /users/friend-requests/:toUserId → cancelar pedido
- POST /users/friend-requests/:id/accept → aceitar
- POST /users/friend-requests/:id/reject → recusar

**Lazer:**
- GET  /lazer/feed → feed de posts
- POST /lazer/posts → criar post
- GET  /lazer/posts/:id → post por ID
- PATCH /lazer/posts/:id → editar post
- POST /lazer/posts/:id → apagar (soft delete)
- PATCH /lazer/posts/:id/pin → fixar/desafixar
- POST /lazer/posts/reactions → reagir a post
- GET  /lazer/posts/:id/comments → comentários
- POST /lazer/posts/:id/comments → criar comentário
- DELETE /lazer/comments/:id → apagar comentário
- POST /lazer/comments/:id/react → reagir a comentário
- GET  /lazer/users/:userId/posts → posts de utilizador
- GET  /lazer/notifications → notificações

---

## SCHEMA DA BASE DE DADOS (modelos principais)

- **User:** id, email, passwordHash, provider, emailVerified, createdAt
- **Profile:** userId, username, displayName, avatarUrl, bannerUrl, bio, status, tags, nameFont, nameEffect, nameColor, auroraTheme, activeModes[], lazerData (JSON), bannerColor
- **Session:** userId, refreshToken, expiresAt
- **LazerPost:** authorId, content, imageUrl, tag, isSparkle, isPinned, titleFont, titleColor, deletedAt
- **LazerComment:** postId, authorId, parentId, content, deletedAt
- **LazerReaction:** postId, userId, type
- **LazerCommentReaction:** commentId, userId
- **FriendRequest:** fromUserId, toUserId, status (pending/accepted/rejected)
- **Friendship:** userId, friendId, status
- **Server, Channel, Message** → Modo Community
- **Bot, BotCommand, ServerBot** → Modo Bots

---

## PERGUNTAS FREQUENTES

**P: Como mudo o meu username?**
R: De momento o username não pode ser alterado após o registo. Esta funcionalidade está planeada para uma versão futura.

**P: Posso ter mais do que uma conta?**
R: Sim, com emails diferentes. Não há limite definido.

**P: Os posts são permanentes?**
R: Os posts são "soft deleted" — ficam na base de dados mas não aparecem no feed. Não há sistema de recuperação público de momento.

**P: Como funcionam as notificações?**
R: As notificações aparecem no modal "Notificações" (ícone de sino na Bottom Bar). Incluem: pedidos de amizade recebidos, reações nos teus posts, comentários nos teus posts.

**P: O que são Sparkles?**
R: Posts com Sparkle têm um brilho especial na borda e um ícone de estrela. São uma forma de destacar publicações especiais ou importantes.

**P: Como funcionam as tags nos posts?**
R: As tags categorizam o post (ex: Anime, Manga, DailyLife). Aparecem como badges no post e podem ser filtradas no modal Explorar.

**P: Posso editar um comentário após publicar?**
R: Sim. Passa o rato sobre o teu comentário → ícone de três pontos → Editar.

**P: Como funciona o sistema de temas?**
R: Cada utilizador tem um tema de cor principal e pode escolher entre modo claro e escuro. O tema afecta a interface do Modo Lazer — fundo, bordas, destaque.

**P: Qual é o tamanho máximo de ficheiro para upload?**
R: Avatar: 8MB. Banner: 15MB. Formatos suportados: JPG, PNG, GIF, WebP, MP4, WebM.

---

## VALORES E IDENTIDADE DA ALPHA NETWORK

- **Comunidade primeiro:** A plataforma é construída para as comunidades, não para os algoritmos.
- **Criatividade sem limites:** Cada utilizador tem liberdade total para personalizar a sua presença.
- **Cultura de nicho:** Focada em anime, manga e cultura pop japonesa — não genérica.
- **Construída por e para a comunidade:** A equipa é pequena e apaixonada.
- **Em desenvolvimento activo:** A plataforma cresce constantemente com novas funcionalidades.
`;

// Versão resumida para contextos com tokens limitados
export const ALPHA_NETWORK_KNOWLEDGE_COMPACT = `
Alpha Network: rede social para comunidades anime/manga. Modos: Lazer (feed social, posts, comentários/Ecos, amigos), Community (servidores tipo Discord), Creator (artigos), Developer (código colaborativo), Bots.
Stack: Next.js 14 + NestJS + Prisma + PostgreSQL. Auth: JWT + Google OAuth.
Lazer: posts com título+corpo, imagens/vídeos, sparkle, tags, comentários threading, reações, sistema de amigos. Perfil personalizável (avatar, banner, nome com fonte/cor/efeito, tema aurora, modo claro/escuro).
Modais: Explorar (pesquisa), Notificações (amizades+reações+comentários), Rede (amigos+trending).
API base: /api/v1. Endpoints principais: /auth, /users, /lazer.
`;

export default ALPHA_NETWORK_KNOWLEDGE;
