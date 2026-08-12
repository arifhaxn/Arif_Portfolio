import { redirect } from "next/navigation";

// /admin → first section. (Guarded by the (dashboard) layout.)
export default function AdminIndex() {
  redirect("/admin/hero");
}
