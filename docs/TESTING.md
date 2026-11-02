# Testes

```bash
# banco de teste local (o nome precisa conter "test")
createdb milly_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/milly_test npm test
```

O setup aplica as migrations (`prisma migrate deploy`) e cada teste limpa as tabelas. Os scripts se recusam a rodar em um banco cujo nome não contenha `test`.

## Cobertura atual (38 testes)

| Arquivo | O que prova |
| --- | --- |
| `tests/unit/availability.test.ts` | Horários respeitam duração, preparo, antecedência, pausas e bloqueios |
| `tests/unit/state.test.ts` | Transições permitidas por cliente, equipe e sistema |
| `tests/unit/messages.test.ts` | Quais mensagens e quando; consentimento; escape de HTML; tokens assinados |
| `tests/integration/booking.test.ts` | **20 reservas simultâneas no mesmo horário → só 1 aceita**; sobreposição parcial; idempotência em paralelo; distribuição entre profissionais; cancelamento libera vaga; política de antecedência; reagendamento atômico; transições concorrentes |
| `tests/integration/tenant-isolation.test.ts` | Leitura, alteração, exclusão e criação isoladas por estabelecimento |
| `tests/integration/outbox.test.ts` | Envio na hora certa; 3 workers em paralelo sem duplicar; nova tentativa com espera; fila de erros; lembrete de reserva cancelada não sai; preferência de canal respeitada |

## Verificação manual (E2E)

Fluxo verificado no navegador (Playwright) em 02/11/2026: agendar como visitante → cadastro → confirmação → Minha conta; painel com agenda, mensagens e demais páginas; cliente sem acesso ao `/admin`.

## Próximos

- E2E automatizados com Playwright no CI.
- Testes de backup e restauração.
