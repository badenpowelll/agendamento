# Milly Rodrigues 360°

Plataforma de agendamento online, CRM e gestão para **Milly Rodrigues — Depilação e Estética**, preparada para virar SaaS multiempresa (Argos).

Esta é a **Etapa 1 (MVP operacional)**: site público, login Google, cadastro com consentimentos, serviços, agenda sem conflitos, painel administrativo, confirmações e lembretes automáticos.

## Começando

Requisitos: Node 20.18+, PostgreSQL 14+ com a extensão `btree_gist` (vem no PostgreSQL padrão e no Railway).

```bash
cp .env.example .env        # preencha DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, ADMIN_EMAILS
npm install
npm run db:migrate          # aplica as migrations
npm run db:seed             # cria o estabelecimento (sem dados comerciais)
npm run db:seed:demo        # opcional, só local: serviços e profissional de DEMONSTRAÇÃO
npm run dev                 # http://localhost:3000
npm run worker              # em outro terminal: envia confirmações e lembretes
```

Entre com uma conta Google listada em `ADMIN_EMAILS` para acessar `/admin`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm test` | Testes unitários e de integração (precisa de `TEST_DATABASE_URL`) |
| `npm run typecheck` / `npm run lint` | Verificações estáticas |
| `npm run worker` | Worker da fila de mensagens (`-- --once` para uma rodada) |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Cria o estabelecimento padrão |

## Documentação

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): visão geral, módulos e decisões
- [DATABASE.md](docs/DATABASE.md): modelo de dados e regras de integridade
- [API.md](docs/API.md): rotas HTTP e ações de servidor
- [AUTOMATIONS.md](docs/AUTOMATIONS.md): mensagens automáticas e fila
- [SECURITY.md](docs/SECURITY.md): segurança e LGPD
- [DEPLOYMENT.md](docs/DEPLOYMENT.md): deploy no Railway
- [TESTING.md](docs/TESTING.md): estratégia de testes
- [USER_MANUAL.md](docs/USER_MANUAL.md): manual da Milly e da equipe
- [AGENTS.md](AGENTS.md): regras para quem (pessoa ou IA) for alterar o código

## Roteiro

1. **Agendamento funcionando** (esta entrega)
2. Controlar o dinheiro: PDV (após auditoria do PDV Atech), caixa, contas a pagar e receber, estoque, rentabilidade
3. Reduzir trabalho manual: n8n, WhatsApp, pós-atendimento, lista de espera, Central de Automações
4. Aumentar o faturamento: inteligência de receita, fidelização, assistente IA
5. Preparação SaaS: planos, assinaturas, painel da plataforma
