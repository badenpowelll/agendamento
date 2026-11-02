# Automações (Etapa 1)

## Mensagens

| Gatilho | Mensagem | Quando | Para |
| --- | --- | --- | --- |
| Reserva criada | `booking_confirmation` | Na hora | Cliente |
| Reserva criada | `admin_new_booking` | Na hora | `Tenant.notificationEmail` |
| 24h antes | `reminder_24h` (com link Confirmar/Reagendar) | `startAt − 24h`, se faltar ao menos 1h para isso | Cliente |
| Dia do atendimento | `reminder_day` (horário e localização) | 07:30 locais, se for ao menos 1h antes | Cliente |
| Cancelamento | `booking_cancelled` + `admin_cancelled` | Na hora | Cliente e administração |
| Sem resposta ao lembrete | Alerta no painel (Visão geral) | Contínuo | Equipe |

Regras:
- Canais: e-mail se `allowEmail`; WhatsApp só se `WHATSAPP_ENABLED`, `allowWhatsapp` **e** número verificado.
- A mensagem é montada no momento do envio. Se a reserva foi cancelada ou reagendada, lembretes viram `CANCELLED`.
- Se a cliente desligar um canal depois de agendar, os envios futuros por ele são pulados.
- O sistema não cancela por falta de resposta.

## Fila (`OutboxMessage`)

- Enfileirada na mesma transação da reserva, com `dedupeKey` única (sem duplicidade).
- `processOutbox` reserva lotes com `FOR UPDATE SKIP LOCKED` (vários workers sem envio duplo).
- Falha temporária: nova tentativa com espera de 2, 4, 8, 16 min. Após 5 tentativas ou erro definitivo: `DEAD` (fila de erros), visível em **Painel → Mensagens**, com botão "tentar de novo".
- Envio por e-mail usa `Idempotency-Key` = id da mensagem no Resend.
- Mensagens imediatas são disparadas logo após a ação (`after()`), e o cron cobre o restante.

## Execução

- `npm run worker` (loop a cada 30 s) **ou** cron chamando `POST /api/cron/outbox` a cada 5 min.

## WhatsApp (ativação)

1. Conta Meta Business verificada e número no WhatsApp Business Platform.
2. Criar e aprovar modelos de mensagem com os nomes `booking_confirmation`, `reminder_24h`, `reminder_day`, `booking_cancelled`, com variáveis {{1}} nome, {{2}} serviço, {{3}} data e hora, {{4}} link.
3. Definir `WHATSAPP_ENABLED=true`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
4. Verificação do número da cliente: hoje manual no painel (Clientes → "Confirmei o número"); verificação por código entra com a ativação.

## Etapa 3

A Central de Automações (gatilhos configuráveis, n8n, pós-atendimento, retorno, lista de espera) reaproveita esta fila.
