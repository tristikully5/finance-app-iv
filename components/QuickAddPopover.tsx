"use client";

import { useEffect, useRef, useState } from "react";
import StandardDialog from "@/components/StandardDialog";

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
      if (target instanceof Element && (target.closest("[data-icon-picker-menu]") || target.closest("[data-icon-select-menu]"))) {
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
        <div ref={panelRef}>
          <StandardDialog title={title} onClose={() => setOpen(false)}>
            {children}
          </StandardDialog>
        </div>
      ) : null}
    </div>
  );
}
