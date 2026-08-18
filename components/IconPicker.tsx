"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { uploadCustomIcon } from "@/app/categories/actions";
import IconDisplay from "@/components/IconDisplay";
import { defaultIconValue, isCustomIcon, type IconOption } from "@/lib/icon-options";

type IconPickerProps = {
  name: string;
  defaultValue: string;
  type: "Expense" | "Income" | "Account" | "Goal" | "Transfer";
};

type MenuPosition = {
  top: number;
  left: number;
};

type IconPickerTab = "icons" | "upload";

const menuWidth = 368;
const viewportPadding = 16;
const menuGap = 8;

export default function IconPicker({ name, defaultValue, type }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(isCustomIcon(defaultValue) ? defaultValue : defaultIconValue);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [activeTab, setActiveTab] = useState<IconPickerTab>("icons");
  const [projectIcons, setProjectIcons] = useState<IconOption[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const savedIcon = isCustomIcon(defaultValue) && !projectIcons.some((option) => option.value === defaultValue)
    ? [{ value: defaultValue, label: "Saved icon" }]
    : [];
  const availableIcons = [...projectIcons, ...savedIcon];

  useEffect(() => {
    const form = triggerRef.current?.form;
    if (!form) {
      return;
    }

    const resetPicker = () => {
      setSelectedIcon(isCustomIcon(defaultValue) ? defaultValue : defaultIconValue);
    };
    form.addEventListener("reset", resetPicker);
    return () => form.removeEventListener("reset", resetPicker);
  }, [defaultValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCurrent = true;
    fetch("/api/icons")
      .then((response) => response.json() as Promise<IconOption[]>)
      .then((icons) => {
        if (isCurrent) {
          setProjectIcons(icons);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const triggerBounds = trigger.getBoundingClientRect();
      const availableWidth = window.innerWidth - viewportPadding * 2;
      const width = Math.min(menuWidth, availableWidth);
      const rows = Math.ceil(availableIcons.length / 6);
      const height = activeTab === "upload" ? 238 : Math.min(304, 76 + rows * 48);
      const fitsBelow = triggerBounds.bottom + menuGap + height <= window.innerHeight - viewportPadding;
      const top = fitsBelow
        ? triggerBounds.bottom + menuGap
        : Math.max(viewportPadding, triggerBounds.top - menuGap - height);
      const left = Math.min(Math.max(viewportPadding, triggerBounds.left), window.innerWidth - width - viewportPadding);

      setMenuPosition({ top, left });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [activeTab, availableIcons.length, open]);

  const selectIcon = (value: string) => {
    setSelectedIcon(value);
    setMenuPosition(null);
    setOpen(false);
  };

  const handleUpload = (file: File | undefined) => {
    setIsDragging(false);
    setUploadError(null);
    if (!file) return;

    const formData = new FormData();
    formData.set("icon", file);
    startUpload(async () => {
      const result = await uploadCustomIcon(formData);
      if ("error" in result) {
        setUploadError(result.error ?? "Upload failed.");
        return;
      }

      const uploadedIcon = { value: result.icon, label: result.label };
      setProjectIcons((current) => [uploadedIcon, ...current.filter((icon) => icon.value !== uploadedIcon.value)]);
      selectIcon(uploadedIcon.value);
    });
  };

  const toggleMenu = () => {
    if (open) {
      setMenuPosition(null);
    } else {
      setActiveTab("icons");
      setUploadError(null);
    }
    setOpen((current) => !current);
  };

  const iconMenu = menuPosition ? (
    <div
      className="fixed z-[70] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      style={{ top: menuPosition.top, left: menuPosition.left }}
      role="dialog"
      aria-label="Choose an icon"
      data-icon-picker-menu="true"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex border-b border-slate-100 bg-slate-50/70 p-1">
        <button type="button" role="tab" aria-selected={activeTab === "icons"} onClick={() => setActiveTab("icons")} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${activeTab === "icons" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Icons</button>
        <button type="button" role="tab" aria-selected={activeTab === "upload"} onClick={() => { setActiveTab("upload"); setUploadError(null); }} className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition ${activeTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Upload PNG</button>
      </div>

      {activeTab === "icons" ? (
        <div className="max-h-64 overflow-y-auto p-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Icons</p>
          <div className="grid grid-cols-6 gap-2">
            {availableIcons.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectIcon(option.value)}
                className={`flex h-10 items-center justify-center rounded-lg border text-xl transition hover:border-slate-400 hover:bg-slate-50 ${selectedIcon === option.value ? "border-slate-900 bg-slate-100" : "border-transparent"}`}
                title={option.label}
                aria-label={option.label}
              >
                <IconDisplay icon={option.value} className="h-5 w-5 object-contain" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3">
          <label
            className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition ${isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
            onDrop={(event) => { event.preventDefault(); handleUpload(event.dataTransfer.files[0]); }}
          >
            <input type="file" accept="image/png,.png" className="sr-only" onChange={(event) => handleUpload(event.target.files?.[0])} disabled={isUploading} />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-slate-500 shadow-sm">↑</span>
            <span className="mt-3 text-xs font-semibold text-slate-700">Drop a PNG icon here</span>
            <span className="mt-1 text-[10px] text-slate-500">or click to choose a file · PNG up to 2 MB</span>
            {isUploading ? <span className="mt-3 text-[10px] font-medium text-blue-600">Uploading...</span> : null}
          </label>
          {uploadError ? <p className="mt-2 text-[10px] font-medium text-rose-600" role="alert">{uploadError}</p> : null}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative shrink-0">
      <input type="hidden" name={name} value={selectedIcon} />
      <button
        type="button"
        onClick={toggleMenu}
        className={`flex h-12 w-12 items-center justify-center rounded-xl border transition hover:border-slate-300 ${type === "Income" ? "border-emerald-100 bg-emerald-50 text-emerald-500 hover:bg-emerald-50" : type === "Goal" ? "border-blue-100 bg-blue-50 text-blue-500 hover:bg-blue-50" : type === "Account" ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100" : type === "Transfer" ? "border-violet-100 bg-violet-50 text-violet-500 hover:bg-violet-50" : "border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-50"}`}
        title="Change icon"
        aria-label={type === "Account" ? "Change account icon" : type === "Goal" ? "Change goal icon" : type === "Transfer" ? "Change transfer icon" : "Change category icon"}
        aria-haspopup="dialog"
        aria-expanded={open}
        ref={triggerRef}
      >
        <IconDisplay icon={selectedIcon} className="h-6 w-6 object-contain text-2xl" />
      </button>
      {open && typeof document !== "undefined" ? createPortal(iconMenu, document.body) : null}
    </div>
  );
}
