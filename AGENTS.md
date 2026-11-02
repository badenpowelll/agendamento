# AGENTS.md — regras para alterar este projeto

1. **Isolamento multiempresa é obrigatório.** Código de negócio usa `forTenant(tenantId)` (`src/lib/tenant-db.ts`), nunca o `prisma` cru. O cliente cru só é usado em auth, worker, seed e testes. Toda tabela nova de negócio precisa de `tenantId` e entrar em `TENANT_MODELS`, com teste em `tests/integration/tenant-isolation.test.ts`.
2. **Nunca remover ou enfraquecer a restrição `appointment_no_overlap`.** Ela é a garantia final contra reserva duplicada. Mudanças de status que liberam agenda precisam ser refletidas no `WHERE` da restrição.
3. **Mudanças de estado de agendamento passam por `transitionAppointment`/`rescheduleAppointment`** (`src/domain/booking.ts`), que gravam histórico e ajustam a fila de mensagens. Nunca faça `update` de `status` direto.
4. **Mensagens saem pela fila (`OutboxMessage`)** com `dedupeKey` única. Nenhum envio direto a provedores fora de `src/domain/outbox.ts`. Respeite os consentimentos (`allowEmail`, `allowWhatsapp`, `allowMarketing`).
5. **Dinheiro em centavos (Int). Datas em UTC (`timestamptz`)**, exibidas no fuso do estabelecimento.
6. **Não inventar dados comerciais** (serviços, preços, endereço, fotos, depoimentos). Use campos editáveis no painel.
7. **Ações administrativas gravam auditoria** (`audit()` em `src/domain/audit.ts`).
8. **Não declarar pronto sem evidência:** rode `npm run typecheck && npm run lint && npm test` antes de abrir PR.
9. **Não publicar em produção sem autorização expressa do responsável.**
10. Textos de interface em português do Brasil.
