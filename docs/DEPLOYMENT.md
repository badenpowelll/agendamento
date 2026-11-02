# Deploy (Railway)

> Não publicar em produção sem autorização expressa do responsável pelo projeto.

## 1. Google OAuth

1. Google Cloud Console → APIs e serviços → Tela de consentimento OAuth: tipo **Externo**, escopos `openid`, `email`, `profile`.
2. Credenciais → Criar ID do cliente OAuth → **Aplicativo da Web**.
3. URI de redirecionamento autorizado: `https://SEU-DOMINIO/api/auth/callback/google` (e o domínio `*.up.railway.app` para homologação).
4. Copie o ID e o segredo para `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`.

## 2. Railway

1. Novo projeto → **Deploy from GitHub repo** → `milly-rodrigues-360`.
2. Adicione **PostgreSQL** ao projeto. Em Variables do app, `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
3. Variáveis do app (ver `.env.example`): `APP_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`, `CRON_SECRET`, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. O `railway.json` já define: build `npm ci && npm run build`, start `npm run railway:start` (aplica migrations, garante o estabelecimento e sobe o Next.js).
5. **Fila de mensagens** (escolha uma):
   - Serviço *Cron* no Railway, mesmo repositório, schedule `*/5 * * * *`, comando `npm run worker -- --once`, com as mesmas variáveis; ou
   - Serviço *worker* contínuo com `npm run worker`.
6. Domínio: Settings → Networking → Custom Domain; ajuste `APP_URL` e o redirecionamento no Google.

## 3. E-mail (Resend)

Verifique o domínio (registros SPF/DKIM no DNS) e use um remetente desse domínio em `EMAIL_FROM`.

## 4. Homologação antes de produção

- [ ] Login Google com a conta da Milly (vira OWNER via `ADMIN_EMAILS`)
- [ ] Serviços, profissionais e horários cadastrados com dados reais
- [ ] Endereço, WhatsApp, políticas e e-mail de avisos preenchidos
- [ ] Agendamento de teste recebido por e-mail; lembrete aparece em Mensagens
- [ ] Cancelamento libera o horário
- [ ] `npm test` verde no CI

## 5. Backup e restauração

- Ative backups no serviço PostgreSQL do Railway.
- Teste trimestral: restaure o backup em um banco novo, aponte uma cópia do app para ele, confira agendamentos e clientes, e registre a data do teste.
- Exportação manual: `pg_dump "$DATABASE_URL" -Fc -f backup.dump`.

## 6. Atualizações

Cada merge na branch principal dispara deploy. Migrations rodam no start (`prisma migrate deploy`), então mudanças de banco precisam ser compatíveis com a versão anterior durante o deploy.
