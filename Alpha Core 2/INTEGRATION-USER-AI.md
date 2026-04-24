# Alpha Network — IA Pessoal do Utilizador: Guia de Integração

## O que foi construído

Cada utilizador pode criar e configurar a sua própria IA personalizada — como os Shapes da Shapes, Inc., mas nativa da Alpha Network.

---

## Ficheiros criados

| Ficheiro | Destino | Descrição |
|---|---|---|
| `alpha-ai-schema-addition.ts` | `apps/api/prisma/schema.prisma` | Modelo `AlphaAI` na base de dados |
| `backend/alpha-ai.service.ts` | `apps/api/src/alpha-core/alpha-ai.service.ts` | Lógica de negócio |
| `backend/alpha-ai.controller.ts` | `apps/api/src/alpha-core/alpha-ai.controller.ts` | Endpoints REST |
| `AlphaAIEditor.tsx` | `apps/web/src/components/alpha-core/AlphaAIEditor.tsx` | Editor completo (UI) |
| `AlphaAIProfile.tsx` | `apps/web/src/components/alpha-core/AlphaAIProfile.tsx` | Card público + hook de chat |

---

## Setup — Backend

### 1. Adicionar o modelo ao schema

Copia o conteúdo da variável `SCHEMA_ALPHA_AI` do ficheiro `alpha-ai-schema-addition.ts` e adiciona ao `apps/api/prisma/schema.prisma`, antes do último model.

Também adiciona ao model `User`:
```prisma
alphaAI  AlphaAI?
```

### 2. Migrar a base de dados
```bash
cd apps/api
pnpm db:migrate
# Nome sugerido: add_user_ai_assistant
pnpm db:generate
```

### 3. Registar o módulo no AppModule

Em `apps/api/src/app.module.ts`, adiciona `AlphaAIController` e `AlphaAIService` ao módulo `AlphaCore` (ou cria um sub-módulo):

```typescript
// apps/api/src/alpha-core/alpha-core.module.ts
import { Module } from '@nestjs/common';
import { AlphaCoreController } from './alpha-core.controller';
import { AlphaCoreService } from './alpha-core.service';
import { AlphaAIController } from './alpha-ai.controller';
import { AlphaAIService } from './alpha-ai.service';

@Module({
  controllers: [AlphaCoreController, AlphaAIController],
  providers: [AlphaCoreService, AlphaAIService],
  exports: [AlphaCoreService, AlphaAIService],
})
export class AlphaCoreModule {}
```

---

## Setup — Frontend

### 4. Criar a página do editor

```typescript
// apps/web/src/app/main/alpha-ai/page.tsx
'use client';
import { AlphaAIEditor } from '@/components/alpha-core/AlphaAIEditor';
import { useAuthStore } from '@/store/auth.store';

export default function AlphaAIPage() {
  const { user } = useAuthStore();
  const themeColor = user?.profile?.lazerData?.themeColor ?? '#a78bfa';
  const themeMode  = user?.profile?.lazerData?.themeMode  ?? 'dark';

  return (
    <div style={{ height: '100vh' }}>
      <AlphaAIEditor
        themeColor={themeColor}
        themeMode={themeMode}
      />
    </div>
  );
}
```

### 5. Adicionar entrada de navegação

No menu lateral ou na bottom bar, adiciona um link para `/main/alpha-ai`:

```tsx
// Ícone sugerido para a navegação
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="12" cy="8" r="4"/>
  <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  <circle cx="18" cy="19" r="3"/>
  <path d="M18 17v4M16 19h4"/>
</svg>
```

### 6. Usar o card de perfil público

```tsx
import { AlphaAIProfileCard, AlphaAIDiscover } from '@/components/alpha-core/AlphaAIProfile';

// Card individual
<AlphaAIProfileCard
  ai={aiData}
  themeColor="#a78bfa"
  themeMode="dark"
  onChat={(botname) => router.push(`/chat/ai/${botname}`)}
/>

// Grid de descoberta
<AlphaAIDiscover
  themeColor="#a78bfa"
  themeMode="dark"
  onChat={(botname) => router.push(`/chat/ai/${botname}`)}
/>
```

### 7. Chat com a IA pessoal

```tsx
import { useUserAI } from '@/components/alpha-core/AlphaAIProfile';

function ChatPage({ botname }: { botname: string }) {
  const { aiProfile, messages, isStreaming, sendMessage } = useUserAI(botname);

  // Usa este hook com o AlphaCoreChatPhase3 (ou um chat personalizado)
  // O hook carrega o perfil, o system prompt e gere o streaming
}
```

---

## Endpoints criados

