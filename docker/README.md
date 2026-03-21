# Infra local — Alpha Network

## Iniciar a base de dados e Redis

```bash
# Na raiz do projecto
docker-compose -f docker/docker-compose.yml up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f

# Parar
docker-compose -f docker/docker-compose.yml down
```

## Requisitos
- Docker Desktop (Mac/Windows) ou Docker Engine (Linux)
- Portas 5432 (PostgreSQL) e 6379 (Redis) livres

## Credenciais locais
- PostgreSQL: host=localhost, port=5432, user=alpha, pass=alpha_pass, db=alpha_network
- Redis: localhost:6379 (sem password em dev)
