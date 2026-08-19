"use client";

import React, { useEffect } from "react";

export default function Modal({ open, title, children, onClose }: { open: boolean; title?: string; children?: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        {title && <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>}
        <div>{children}</div>
      </div>
    </div>
  );
}
