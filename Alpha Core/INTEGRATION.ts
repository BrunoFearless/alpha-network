// ════════════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO DA ALPHA CORE NA PÁGINA DO LAZER
// Adiciona estas linhas ao teu apps/web/src/app/main/lazer/page.tsx
// ════════════════════════════════════════════════════════════════════════════

// ── 1. Importar o botão da Alpha Core ─────────────────────────────────────

// No topo do ficheiro, junto às outras importações:
// import { AlphaCoreButton } from '@/components/alpha-core/AlphaCoreChat';


// ── 2. Adicionar o botão flutuante ao JSX ─────────────────────────────────

// Dentro do return da LazerPage, ANTES do closing </div> final:
//
// <AlphaCoreButton
//   themeColor={c}
//   themeMode={themeMode}
//   currentMode="Lazer"
// />


// ── Exemplo de page.tsx com integração completa ───────────────────────────

/*
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLazerStore } from '@/store/lazer.store';
import { LazerProfileView } from './components/profile/LazerProfileView';
import { LazerProfileEditor } from './components/profile/LazerProfileEditor';
import { DEMO_USER, LazerUserProfile } from './components/profile/types';
import { LazerHomeView } from './components/home/LazerHomeView';
import { ExploreModal } from './components/modals/ExploreModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { FriendsModal } from './components/modals/FriendsModal';

// ▶ ALPHA CORE — nova importação
import { AlphaCoreButton } from '@/components/alpha-core/AlphaCoreChat';

export default function LazerPage() {
  // ... todo o código existente ...

  return (
    <div className="w-full min-h-screen relative">
      // ... conteúdo existente ...

      // ▶ ALPHA CORE — adicionar aqui, antes do fecho do div principal
      <AlphaCoreButton
        themeColor={c}
        themeMode={themeMode}
        currentMode="Lazer"
      />
    </div>
  );
}
*/


// ════════════════════════════════════════════════════════════════════════════
// ESTRUTURA DE FICHEIROS — onde colocar cada ficheiro
// ════════════════════════════════════════════════════════════════════════════

/*
apps/web/src/
  components/
    alpha-core/                          ← Cria esta pasta
      AlphaCoreAvatar.tsx                ← Avatar SVG animado
      AlphaCoreChat.tsx                  ← Componente principal de chat
      useAlphaCore.ts                    ← Hook de lógica
      alpha-core-system-prompt.ts        ← System prompt da Alpha
      alpha-core-knowledge.ts            ← Base de conhecimento
      alpha-core-phase2-providers.ts     ← Geração de imagens/relatórios/código
      index.ts                           ← Re-exports (ver abaixo)
*/


// ── index.ts (re-exports para importação limpa) ────────────────────────────
/*
export { AlphaCoreChat, AlphaCoreButton } from './AlphaCoreChat';
export { AlphaCoreAvatar, AlphaCoreAvatarSmall } from './AlphaCoreAvatar';
export { useAlphaCore } from './useAlphaCore';
export { buildAlphaCoreSystemPrompt } from './alpha-core-system-prompt';
export { ALPHA_NETWORK_KNOWLEDGE } from './alpha-core-knowledge';
export { generateImage, generateReport, generateCode } from './alpha-core-phase2-providers';
*/


// ════════════════════════════════════════════════════════════════════════════
// VARIÁVEIS DE AMBIENTE
// Adiciona ao apps/web/.env.local
// ════════════════════════════════════════════════════════════════════════════

/*
# Já deve existir:
NEXT_PUBLIC_API_URL=http://localhost:3001

# Alpha Core — Fase 2 (opcional, só para geração de imagens)
# Regista em https://api.together.ai para obter a chave
NEXT_PUBLIC_TOGETHER_API_KEY=your_together_ai_key_here

# Alternativa para imagens: fal.ai (https://fal.ai)
# NEXT_PUBLIC_FAL_API_KEY=your_fal_key_here
*/


// ════════════════════════════════════════════════════════════════════════════
// NOTA SOBRE SEGURANÇA DA API KEY DA ANTHROPIC
// ════════════════════════════════════════════════════════════════════════════

/*
A Alpha Core chama a API Anthropic directamente do browser usando:
  'anthropic-dangerous-direct-browser-access': 'true'

Isto funciona em desenvolvimento. Para PRODUÇÃO, cria um endpoint proxy
no NestJS para não expor a chave no cliente:

  POST /api/v1/alpha/chat
  Body: { messages: [], systemPrompt: string }
  → Faz a chamada à Anthropic API no servidor
  → Retorna a resposta em streaming

Adiciona ao .env do backend:
  ANTHROPIC_API_KEY=sk-ant-api03-...

E no useAlphaCore.ts, muda o ANTHROPIC_API para:
  const ANTHROPIC_API = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/alpha/chat`;

Para a Fase 1 (desenvolvimento), o browser directo é aceitável.
*/


// ════════════════════════════════════════════════════════════════════════════
// PRÓXIMOS PASSOS — ROADMAP TÉCNICO
// ════════════════════════════════════════════════════════════════════════════

/*
FASE 1 (feito):
  ✓ Alpha Core Knowledge Base (alpha-core-knowledge.ts)
  ✓ System Prompt com personalidade completa (alpha-core-system-prompt.ts)
  ✓ Avatar SVG animado com estados idle/thinking/speaking (AlphaCoreAvatar.tsx)
  ✓ Hook de comunicação com streaming (useAlphaCore.ts)
  ✓ Interface de chat completa com design distintivo (AlphaCoreChat.tsx)
  ✓ Botão flutuante integrado no Lazer

FASE 2 (providers criados, integração no chat pendente):
  ○ Integrar handleToolCall no useAlphaCore para processar tool_use blocks
  ○ Renderizar imagens geradas nas mensagens do chat
  ○ Renderizar relatórios com botão de download
  ○ Configurar chave da Together AI ou fal.ai
  ○ Criar endpoint proxy no NestJS

FASE 3:
  ○ Endpoint NestJS /api/v1/alpha/action com lista de acções permitidas
  ○ Sistema de confirmação UI antes de cada acção
  ○ Audit log de acções da Alpha Core no perfil

FASE 4:
  ○ Tabela AlphaCoreMemory no Prisma (userId, key, value, createdAt)
  ○ Endpoints GET/PATCH /api/v1/alpha/memory
  ○ Injecção de memória no system prompt
  ○ Motor de sugestões proactivas
*/
