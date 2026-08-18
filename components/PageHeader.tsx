import Link from "next/link";
import HistoryNavigation from "@/components/HistoryNavigation";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
};

export default function PageHeader({ breadcrumbs, title, description, actions, leading }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-3">
        <HistoryNavigation />
        <span aria-hidden="true" className="h-4 border-l border-slate-200" />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        {breadcrumbs.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="text-slate-300">›</span> : null}
            {item.href && index < breadcrumbs.length - 1 ? (
              <Link href={item.href} className="transition hover:text-slate-900">{item.label}</Link>
            ) : (
              <span className={index === breadcrumbs.length - 1 ? "font-semibold text-slate-900" : ""}>{item.label}</span>
            )}
          </span>
        ))}
        </nav>
      </div>

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {leading ? <div className="shrink-0">{leading}</div> : null}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
              {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
