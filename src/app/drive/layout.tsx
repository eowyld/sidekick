import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DriveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#101010] text-[#F5F5F5]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 bg-[#101010] p-4 text-[#F5F5F5] md:p-6">{children}</main>
      </div>
    </div>
  );
}
