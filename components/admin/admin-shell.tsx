"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { NoeronLogo } from "@/components/brand/noeron-logo";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Toaster } from "@/components/ui/shadcn/toast";

/**
 * Client shell for the admin area. Rendered by app/admin/layout.tsx after the
 * server-side role guard passes. Mounts the sonner Toaster so action islands
 * can surface success/error toasts.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-base">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background-lighter/80 backdrop-blur-xl border-b border-border-faint">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <NoeronLogo iconClassName="h-7 w-7" textClassName="text-foreground font-semibold" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-heat-8 px-2.5 py-1 text-xs font-semibold text-heat-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sites" className="btn btn-ghost text-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to app</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border-faint md:bg-background-lighter md:sticky md:top-16 md:h-[calc(100vh-4rem)]">
          <div className="p-4">
            <AdminSidebar />
          </div>
        </aside>

        {/* Mobile nav (horizontal scroll) */}
        <div className="md:hidden border-b border-border-faint bg-background-lighter">
          <div className="px-4 py-3 overflow-x-auto">
            <AdminSidebar />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}