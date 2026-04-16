<div align="center">

# ✦ Alpha Network

**Plataforma social adaptativa — adapta-se ao que o utilizador quer ser.**

*Lazer · Criador · Desenvolvedor · Comunidade · Bots*

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)

</div>

---

## O que é o Alpha Network?

O Alpha Network é uma plataforma social que se adapta ao utilizador através de **modos de experiência**. Em vez de forçar toda a gente a usar a mesma interface, o utilizador activa os modos que fazem sentido para ele — e a plataforma adapta-se.

| Modo | Descrição | Responsável |
|------|-----------|-------------|
| 🎮 **Lazer** | Feed de posts, reacções e comentários | Obed Jorge |
| ✍️ **Criador** | Artigos em Markdown e portfólio pessoal | Pedro Evaristo |
| 💻 **Desenvolvedor** | Projectos colaborativos, ficheiros e tarefas | Alexandre Landa |
| 🏘️ **Comunidade** | Servidores, canais e mensagens em tempo real | Bruno Fearless |
| 🤖 **Bot** | Criação e gestão de bots para servidores | Bruno Fearless |

---

## Stack Técnica

```
Frontend   →  Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand
Backend    →  NestJS 10 + TypeScript + Prisma ORM + JWT + Passport
Base dados →  PostgreSQL 16
Monorepo   →  pnpm workspaces + Turborepo
```

---

## Estrutura do Repositório

```
alpha-network/
├── apps/
│   ├── api/                    # Backend — NestJS
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Modelos de base de dados
│   │   └── src/
│   │       ├── auth/           # Autenticação (JWT + Google OAuth)
│   │       ├── users/          # Gestão de utilizadores
│   │       ├── modes/          # Módulos de cada modo
│   │       └── common/         # Guards, decorators, pipes partilhados
│   │
│   └── web/                    # Frontend — Next.js
│       └── src/
│           ├── app/            # Rotas (App Router)
│           ├── components/     # Componentes React
│           ├── store/          # Estado global (Zustand)
│           ├── hooks/          # Custom hooks
│           └── lib/            # Utilitários e cliente API
│
├── packages/
│   └── shared/                 # Tipos e utilitários partilhados
│
├── docker-compose.yml          # PostgreSQL + Redis para desenvolvimento
├── WORKFLOW.md                 # Guia de Git para a equipa
└── .github/
    └── pull_request_template.md
```

---

## Pré-requisitos

Antes de começar, garante que tens instalado:

