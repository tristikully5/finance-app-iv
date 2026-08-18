"use client";

import IconDisplay from "@/components/IconDisplay";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type InlineOption = {
  label: string;
  value: string;
  icon?: string | null;
};

type InlineEditableCellProps = {
  value: string;
  type?: "text" | "select" | "number" | "date";
  options?: InlineOption[];
  onSave: (value: string) => void;
  className?: string;
  displayValue?: string;
  showOptionIcons?: boolean;
  noFullWidth?: boolean;
};

export default function InlineEditableCell({ value, type = "text", options = [], onSave, className = "", displayValue: formattedDisplayValue, showOptionIcons = false, noFullWidth = false }: InlineEditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = formattedDisplayValue ?? (type === "select" ? selectedOption?.label ?? value : value);

  useEffect(() => {
    if (!editing || !showOptionIcons) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 180) });
    };
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [editing, showOptionIcons]);

  const commit = (nextValue = draft) => {
    onSave(nextValue);
    setDraft(nextValue);
    setEditing(false);
  };

  const sanitizeNumberInput = (input: string) => {
    if (!input) return "";
    let s = input.replace(/,/g, ".").trim();
    const negative = s.startsWith("-");
    s = s.replace(/-/g, "");
    s = s.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 1) {
      const first = parts.shift();
      s = first + "." + parts.join("");
    }
    if (negative && s) s = "-" + s;
    return s;
  };

  const formatToTwoDecimals = (input: string) => {
    const raw = sanitizeNumberInput(input);
    if (!raw) return "";
    const num = Number(raw);
    if (Number.isNaN(num)) return "";
    return num.toFixed(2);
  };

  const optionContent = (option: InlineOption | undefined, fallback: string) => (
    <span className="flex min-w-0 items-center gap-1.5">
      {showOptionIcons && option?.icon ? <IconDisplay icon={option.icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" /> : null}
      <span className="truncate">{option?.label ?? fallback}</span>
    </span>
  );

  if (!editing) {
    return (
      <button type="button" onClick={() => { setDraft(value); setEditing(true); }} className={`${noFullWidth ? "inline-block" : "block w-full"} rounded px-1 py-1 text-left text-sm hover:bg-gray-50 ${className}`}>
        {type === "select" && showOptionIcons ? optionContent(selectedOption, displayValue) : displayValue}
      </button>
    );
  }

  if (type === "select" && showOptionIcons) {
    return (
      <>
        <button ref={triggerRef} type="button" autoFocus onClick={() => setEditing(false)} className={`${noFullWidth ? "inline-block" : "block w-full"} rounded border border-gray-200 bg-white px-2 py-1 text-left text-sm ${className}`} aria-expanded="true">
          {optionContent(selectedOption, displayValue)}
        </button>
        {menuPosition && typeof document !== "undefined" ? createPortal(
          <>
            <button type="button" aria-label="Close options" className="fixed inset-0 z-[90] cursor-default" onClick={() => setEditing(false)} />
            <div role="listbox" className="fixed z-[91] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl" style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}>
              {options.map((option) => (
                <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => commit(option.value)} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">
                  {optionContent(option, option.label)}
                </button>
              ))}
            </div>
          </>,
          document.body
        ) : null}
      </>
    );
  }

  if (type === "select") {
    return (
      <select
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit()}
        className={`${noFullWidth ? "w-auto" : "w-full"} rounded border border-gray-200 bg-white px-2 py-1 text-sm ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "number") {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(sanitizeNumberInput(event.target.value));
    };

    const handleBlur = () => {
      const normalized = formatToTwoDecimals(draft);
      commit(normalized);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      const formatted = formatToTwoDecimals(draft) || sanitizeNumberInput(draft);
      setDraft(formatted);
      requestAnimationFrame(() => {
        try {
          inputRef.current?.select();
        } catch (_) {}
      });
    };

    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={`w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm ${className}`}
      />
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit()}
      className={`${noFullWidth ? "w-auto" : "w-full"} rounded border border-gray-200 bg-white px-2 py-1 text-sm ${className}`}
    />
  );
}
