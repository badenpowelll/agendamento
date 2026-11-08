import { requireStaff } from "@/lib/staff-session";
import { getSite } from "@/lib/site";
import { formatPhoneBR } from "@/lib/phone";
import { saveSiteContent } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { Card, Field, Input, PageTitle, Textarea } from "@/components/ui";
import { CepField } from "@/components/cep-field";

export default async function SiteEditor() {
  await requireStaff("ADMIN");
  const s = await getSite();
  return (
    <div className="space-y-6">
      <PageTitle title="Conteúdo do site" subtitle="Tudo o que aparece no site público. Campos vazios não são exibidos." />
      <AdminForm action={saveSiteContent} submit="Salvar site" className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Marca</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome exibido"><Input name="displayName" defaultValue={s.brand.displayName} /></Field>
            <Field label="Cor principal"><Input name="primaryColor" type="color" defaultValue={s.brand.primaryColor} className="h-11 p-1" /></Field>
          </div>
          <Field label="Frase de apresentação"><Input name="tagline" defaultValue={s.brand.tagline} /></Field>
          <Field label="Endereço da logo (https://…)"><Input name="logoUrl" defaultValue={s.brand.logoUrl} /></Field>
            <Field label="Marca d’água (foto ao fundo das páginas)" hint="https://… ou /marca/arquivo.jpg. Deixe vazio para não usar."><Input name="watermarkUrl" defaultValue={s.brand.watermarkUrl} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Sobre</h2>
          <Field label="Título"><Input name="aboutTitle" defaultValue={s.about.title} /></Field>
          <Field label="Texto"><Textarea name="aboutText" defaultValue={s.about.text} rows={5} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Contato e localização</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp"><Input name="whatsapp" defaultValue={formatPhoneBR(s.contact.whatsapp)} inputMode="tel" /></Field>
            <Field label="Mensagem pronta do WhatsApp"><Input name="whatsappMessage" defaultValue={s.contact.whatsappMessage} maxLength={200} /></Field>
            <Field label="E-mail"><Input name="email" type="email" defaultValue={s.contact.email} /></Field>
            <Field label="Instagram (link)"><Input name="instagram" defaultValue={s.contact.instagram} /></Field>
            <Field label="Link do Google Maps"><Input name="mapsUrl" defaultValue={s.contact.mapsUrl} /></Field>
            <Field label="Link para avaliar no Google" hint="Perfil da clínica no Google. Vazio = sem botão de avaliação."><Input name="reviewUrl" defaultValue={s.contact.reviewUrl} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Buscar pelo CEP" hint="Preenche o endereço abaixo."><CepField name="cepLookup" compose="address" /></Field>
            <div className="sm:col-span-3"><Field label="Endereço completo" hint="Confira e inclua o número."><Input name="address" defaultValue={s.contact.address} /></Field></div>
          </div>
          <Field label="Horário de funcionamento (texto exibido no site)"><Textarea name="hoursText" defaultValue={s.contact.hoursText} rows={3} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Galeria, avaliações e perguntas</h2>
          <Field label="Galeria" hint="Uma foto por linha: https://link-da-foto | descrição"><Textarea name="gallery" rows={4} defaultValue={s.gallery.map((g) => `${g.url} | ${g.alt}`).join("\n")} /></Field>
          <Field label="Avaliações" hint="Uma por linha: Nome | texto da avaliação"><Textarea name="testimonials" rows={4} defaultValue={s.testimonials.map((t) => `${t.author} | ${t.text}`).join("\n")} /></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="mediaAuthorized" className="mt-0.5 accent-brand" defaultChecked={s.gallery.concat().every((g) => g.authorized) && s.testimonials.every((t) => t.authorized) && (s.gallery.length + s.testimonials.length > 0)} /> Confirmo que tenho autorização das pessoas para publicar estas fotos e avaliações. Sem esta confirmação, elas não aparecem no site.</label>
          <Field label="Perguntas frequentes" hint="Pergunta na primeira linha, resposta nas seguintes. Separe cada pergunta com uma linha contendo ---"><Textarea name="faq" rows={8} defaultValue={s.faq.map((f) => `${f.q}\n${f.a}`).join("\n---\n")} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Pagamento do sinal</h2>
          <p className="text-xs text-muted">Com percentual acima de 0 e chave Pix preenchida, as reservas do site ficam &quot;Aguardando sinal&quot; até a equipe marcar &quot;Confirmar (sinal recebido)&quot; na agenda. Deixe 0 para confirmar na hora.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Chave Pix"><Input name="pixKey" defaultValue={s.payment.pixKey} maxLength={120} /></Field>
            <Field label="Nome do recebedor (como aparece no banco)"><Input name="pixName" defaultValue={s.payment.pixName} maxLength={120} /></Field>
            <Field label="Sinal (% do valor)"><Input name="depositPercent" type="number" min={0} max={100} defaultValue={s.payment.depositPercent} /></Field>
            <Field label="Prazo para pagar (horas)"><Input name="depositHours" type="number" min={1} max={168} defaultValue={s.payment.depositHours} /></Field>
          </div>
          <Field label="Formas de pagamento"><Input name="paymentMethods" defaultValue={s.payment.methods} maxLength={300} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg">Políticas</h2>
          <p className="text-xs text-muted">Versão atual: {s.policies.version}. Ao mudar a privacidade ou os termos, a versão aumenta e os novos aceites ficam registrados com ela. Revise os textos com um profissional jurídico.</p>
          <Field label="Política de cancelamento, atraso e falta"><Textarea name="cancellation" rows={4} defaultValue={s.policies.cancellation} /></Field>
          <Field label="Política de privacidade"><Textarea name="privacy" rows={8} defaultValue={s.policies.privacy} /></Field>
          <Field label="Termos e condições"><Textarea name="terms" rows={8} defaultValue={s.policies.terms} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social"><Input name="companyName" defaultValue={s.legal.companyName} /></Field>
            <Field label="CNPJ"><Input name="document" defaultValue={s.legal.document} /></Field>
          </div>
        </Card>
      </AdminForm>
    </div>
  );
}
