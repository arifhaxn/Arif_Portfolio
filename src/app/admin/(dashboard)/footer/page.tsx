import type { FooterContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { FooterForm } from "@/components/admin/forms/FooterForm";

export default async function Page() {
  const initial = await getSectionForAdmin<FooterContent>("footer");
  return <FooterForm initial={initial} />;
}
