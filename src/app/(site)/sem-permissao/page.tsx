import { ButtonLink, Card } from "@/components/ui";
export default function Page() {
  return (
    <div className="mx-auto max-w-md py-12"><Card className="p-8 text-center"><h1 className="font-display text-2xl">Acesso restrito</h1><p className="mt-2 text-sm text-muted">Sua conta não tem permissão para acessar esta área.</p><ButtonLink href="/" className="mt-6">Voltar ao início</ButtonLink></Card></div>
  );
}
