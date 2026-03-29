# Como criar as credenciais Google OAuth

## 1. Criar projecto no Google Cloud

1. Vai a https://console.cloud.google.com
2. Clica em "Select a project" (topo) → "New Project"
3. Nome: `Alpha Network` → Create

## 2. Activar a Google+ API

1. Menu lateral → "APIs & Services" → "Library"
2. Pesquisa "Google+ API" → Enable
3. Pesquisa também "Google Identity" → Enable

## 3. Criar credenciais OAuth 2.0

1. Menu lateral → "APIs & Services" → "Credentials"
2. Clica "+ Create Credentials" → "OAuth client ID"
3. Se pedido, configura o "OAuth consent screen" primeiro:
   - User Type: External → Create
   - App name: Alpha Network
   - User support email: o teu email
   - Developer contact: o teu email
   - Save and Continue (nas páginas seguintes podes deixar vazio)
4. Volta a "Credentials" → "+ Create Credentials" → "OAuth client ID"
5. Application type: **Web application**
6. Name: Alpha Network Dev
7. **Authorized JavaScript origins:**
   - http://localhost:3000
8. **Authorized redirect URIs:**
   - http://localhost:3001/api/v1/auth/google/callback
9. Clica Create

## 4. Copiar as credenciais

Aparece um popup com:
- Client ID → copia para GOOGLE_CLIENT_ID
- Client Secret → copia para GOOGLE_CLIENT_SECRET

## 5. Colocar no .env

No ficheiro apps/api/.env (ou apps/api/env):

```env
GOOGLE_CLIENT_ID="cole-aqui-o-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="cole-aqui-o-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/v1/auth/google/callback"
```

## 6. Em produção

Quando fizeres deploy, adiciona os URLs de produção nas listas do Google Cloud:
- Authorized JavaScript origins: https://teu-dominio.com
- Authorized redirect URIs: https://teu-api.com/api/v1/auth/google/callback

E actualiza o .env de produção com GOOGLE_CALLBACK_URL apontando para o URL real.

## Testar

1. `pnpm dev`
2. Vai a http://localhost:3000/auth/login
3. Clica no botão Google
4. Deves ser redirec ionado para a página de login do Google
5. Após autenticar, voltas para http://localhost:3000/main
