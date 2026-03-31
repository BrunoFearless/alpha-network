# Módulo de Comunidade & Bots — Setup

## 1. Migration da base de dados

O schema.prisma já tem os modelos corretos (Server, Channel, Message,
ServerMember, Bot, BotCommand, ServerBot). Corre a migration:

```bash
cd apps/api
npx prisma migrate dev --name add_community_and_bots
npx prisma generate
```

Confirmar no Prisma Studio:
```bash
npx prisma studio
# Abre http://localhost:5555
# Deves ver: community_servers, community_channels, community_messages,
#            community_members, bots, bot_commands, server_bots
```

## 2. Verificar variáveis de ambiente

No ficheiro apps/api/env (ou .env), confirmar que existe:
```env
JWT_ACCESS_SECRET="alpha-network-access-secret-dev-2024"
FRONTEND_URL="http://localhost:3000"
```

## 3. Arrancar o projecto

```bash
# Na raiz do projecto
pnpm dev
```

## 4. Testar o fluxo completo de bots

1. Vai a /main/bots → Criar bot (nome: "Helper", prefixo: "!")
2. Vai ao bot criado → Adicionar comando: trigger "ajuda", resposta "Olá! Estou aqui para ajudar."
3. Adicionar o bot a um servidor (precisa de ser admin)
4. Vai ao servidor → canal geral → escreve "!ajuda"
5. O bot responde após ~800ms

## 5. Endpoints disponíveis

### Community
- GET    /api/v1/community/servers
- POST   /api/v1/community/servers
- GET    /api/v1/community/servers/:id
- POST   /api/v1/community/servers/join/:inviteCode
- POST   /api/v1/community/servers/:id/channels
- GET    /api/v1/community/channels/:id/messages
- POST   /api/v1/community/servers/:id/bots/:botId

### Bots
- GET    /api/v1/bots
- POST   /api/v1/bots
- GET    /api/v1/bots/:id
- POST   /api/v1/bots/:id/commands
- DELETE /api/v1/bots/commands/:id

### WebSocket
- Namespace: /community
- Eventos cliente→servidor: channel.join, channel.leave, message.send
- Eventos servidor→cliente: message.receive, channel.joined, error