| Método | URL | Descrição |
|---|---|---|
| GET | `/api/v1/alpha/ai/me` | Obter a minha IA |
| POST | `/api/v1/alpha/ai` | Criar IA |
| PATCH | `/api/v1/alpha/ai` | Actualizar IA |
| DELETE | `/api/v1/alpha/ai` | Apagar IA |
| GET | `/api/v1/alpha/ai/me/prompt` | Ver system prompt gerado |
| GET | `/api/v1/alpha/ai/check-botname?name=xxx` | Verificar disponibilidade de botname |
| POST | `/api/v1/alpha/ai/training` | Adicionar exemplo de treino |
| DELETE | `/api/v1/alpha/ai/training/:index` | Remover exemplo |
| POST | `/api/v1/alpha/ai/knowledge` | Adicionar entrada de conhecimento |
| DELETE | `/api/v1/alpha/ai/knowledge/:index` | Remover entrada |
| POST | `/api/v1/alpha/ai/triggers` | Adicionar palavra-gatilho |
| GET | `/api/v1/alpha/ai/discover` | Listar IAs públicas |
| GET | `/api/v1/alpha/ai/:botname` | Perfil público de uma IA |

---

## Campos do AlphaAI — resumo

### Identidade (tab Perfil)
- `name` — Nome de exibição
- `botname` — Identificador único (ex: `@nova.alpha`)
- `tagline` — Frase curta
- `bio` — Descrição completa
- `status` — Status actual
- `avatarUrl` / `bannerUrl` / `bannerColor` — Visual

### Personagem (tab Personagem)
- `age`, `birthday`, `gender` — Dados básicos
- `appearance` — Descrição visual
- `backstory` — História de origem
- `personalityTraits[]` — Traços de personalidade
- `tone` — Tom de voz (casual, formal, poético...)
- `likes[]`, `dislikes[]`, `goals[]` — Preferências e objectivos

### Comportamento (tab Comportamento)
- `responseStyle` — Estilo livre
- `responseLength` — adaptive | short | medium | long
- `language` — Idioma principal
- `memoryEnabled` — Memória de conversas
- `personalityPrompt` — Instruções adicionais livres
- `knowledgePrompt` — Contexto extra
- `customSystemPrompt` — Override total (avançado)

### Mensagens especiais (tab Mensagens)
- `initialMessage` — Abertura da conversa
- `wakeupMessage` — Regresso do utilizador
- `sleepMessage` — Inactividade
- `errorMessage` — Erro

### Treino (tab Treino)
- `trainingExamples[]` — Pares `{ user, ai }` (máx. 50)

### Conhecimento (tab Conhecimento)
- `knowledgeEntries[]` — Entradas `{ title, content }` (máx. 30)

### Visibilidade
- `isPublic` — Aparece no grid de descoberta
- `isActive` — IA activa ou pausada

---

## Como o system prompt é gerado

O `AlphaAIService.buildSystemPrompt()` combina todos os campos numa hierarquia:

```
# [Nome] — IA Pessoal na Alpha Network

## IDENTIDADE
[Nome, botname, género, idade, status]

## APARÊNCIA
[appearance]

## HISTÓRIA DE ORIGEM
[backstory]

## PERSONALIDADE
[traços, tom, gostos, desgostos, objectivos]

## ESTILO DE COMUNICAÇÃO
[responseStyle, responseLength, language]

## INSTRUÇÕES ADICIONAIS DE PERSONALIDADE
[personalityPrompt]

## EXEMPLOS DE COMO DEVES RESPONDER
[trainingExamples — máx. 10 para não exceder tokens]

## CONHECIMENTO ESPECÍFICO
[knowledgePrompt + knowledgeEntries]

## INSTRUÇÕES ADICIONAIS DO CRIADOR
[customSystemPrompt — override]

## REGRAS FUNDAMENTAIS
[não quebrar personagem, não identificar como Claude, sem conteúdo prejudicial]
```

---

## Diferenças em relação aos Shapes, Inc.

| Feature | Shapes | Alpha Network |
|---|---|---|
| Identificador único | username | botname (@) |
| Perfil visual | ✓ | ✓ avatar + banner |
| Backstory + traits | ✓ | ✓ |
| Exemplos de treino | ✓ | ✓ (máx. 50) |
| Conhecimento extra | ✓ | ✓ (máx. 30 entradas) |
| Palavras-gatilho | ✓ | ✓ (máx. 20) |
| Mensagens especiais | ✓ (wake/sleep/error) | ✓ |
| Motor de IA | Shapes-specific | Claude (Anthropic) |
| Acções na plataforma | ✗ | ✓ (Fase 3) |
| Integração nativa | Discord | Alpha Network nativa |
| Perfis públicos | ✓ | ✓ (opcional) |
| Memória de conversas | ✓ | ✓ (Fase 4 completa) |
