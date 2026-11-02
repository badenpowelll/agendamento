/** Leitura centralizada de variáveis de ambiente (somente no servidor). */
export const env = {
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get defaultTenantSlug() {
    return process.env.DEFAULT_TENANT_SLUG ?? "milly-rodrigues";
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  },
  get secret() {
    const s = process.env.AUTH_SECRET;
    if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET não configurado");
    return s ?? "dev-secret-nao-usar-em-producao";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get emailProvider(): "resend" | "console" {
    return process.env.EMAIL_PROVIDER === "resend" ? "resend" : "console";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Milly Rodrigues <nao-responda@example.com>";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get whatsappEnabled() {
    return process.env.WHATSAPP_ENABLED === "true";
  },
  get whatsappToken() {
    return process.env.WHATSAPP_TOKEN ?? "";
  },
  get whatsappPhoneNumberId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  },
  get whatsappTemplateLang() {
    return process.env.WHATSAPP_TEMPLATE_LANG ?? "pt_BR";
  },
};
