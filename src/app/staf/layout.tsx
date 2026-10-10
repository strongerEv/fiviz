import type { Metadata } from "next";
import { StaffShell } from "@/components/StaffShell";

export const metadata: Metadata = { title: "Panel Staf", robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
