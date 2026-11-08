# API

## Rotas HTTP

| Método e rota | Acesso | Descrição |
| --- | --- | --- |
| `GET /api/availability?serviceId&date=YYYY-MM-DD[&professionalId][&ignore]` | Público (limite de 120/min por IP) | Horários livres. Resposta: `{ timezone, slots: [{ startAt, label, professionalIds, available }], holiday }` (`holiday` = nome do feriado nacional quando a agenda online está fechada no dia) |
| `GET /api/cep/{cep}` | Público (limite de 30/min por IP) | Endereço do CEP pela BrasilAPI (`/api/cep/v2`). Resposta: `{ cep, street, neighborhood, city, state }`; 404 CEP inexistente; 503 BrasilAPI fora do ar |
| `POST /api/cron/outbox` | `Authorization: Bearer $CRON_SECRET` | Processa a fila de mensagens. Resposta: `{ claimed, sent, skipped, failed, dead }` |
| `GET/POST /api/auth/*` | Auth.js | Login Google |

## Ações de servidor (server actions)

Todas validam entrada com Zod e verificam sessão e papel no servidor.

| Ação | Quem | Arquivo |
| --- | --- | --- |
| `bookAction` | Cliente logada com cadastro completo (10/min) | `src/app/actions/booking.ts` |
| `customerAction` (reconfirmar, cancelar) | Dona da reserva | idem |
| `tokenAction` | Link assinado enviado por mensagem | idem |
| `saveProfile`, `exportMyData` | Cliente | `src/app/actions/customer.ts` |
| `saveService`, `saveProfessional`, `saveSiteContent` | ADMIN+ | `src/app/actions/admin.ts` |
| `staffBook`, `staffTransition`, `createTimeOff`, `deleteTimeOff`, `markPhoneVerified` | STAFF+ | idem |
| `saveSettings`, `setMemberRole` | OWNER | idem |
| `retryMessage` | ADMIN+ | idem |

## Erros de negócio

`DomainError(code, message)` com mensagem pronta para a usuária. `SLOT_UNAVAILABLE` indica que o horário foi tomado; a tela recarrega os horários.

## Serviços externos

- **Feriados nacionais**: BrasilAPI `GET /api/feriados/v1/{ano}`, guardado em memória por 24 h por ano. Se a API falhar, usa o calendário calculado (datas fixas + Páscoa) e tenta de novo em 10 min. A regra fica no conteúdo do site (`holidays.closeNational`, `holidays.openDates`) e é editada em Painel > Agenda.
- **CEP**: BrasilAPI `GET /api/cep/v2/{cep}`, em cache por 7 dias. Só rua, bairro, cidade e UF são usados; coordenadas são descartadas.
