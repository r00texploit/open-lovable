"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Globe, Server, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/sites", label: "Sites", icon: Globe },
  { href: "/admin/sandboxes", label: "Sandboxes", icon: Server },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-heat-8 text-heat-100"
                : "text-foreground-dimmer hover:bg-background-base hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-heat-100" : "text-foreground-dimmer group-hover:text-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}