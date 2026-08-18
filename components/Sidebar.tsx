"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationIconName = "overview" | "accounts" | "transactions" | "categories" | "budgets" | "goals" | "reports" | "settings";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIconName;
};

const primaryNavigation: NavigationItem[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/categories", label: "Categories", icon: "categories" },
  { href: "/budgets", label: "Budgets", icon: "budgets" },
  { href: "/goals", label: "Goals", icon: "goals" },
  { href: "/reports", label: "Reports", icon: "reports" },
];

function NavigationIcon({ name }: { name: NavigationIconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      {name === "overview" ? <><rect x="4" y="4" width="6" height="7" rx="1" /><rect x="14" y="4" width="6" height="7" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></> : null}
      {name === "accounts" ? <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M7 6V4h10v2M3 10h18M7 14h3" /></> : null}
      {name === "transactions" ? <><path d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4" /></> : null}
      {name === "categories" ? <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /><path d="M10 7h4M7 10v4M17 10v4M10 17h4" /></> : null}
      {name === "budgets" ? <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></> : null}
      {name === "goals" ? <><path d="M12 20s7-3.7 7-9.4A7 7 0 0 0 5 10.6C5 16.3 12 20 12 20Z" /><path d="m9 12 2 2 4-4" /></> : null}
      {name === "reports" ? <><path d="M5 20V10M12 20V4M19 20v-7M3 20h18" /></> : null}
      {name === "settings" ? <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3" /></> : null}
    </svg>
  );
}

function SidebarLink({ item, active }: { item: NavigationItem; active: boolean }) {
  return (
    <Link href={item.href} className={`group flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-600" : "text-slate-800 hover:bg-slate-50"}`}>
      <NavigationIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-6">
      <div className="mb-8 px-4">
        <h1 className="text-lg font-bold tracking-tight text-slate-950">Finance App</h1>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Primary navigation">
        {primaryNavigation.map((item) => <SidebarLink key={item.href} item={item} active={pathname === item.href || (item.href === "/accounts" && pathname.startsWith("/accounts/"))} />)}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4">
        <SidebarLink item={{ href: "/settings", label: "Settings", icon: "settings" }} active={pathname === "/settings"} />
      </div>
    </aside>
  );
}
