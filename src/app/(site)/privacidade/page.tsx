import { getSite } from "@/lib/site";
import { PolicyPage } from "@/components/policy-page";
export const metadata = { title: "Política de privacidade" };
export default async function Page() {
  const site = await getSite();
  return <PolicyPage title="Política de privacidade" text={site.policies.privacy} />;
}
