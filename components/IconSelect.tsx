"use client";

import IconDisplay from "@/components/IconDisplay";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string; icon?: string | null };

type IconSelectProps = {
  name: string;
  value?: string;
  defaultValue?: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  onChange?: (value: string) => void;
};

export default function IconSelect({ name, value, defaultValue, options, placeholder = "Select...", required = false, className = "", onChange }: IconSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(value ?? defaultValue ?? "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setSelected(value ?? defaultValue ?? "");
  }, [value, defaultValue]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 180) });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const commit = (next: string) => {
    setSelected(next);
    setOpen(false);
    onChange?.(next);
  };

  const selectedOption = options.find((o) => o.value === selected);

  return (
    <div className={`relative ${className}`}>
      <input type="hidden" name={name} value={selected} />
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.icon ? <IconDisplay icon={selectedOption.icon} alt="" className="h-4 w-4 shrink-0 object-contain" /> : null}
          <span className="truncate">{selectedOption?.label ?? (selected ? selected : placeholder)}</span>
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <>
              <button type="button" aria-label="Close options" data-icon-select-menu="true" className="fixed inset-0 z-[90] cursor-default" onClick={() => setOpen(false)} />
              <div role="listbox" data-icon-select-menu="true" className="fixed z-[91] max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl" style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}>
                {options.map((option) => (
                  <button key={option.value} type="button" role="option" aria-selected={option.value === selected} onClick={() => commit(option.value)} className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    <span className="flex items-center gap-2">
                      {option.icon ? <IconDisplay icon={option.icon} alt="" className="h-4 w-4 shrink-0 object-contain" /> : null}
                      <span className="truncate">{option.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
