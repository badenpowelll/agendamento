import { requireStaff } from "@/lib/staff-session";
import { Card } from "@/components/ui";
import { StaffPasswordForm } from "@/components/forms/staff-password-form";

export const metadata = { title: "Trocar senha", robots: { index: false } };

export default async function StaffSenha() {
  const ctx = await requireStaff("STAFF", { allowMustChange: true });
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-8">
        <h1 className="font-display text-2xl">{ctx.staff.mustChangePassword ? "Crie sua senha" : "Trocar senha"}</h1>
        <p className="mt-1 text-sm text-muted">{ctx.staff.mustChangePassword ? `Olá, ${ctx.staff.name.split(" ")[0]}! No primeiro acesso, troque a senha provisória por uma só sua.` : ctx.staff.email}</p>
        <div className="mt-6"><StaffPasswordForm /></div>
      </Card>
    </main>
  );
}
