// ════════════════════════════════════════════════════════════════════════════
// ALPHA CORE — Fase 3: Adições ao schema.prisma
// Adiciona estes modelos ao ficheiro apps/api/prisma/schema.prisma
// Depois corre: pnpm db:migrate (nome sugerido: "add_alpha_core_phase3")
// ════════════════════════════════════════════════════════════════════════════

// ─── ALPHA CORE — Audit Log de Acções ────────────────────────────────────

// model AlphaCoreAction {
//   id          String   @id @default(uuid())
//   userId      String
//   action      String                       // ex: "update_profile", "create_post"
//   payload     Json                         // dados enviados
//   result      Json?                        // resultado da acção
//   status      String   @default("pending") // pending | confirmed | executed | reverted | rejected
//   confirmedAt DateTime?
//   executedAt  DateTime?
//   revertedAt  DateTime?
//   createdAt   DateTime @default(now())
//
//   user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
//
//   @@index([userId, createdAt(sort: Desc)])
//   @@map("alpha_core_actions")
// }

// ─── ALPHA CORE — Permissões por utilizador ───────────────────────────────

// model AlphaCorePermission {
//   id          String   @id @default(uuid())
//   userId      String   @unique
//   // Granular permissions — true = autorizado
//   canEditProfile    Boolean @default(false)
//   canCreatePosts    Boolean @default(false)
//   canDeletePosts    Boolean @default(false)
//   canManageFriends  Boolean @default(false)
//   canEditTheme      Boolean @default(false)
//   // Metadados
//   grantedAt   DateTime @default(now())
//   updatedAt   DateTime @updatedAt
//
//   user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
//
//   @@map("alpha_core_permissions")
// }

// ─── Relações a adicionar ao model User ───────────────────────────────────

// alphaCoreActions     AlphaCoreAction[]
// alphaCorePermission  AlphaCorePermission?

// ════════════════════════════════════════════════════════════════════════════
// VERSÃO PRONTA PARA COPIAR DIRECTAMENTE AO SCHEMA
// (coloca antes do último model do ficheiro)
// ════════════════════════════════════════════════════════════════════════════

const SCHEMA_ADDITIONS = `
model AlphaCoreAction {
  id          String    @id @default(uuid())
  userId      String
  action      String
  payload     Json
  result      Json?
  status      String    @default("pending")
  confirmedAt DateTime?
  executedAt  DateTime?
  revertedAt  DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("alpha_core_actions")
}

model AlphaCorePermission {
  id                String   @id @default(uuid())
  userId            String   @unique
  canEditProfile    Boolean  @default(false)
  canCreatePosts    Boolean  @default(false)
  canDeletePosts    Boolean  @default(false)
  canManageFriends  Boolean  @default(false)
  canEditTheme      Boolean  @default(false)
  grantedAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("alpha_core_permissions")
}
`;

export default SCHEMA_ADDITIONS;
