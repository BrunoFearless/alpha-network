# Git Workflow — Alpha Network

## Regra principal
**Nunca fazer push directo para `main`.** Todo o trabalho passa por um branch próprio e um Pull Request.

---

## Fluxo de trabalho diário

### 1. Antes de começar — actualizar o main local
```bash
git checkout main
git pull origin main
```

### 2. Criar um branch para a tua tarefa
O nome do branch deve seguir este padrão:

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Nova funcionalidade | `feat/descricao` | `feat/auth-register` |
| Correcção de bug | `fix/descricao` | `fix/login-token-expiry` |
| Design / estilos | `design/descricao` | `design/lazer-feed-card` |
| Configuração | `chore/descricao` | `chore/setup-prisma` |

```bash
git checkout -b feat/auth-register
```

### 3. Fazer commits com mensagens claras
```bash
git add .
git commit -m "feat: adicionar endpoint POST /auth/register"
```

**Formato de commit:**
```
tipo: descrição curta em minúsculas

Tipos válidos: feat, fix, design, chore, docs, refactor
```

### 4. Fazer push do branch
```bash
git push origin feat/auth-register
```

### 5. Abrir o Pull Request
1. Vai a https://github.com/BrunoFearless/alpha-network
2. Aparece automaticamente o botão **"Compare & pull request"**
3. Preenche o template (title, descrição, issue relacionada)
4. Atribui um **reviewer** (normalmente o Bruno)
5. Clica **"Create pull request"**

---

## Convenções de commits

```bash
# ✅ Bom
git commit -m "feat: criar schema Prisma para User e Session"
git commit -m "fix: corrigir erro 422 no registo com email duplicado"
git commit -m "design: adicionar animação ao botão de submit"

# ❌ Mau
git commit -m "update"
git commit -m "fix bug"
git commit -m "WIP"
```

---

## Referências úteis

- Issues: https://github.com/BrunoFearless/alpha-network/issues
- Pull Requests: https://github.com/BrunoFearless/alpha-network/pulls
- Cada issue tem o número `#XX` — usa `Closes #XX` no PR para fechar automaticamente

---

## Comandos rápidos de referência

```bash
# Ver em que branch estás
git branch

# Ver o estado dos ficheiros
git status

# Ver histórico de commits
git log --oneline

# Voltar ao main
git checkout main

# Actualizar o teu branch com o main mais recente
git checkout feat/meu-branch
git rebase main
```
