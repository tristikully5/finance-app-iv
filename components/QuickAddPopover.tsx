"use client";

import { useEffect, useRef, useState } from "react";

type QuickAddPopoverProps = {
  title: string;
  children: React.ReactNode;
  buttonClassName?: string;
  buttonContent?: React.ReactNode;
  wrapperClassName?: string;
};

export default function QuickAddPopover({ title, children, buttonClassName, buttonContent, wrapperClassName }: QuickAddPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-icon-picker-menu]")) {
        return;
      }

      if (panelRef.current && !panelRef.current.contains(target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={wrapperClassName ?? "relative"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClassName ?? "flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-2xl shadow-sm transition hover:border-gray-300 hover:shadow-md"}
        aria-label={`Add ${title}`}
      >
        {buttonContent ?? "+"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-[1px]">
          <div
            ref={panelRef}
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">▧</span><h2 className="text-xl font-bold text-slate-950">{title}</h2></div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 transition hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
