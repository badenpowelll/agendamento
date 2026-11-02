# Banco de dados

Esquema completo em `prisma/schema.prisma`. Migrations em `prisma/migrations/`.

## Convenções

- Toda tabela de negócio tem `tenantId`.
- Dinheiro em centavos (`Int`). Datas em `timestamptz` (UTC).
- Horário de trabalho em minutos desde 00:00 local (`WorkingHours.startMin/endMin`, `weekday` 0 = domingo).

## Tabelas da Etapa 1

| Tabela | Função |
| --- | --- |
| Tenant | Estabelecimento e políticas de agenda (antecedência, grade, janela de dias, e-mail de avisos) |
| User, Account, Session, VerificationToken | Auth.js |
| Membership | Papel do usuário no estabelecimento: OWNER, ADMIN, STAFF, CLIENT |
| Customer | Cadastro da cliente e preferências de comunicação |
| Consent | Histórico de aceites (tipo, versão, origem, data) |
| Professional, ProfessionalService, WorkingHours | Quem atende, o quê e quando |
| TimeOff | Bloqueios (por profissional ou do estabelecimento inteiro) |
| Service | Nome, preço, duração, preparo |
| Appointment | Reserva com `startAt`, `endAt`, `blockEndAt` (fim + preparo), status, preço e nome congelados |
| AppointmentEvent | Histórico de mudanças de estado |
| SiteContent | Conteúdo editável do site (JSON validado por Zod) |
| OutboxMessage | Fila de mensagens |
| AuditLog | Auditoria de ações administrativas |

## Regras de integridade (SQL na migration `init`)

```sql
-- Nenhuma sobreposição para a mesma profissional, exceto reservas canceladas/reagendadas
ALTER TABLE "Appointment" ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist ("professionalId" WITH =, tstzrange("startAt", "blockEndAt", '[)') WITH &&)
  WHERE (status NOT IN ('CANCELLED', 'RESCHEDULED'));
```

Além disso: `UNIQUE (tenantId, idempotencyKey)` em Appointment, `UNIQUE (tenantId, dedupeKey)` em OutboxMessage e `CHECK`s de faixas válidas.

## Estados do agendamento

PENDING → CONFIRMED → RECONFIRMED → CHECKED_IN → IN_SERVICE → COMPLETED, com saídas para CANCELLED, NO_SHOW e RESCHEDULED. Transições permitidas por ator em `src/domain/appointment-state.ts`. O sistema nunca cancela nem marca falta sozinho.

## Backups

No Railway, ative backups do PostgreSQL. Teste de restauração descrito em [DEPLOYMENT.md](DEPLOYMENT.md).
