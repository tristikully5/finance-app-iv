import type { ReactNode } from "react";

type StandardDialogProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  icon?: ReactNode;
};

export default function StandardDialog({ title, children, onClose, footer, icon }: StandardDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 border-l-4 border-l-violet-600 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              {icon ?? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m14.5 5.5 4 4M13 7 5.5 14.5 4 20l5.5-1.5L17 11M15.5 4.5a2.12 2.12 0 0 1 3 3l-1 1-3-3 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-950">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-lg leading-none text-slate-400 transition hover:text-slate-700" aria-label="Close dialog">×</button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  );
}
