import { redirect } from "next/navigation";
import { getStaff } from "@/lib/staff-session";
import { getSite } from "@/lib/site";
import { Card } from "@/components/ui";
import { StaffLoginForm } from "@/components/forms/staff-login-form";

export const metadata = { title: "Entrar no painel", robots: { index: false } };

export default async function StaffEntrar() {
  if (await getStaff()) redirect("/admin");
  const site = await getSite();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-8">
        {site.brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.brand.logoUrl} alt={site.brand.displayName} className="mx-auto w-56" />
        ) : (
          <p className="text-center font-display text-2xl">{site.brand.displayName}</p>
        )}
        <h1 className="mt-1 text-center text-sm text-muted">Painel da equipe</h1>
        <div className="mt-6"><StaffLoginForm /></div>
        <p className="mt-6 text-center text-xs text-muted">Esqueceu a senha? Peça à gestora para redefinir.</p>
      </Card>
    </main>
  );
}
