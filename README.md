# Alpha Network

> A rede social que se adapta a você.

## Stack

| Camada      | Tecnologia                                    |
|-------------|-----------------------------------------------|
| API         | Node.js 20 · NestJS 10 · TypeScript           |
| Base dados  | PostgreSQL 16 via Prisma ORM                  |
| Cache       | Redis 7                                       |
| Frontend    | Next.js 14 · React 18 · Tailwind CSS 3        |
| WebSocket   | Socket.io 4                                   |
| Storage     | MinIO (dev) / AWS S3 (prod)                   |
| Package mgr | pnpm (monorepo com workspaces)                |

## Estrutura

```
alpha-network/
├── apps/
│   ├── api/          — Backend NestJS (porta 3001)
│   │   ├── src/
│   │   │   ├── auth/           → Adolfo Figueiredo
│   │   │   ├── users/          → Adolfo Figueiredo
│   │   │   ├── common/         → Bruno Fearless / Claude
│   │   │   └── modes/
│   │   │       ├── lazer/      → Obed Jorge
│   │   │       ├── creator/    → Pedro Evaristo
│   │   │       ├── developer/  → Alexandre Landa
│   │   │       ├── community/  → Bruno Fearless
│   │   │       └── bots/       → Bruno Fearless
│   │   └── prisma/             → schema.prisma (todos)
│   └── web/          — Frontend Next.js (porta 3000)
│       └── src/
│           ├── app/
│           │   ├── auth/       → Luís Gonçalves (UI) + Adolfo (API)
│           │   └── main/
│           │       ├── page.tsx         → Mode Picker
│           │       ├── lazer/           → Obed Jorge
│           │       ├── creator/         → Pedro Evaristo
│           │       ├── developer/       → Alexandre Landa
│           │       ├── community/       → Bruno Fearless
│           │       └── bots/            → Bruno Fearless
│           ├── components/
│           │   ├── ui/         → Luís Gonçalves
│           │   ├── layout/     → Luís Gonçalves
│           │   └── features/   → cada developer no seu modo
│           ├── store/          → auth.store.ts (base pronta)
│           └── lib/            → api.ts, format.ts
└── docker-compose.yml
```

## Início rápido

### 1. Pré-requisitos
- Node.js 20+, pnpm 8+, Docker Desktop

### 2. Setup
```bash
git clone <repo>
cd alpha-network

# Instalar dependências
pnpm install

# Copiar variáveis de ambiente
cp .env.example apps/api/.env.local
# Preencher JWT_ACCESS_SECRET e JWT_REFRESH_SECRET:
#   openssl rand -hex 32

# Subir PostgreSQL, Redis e MinIO
docker compose up -d

# Criar tabelas na base de dados
pnpm db:migrate

# Arrancar API + Frontend em simultâneo
pnpm dev
```

### 3. URLs
| Serviço      | URL                              |
|--------------|----------------------------------|
| Frontend     | http://localhost:3000            |
| API          | http://localhost:3001/api/v1     |
| Prisma Studio| http://localhost:5555            |
| MinIO UI     | http://localhost:9001            |

## Owners por módulo

| Módulo           | Developer          |
|------------------|--------------------|
| Auth + Users     | Adolfo Figueiredo  |
| Design System    | Luís Gonçalves     |
| Modo Lazer       | Obed Jorge         |
| Modo Criador     | Pedro Evaristo     |
| Modo Desenvolvedor | Alexandre Landa  |
| Modo Comunidade  | Bruno Fearless     |
| Modo Bot         | Bruno Fearless     |
| Estrutura base   | Bruno Fearless + Claude |

## Git Flow

```
main          — produção (protegido)
develop       — integração (todos os PRs vão aqui)
feature/*     — branches de trabalho
```

Convenção de commits: `feat(lazer): criar endpoint de feed`
