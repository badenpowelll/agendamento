# Arquitetura

## Visão geral

Monólito modular em **Next.js 15 (App Router) + TypeScript**, com **PostgreSQL** via **Prisma**, **Auth.js** (Google OIDC) e **Tailwind CSS**. Hospedagem prevista no **Railway**, deploy a partir do GitHub. Microsserviços não se justificam nesta escala.

```
Navegador (cliente / equipe)
   │
   ▼
Next.js (Railway)
 ├─ app/(site)        site público, agendamento, área da cliente
 ├─ app/admin         painel administrativo (RBAC)
 ├─ app/api           disponibilidade, cron da fila, Auth.js
 ├─ app/actions       server actions (validação com Zod)
 ├─ domain/           regras de negócio puras + serviços
 │   ├─ availability  cálculo de horários (função pura)
 │   ├─ booking       reserva, transição de estado, reagendamento
 │   ├─ messages      plano e renderização das mensagens
 │   └─ outbox        processamento da fila (SKIP LOCKED, backoff, DLQ)
 └─ lib/              tenant-db, auth context, tempo, dinheiro, provedores
   │
   ▼
PostgreSQL  ← restrição EXCLUDE impede reservas sobrepostas
   ▲
Worker / cron → E-mail (Resend) · WhatsApp Cloud API (quando aprovado)
```

## Decisões

| Decisão | Motivo |
| --- | --- |
| Conflito de agenda resolvido no banco (`EXCLUDE USING gist`) | Única forma de garantir a regra mesmo com requisições simultâneas e várias instâncias |
| Fila de mensagens no próprio PostgreSQL (outbox) | Sem custo extra de infraestrutura; enfileiramento na mesma transação da reserva |
| Mensagens renderizadas no momento do envio | Reagendamentos e cancelamentos nunca geram lembrete com dado velho |
| `tenantId` em todas as tabelas + extensão Prisma `forTenant` | Isolamento multiempresa desde o início, barato agora e caro depois |
| Sessões no banco (Auth.js `database`) | Revogação imediata de acesso |
| Escopo Google só `openid email profile` | Não pedir acesso ao Google Agenda para autenticar |
| Disponibilidade é calculada, não armazenada | Uma fonte de verdade: horários, bloqueios e reservas |

## Fuso horário

Datas são gravadas em UTC. Horários de trabalho são minutos locais por dia da semana e são convertidos usando o fuso do estabelecimento (`Tenant.timezone`, padrão `America/Fortaleza`).

## Multiempresa (SaaS)

Hoje o estabelecimento é resolvido por `DEFAULT_TENANT_SLUG`. Na Fase 5, a resolução passa a ser pelo domínio da requisição, sem mudar o restante do código.
