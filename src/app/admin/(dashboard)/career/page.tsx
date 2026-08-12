import type { CareerContent } from "@/lib/content-types";
import { getSectionForAdmin } from "@/lib/content-admin";
import { CareerForm } from "@/components/admin/forms/CareerForm";

export default async function Page() {
  const initial = await getSectionForAdmin<CareerContent>("career");
  return <CareerForm initial={initial} />;
}
