# Expor API NestJS para Testes Externos (Redes Diferentes)

## Objetivo

Permitir que a API NestJS seja acessada por dispositivos fora da rede local, incluindo:

* Telemóveis usando dados móveis.
* Computadores em outra rede.
* Testadores remotos.
* Ambientes externos de desenvolvimento.

---

## Estratégia

Utilizar um túnel público para expor temporariamente a API local na internet.

Opções aceitáveis:

1. Cloudflare Tunnel (preferencial).
2. Ngrok.
3. LocalTunnel.

Dar preferência ao Cloudflare Tunnel por estabilidade e ausência de limites agressivos.

---

## Passo 1 - Garantir que a API funciona localmente

Entrar na pasta:

```bash
cd apps/api
```

Executar:

```bash
pnpm dev
```

ou

```bash
npm run start:dev
```

Confirmar que a API responde localmente.

Exemplo:

```text
http://localhost:3001
```

---

## Passo 2 - Configurar NestJS

Verificar em:

```ts
apps/api/src/main.ts
```

Configuração mínima:

```ts
app.enableCors({
  origin: true,
  credentials: true,
});

await app.listen(PORT, "0.0.0.0");
```

---

## Passo 3 - Criar túnel público


### Opção - Ngrok

Instalar:

```bash
npm install -g ngrok
```

Executar:

```bash
ngrok http 3001
```

Obter URL semelhante a:

```text
https://abc123.ngrok-free.app
```

---

## Passo 4 - Atualizar frontend

Localizar:

```env
NEXT_PUBLIC_API_URL=
```

ou qualquer configuração de API.

Substituir:

```text
http://localhost:3001
```

por:

```text
https://URL_PUBLICA_DO_TUNEL
```

Exemplo:

```env
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

---

## Passo 5 - Reiniciar frontend

Entrar em:

```bash
cd apps/web
```

Executar:

```bash
pnpm dev
```

---

## Passo 6 - Validar login

Abrir o sistema:

1. No computador.
2. No telemóvel usando dados móveis.
3. Em outra rede.

Executar login.

Verificar:

* resposta HTTP;
* autenticação;
* armazenamento de token;
* ausência de erros "Load Failed";
* ausência de erros CORS.

---

## Passo 7 - Diagnóstico automático

Caso o login falhe:

Verificar:

1. URL efetivamente usada pelo frontend.
2. Resposta da API.
3. Status HTTP retornado.
4. Logs do NestJS.
5. Erros de CORS.
6. Erros de DNS.
7. Erros de SSL/TLS.

Produzir relatório indicando a causa exata da falha.

---

## Critério de sucesso

O teste será considerado concluído quando:

* A API responder por URL pública HTTPS.
* O login funcionar usando dados móveis.
* O login funcionar em redes externas.
* Não existir dependência de IP local ou localhost.
