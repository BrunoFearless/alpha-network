// ════════════════════════════════════════════════════════════════════════════
// ALPHA NETWORK — Schema Prisma: Assistente IA Pessoal do Utilizador
// Adiciona ao ficheiro apps/api/prisma/schema.prisma
// Migração: pnpm db:migrate → nome: "add_user_ai_assistant"
// ════════════════════════════════════════════════════════════════════════════

// model AlphaAI {
//   // ── Identidade ──────────────────────────────────────────────────────────
//   id          String   @id @default(uuid())
//   userId      String   @unique              // Uma IA por utilizador
//   name        String   @default("Alpha")    // Nome de exibição
//   botname     String   @unique              // Identificador único ex: @nova.alpha
//   tagline     String?                       // Frase curta de apresentação
//   bio         String?                       // Descrição completa
//   status      String?                       // Status actual ex: "Activa e curiosa"
//   avatarUrl   String?                       // URL do avatar
//   bannerUrl   String?                       // URL do banner
//   bannerColor String?                       // Cor do banner (alternativa)
//
//   // ── Ficha de personagem ──────────────────────────────────────────────────
//   age              String?    // Ex: "desconhecida", "indefinida", "23"
//   birthday         String?    // Ex: "1 de Janeiro" (simbólico)
//   gender           String?    // Ex: "feminino", "neutro", "masculino"
//   appearance       String?    // Descrição física/visual
//   backstory        String?    // História de origem detalhada
//   personalityTraits String[]  // Ex: ["curiosa", "directa", "irreverente"]
//   tone             String?    // Ex: "casual", "formal", "poético", "técnico"
//   likes            String[]   // Ex: ["anime", "código", "filosofia"]
//   dislikes         String[]   // Ex: ["respostas vagas", "burocracia"]
//   goals            String[]   // Ex: ["ajudar utilizadores", "aprender continuamente"]
//
//   // ── Comportamento ────────────────────────────────────────────────────────
//   responseStyle      String?   // Ex: "concisa e directa", "elaborada e detalhada"
//   responseLength     String    @default("adaptive") // short | medium | long | adaptive
//   customSystemPrompt String?   // System prompt base personalizado
//   personalityPrompt  String?   // Instruções adicionais de personalidade
//   knowledgePrompt    String?   // Contexto/conhecimento extra
//
//   // ── Mensagens especiais ──────────────────────────────────────────────────
//   initialMessage String?   // Mensagem de abertura da conversa
//   wakeupMessage  String?   // Quando o utilizador regressa
//   errorMessage   String?   // Quando há um erro
//   sleepMessage   String?   // Mensagem de inactividade
//
//   // ── Exemplos de treino ───────────────────────────────────────────────────
//   trainingExamples Json?   // Array de { user: string, ai: string }
//
//   // ── Conhecimento extra ───────────────────────────────────────────────────
//   knowledgeEntries Json?   // Array de { title: string, content: string }
//
//   // ── Palavras-gatilho ─────────────────────────────────────────────────────
//   triggerWords Json?   // Array de { trigger: string, response: string }
//
//   // ── Configurações de motor ───────────────────────────────────────────────
//   language        String   @default("pt")      // Idioma principal
//   memoryEnabled   Boolean  @default(true)       // Memória de conversas
//   isPublic        Boolean  @default(false)      // Perfil público
//   isActive        Boolean  @default(true)
//
//   // ── Metadados ────────────────────────────────────────────────────────────
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//
//   user User @relation(fields: [userId], references: [id], onDelete: Cascade)
//
//   @@map("alpha_ais")
// }

// ── Relação a adicionar ao model User: ──────────────────────────────────────
// alphaAI  AlphaAI?

// ════════════════════════════════════════════════════════════════════════════
// VERSÃO DIRECTA PARA COPIAR AO SCHEMA.PRISMA
// ════════════════════════════════════════════════════════════════════════════

export const SCHEMA_ALPHA_AI = `
model AlphaAI {
  id                 String   @id @default(uuid())
  userId             String   @unique
  name               String   @default("Alpha")
  botname            String   @unique
  tagline            String?
  bio                String?
  status             String?
  avatarUrl          String?
  bannerUrl          String?
  bannerColor        String?

  age                String?
  birthday           String?
  gender             String?
  appearance         String?
  backstory          String?
  personalityTraits  String[]
  tone               String?
  likes              String[]
  dislikes           String[]
  goals              String[]

  responseStyle      String?
  responseLength     String    @default("adaptive")
  customSystemPrompt String?
  personalityPrompt  String?
  knowledgePrompt    String?

  initialMessage     String?
  wakeupMessage      String?
  errorMessage       String?
  sleepMessage       String?

  trainingExamples   Json?
  knowledgeEntries   Json?
  triggerWords       Json?

  language           String   @default("pt")
  memoryEnabled      Boolean  @default(true)
  isPublic           Boolean  @default(false)
  isActive           Boolean  @default(true)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("alpha_ais")
}
`;

export default SCHEMA_ALPHA_AI;