- [Node.js](https://nodejs.org/) **≥ 20**
- [pnpm](https://pnpm.io/installation) **≥ 8** — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para a base de dados

---

## Instalação e Setup

### 1. Clonar o repositório

```bash
git clone https://github.com/BrunoFearless/alpha-network.git
cd alpha-network
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

**Backend** (`apps/api/.env`):
```env
# Base de dados
DATABASE_URL="postgresql://alpha:alpha@localhost:5432/alpha_network"

# JWT — muda estes valores em produção
JWT_SECRET="muda-este-valor-em-producao"
JWT_REFRESH_SECRET="muda-este-valor-tambem"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Google OAuth (opcional para v1)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"

# Servidor
PORT=3001
NODE_ENV=development
```

**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 4. Iniciar a base de dados

```bash
docker-compose up -d
```

Isto inicia o PostgreSQL na porta `5432`.

### 5. Criar as tabelas (migration)

```bash
pnpm db:migrate
```

### 6. Iniciar o projecto

```bash
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

---

## Comandos Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia frontend + backend em simultâneo
pnpm build            # Build de produção (api + web)
pnpm lint             # Linting em todos os packages
pnpm typecheck        # Verificação de tipos TypeScript

# Base de dados
pnpm db:generate      # Gerar Prisma Client após alterar schema
pnpm db:migrate       # Correr migrations pendentes
pnpm db:studio        # Abrir Prisma Studio (GUI da base de dados)
pnpm db:seed          # Popular a base de dados com dados de teste
```

---

## API — Endpoints Principais

### Autenticação
```
POST    /auth/register      Criar conta
POST    /auth/login         Iniciar sessão
POST    /auth/refresh       Renovar token
POST    /auth/logout        Terminar sessão
GET     /auth/me            Perfil do utilizador autenticado
GET     /auth/google        Login com Google
DELETE  /users/me           Deletar conta
POST    /auth/restore       Restaurar conta
```

### Modo Lazer
```
GET    /lazer/posts        Listar posts (feed)
POST   /lazer/posts        Criar post
GET    /lazer/posts/:id    Ver post
DELETE /lazer/posts/:id    Apagar post
POST   /lazer/posts/:id/react     Reagir (like/unlike)
GET    /lazer/posts/:id/comments  Listar comentários
POST   /lazer/posts/:id/comments  Criar comentário
```

### Modo Criador
```
GET    /creator/articles         Listar artigos publicados
POST   /creator/articles         Criar artigo
GET    /creator/articles/:slug   Ver artigo por slug
PATCH  /creator/articles/:id     Editar artigo
DELETE /creator/articles/:id     Apagar artigo
GET    /creator/portfolio        Ver portfólio
POST   /creator/portfolio        Adicionar item ao portfólio
```

### Modo Desenvolvedor
```
GET    /developer/projects            Listar projectos
POST   /developer/projects            Criar projecto
GET    /developer/projects/:id        Ver projecto
POST   /developer/projects/:id/files  Criar ficheiro
POST   /developer/projects/:id/tasks  Criar tarefa
```

### Comunidade
```
POST   /community/servers             Criar servidor
GET    /community/servers/:id         Ver servidor
POST   /community/servers/:id/join    Entrar no servidor
POST   /community/servers/:id/channels  Criar canal
POST   /community/channels/:id/messages Enviar mensagem
```

---

## Autenticação

O sistema usa **JWT com refresh token**:

- **Access Token** — válido 15 minutos, enviado no header `Authorization: Bearer <token>`
- **Refresh Token** — válido 30 dias, enviado como cookie HTTP-only `refreshToken`

Para aceder a rotas protegidas, inclui o header:
```
Authorization: Bearer <access_token>
```

---

## Equipa

| Membro | Módulo | GitHub |
|--------|--------|--------|
| Adolfo Figueiredo | Autenticação | [@AdolfoFigueiredo](https://github.com/AdolfoFigueiredo) |
| Obed Jorge | Modo Lazer | [@ObedJorge](https://github.com/ObedJorge) |
| Pedro Evaristo | Modo Criador | [@PedroEvaristo](https://github.com/PedroEvaristo) |
| Alexandre Landa | Modo Desenvolvedor | [@AlexandreLanda](https://github.com/AlexandreLanda) |
| Luís Gonçalves | Design | [@LuisGoncalves](https://github.com/LuisGoncalves) |
| Bruno Fearless | Comunidade · Bots · Líder | [@BrunoFearless](https://github.com/BrunoFearless) |

---

## Workflow de Desenvolvimento

Cada membro trabalha num branch separado e abre um Pull Request para a `main`.

**Formato do branch:**
```bash
feat/auth-register       # nova funcionalidade
fix/login-token-expiry   # correcção de bug
design/lazer-feed-card   # estilos / UI
chore/setup-prisma       # configuração
```

**Formato do commit:**
```bash
git commit -m "feat: adicionar endpoint POST /auth/register"
git commit -m "fix: corrigir erro 422 no registo duplicado"
git commit -m "design: adicionar animação ao botão de submit"
```

Para mais detalhes, consulta o [WORKFLOW.md](./WORKFLOW.md).

---

## Estado do Projecto

| Módulo | Estado |
|--------|--------|
| 🔐 Autenticação | 🟡 Em desenvolvimento |
| 🎮 Modo Lazer | 🟡 Em desenvolvimento |
| ✍️ Modo Criador | 🟡 Em desenvolvimento |
| 💻 Modo Desenvolvedor | 🟡 Em desenvolvimento |
| 🎨 Design System | 🟡 Em desenvolvimento |
| 🏘️ Modo Comunidade | 🔴 Não iniciado |
| 🤖 Modo Bot | 🔴 Não iniciado |

---

<div align="center">

**Alpha Network** · Feito em Angola 🇦🇴

</div>
