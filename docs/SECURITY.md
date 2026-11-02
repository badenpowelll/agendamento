# Segurança e LGPD

## Controles implementados

| Área | Controle |
| --- | --- |
| Autenticação | Google OIDC via Auth.js; escopos `openid email profile`; sessões no banco (revogáveis), cookie httpOnly/secure |
| Autorização | RBAC por estabelecimento (OWNER, ADMIN, STAFF, CLIENT) verificado no servidor em toda página e ação |
| Multiempresa | `forTenant()` injeta `tenantId` em leituras, escritas e criações; impede mover registros entre estabelecimentos; testes dedicados |
| Integridade | Restrição de exclusão no PostgreSQL, idempotência, atualização condicional de status |
| Entrada | Validação com Zod em todas as ações; HTML de e-mail escapado; URLs de imagens só `https://` |
| Abuso | Limite de requisições em disponibilidade (120/min/IP), reserva (10/min/usuária, 30/min/IP) e links de ação |
| Links por mensagem | Token HMAC-SHA256 com expiração (até 24h após o horário), comparação em tempo constante |
| Cabeçalhos | HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| Segredos | Somente em variáveis de ambiente do servidor; `.env` fora do Git |
| Auditoria | `AuditLog` para ações administrativas; `AppointmentEvent` para cada mudança de status |
| Cron | `POST /api/cron/outbox` exige `CRON_SECRET` |
| Pagamentos | Nenhum dado de cartão é armazenado (PDV na Etapa 2 usará gateway) |

## LGPD

- **Minimização:** nome, e-mail, WhatsApp e preferências. Data de nascimento é opcional e ainda não é pedida.
- **Base legal e consentimento:** aceite de termos e privacidade versionado; consentimentos separados para avisos por e-mail, WhatsApp e promoções, com histórico (`Consent`).
- **Descadastro:** toda mensagem aponta para `/minha-conta`, onde a cliente desliga cada canal.
- **Acesso e portabilidade:** botão "Baixar meus dados" em `/minha-conta`.
- **Eliminação:** pedido pelo WhatsApp do estabelecimento; a equipe remove o cadastro. (Automatizar na Etapa 3.)
- **Dados sensíveis de saúde:** não coletados. A assistente de IA (Etapa 4) não dará orientação clínica.
- **Retenção sugerida:** agendamentos e auditoria por 5 anos; mensagens enviadas por 12 meses. Política deve ser confirmada pela Milly e por assessoria jurídica.

## Pendências conhecidas

- Limite de requisições em memória: ao rodar mais de uma instância, migrar para armazenamento compartilhado.
- CSP (Content-Security-Policy) a definir quando as origens de imagens forem conhecidas.
- Verificação do WhatsApp por código: depende da aprovação da conta oficial.

## Reportar vulnerabilidades

Escreva para o responsável técnico do projeto (Argos) em vez de abrir issue pública.
