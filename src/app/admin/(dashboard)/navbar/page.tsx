import type { NavbarContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { NavbarForm } from "@/components/admin/forms/NavbarForm";

export default async function Page() {
  const initial = await getSectionForAdmin<NavbarContent>("navbar");
  return <NavbarForm initial={initial} />;
}
