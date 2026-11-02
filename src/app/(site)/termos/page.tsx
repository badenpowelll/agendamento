import { getSite } from "@/lib/site";
import { PolicyPage } from "@/components/policy-page";
export const metadata = { title: "Termos e condições" };
export default async function Page() {
  const site = await getSite();
  const text = [site.policies.terms, site.policies.cancellation && `Política de cancelamento\n\n${site.policies.cancellation}`].filter(Boolean).join("\n\n");
  return <PolicyPage title="Termos e condições" text={text} />;
}
