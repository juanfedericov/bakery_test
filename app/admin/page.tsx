import type { Metadata } from "next";
import ScheduleManager from "@/components/admin/ScheduleManager";

export const metadata: Metadata = {
  title: "Administrar horarios",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <ScheduleManager />;
}
