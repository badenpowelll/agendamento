import "server-only";
import { cache } from "react";
import { forTenant } from "./tenant-db";
import { parseSiteContent } from "./site-content";
import { getTenant } from "./context";

export const getSite = cache(async () => {
  const tenant = await getTenant();
  const row = await forTenant(tenant.id).siteContent.findFirst();
  return parseSiteContent(row?.data);
});

export const whatsappLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
