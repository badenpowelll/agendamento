import { requireUser } from "@/lib/context";
import { formatPhoneBR } from "@/lib/phone";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/forms/profile-form";

export const metadata = { title: "Cadastro" };

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const ctx = await requireUser("/cadastro");
  const c = ctx.customer;
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="p-6 sm:p-8">
        <h1 className="font-display text-3xl">Complete seu cadastro</h1>
        <p className="mt-2 text-sm text-muted">Só pedimos o necessário para confirmar e lembrar você dos seus horários.</p>
        <div className="mt-6">
          <ProfileForm
            callbackUrl={callbackUrl ?? "/minha-conta"}
            initial={{
              name: c?.name ?? ctx.user.name ?? "",
              phone: formatPhoneBR(c?.phone),
              email: ctx.user.email ?? "",
              allowEmail: c?.allowEmail ?? true,
              allowWhatsapp: c?.allowWhatsapp ?? true,
              allowMarketing: c?.allowMarketing ?? false,
              complete: !!c?.profileComplete,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
