"use client";

import { useEffect, useState } from "react";
import IconDisplay from "./IconDisplay";
import IconPicker from "@/components/IconPicker";
import { updateTransferIcon, uploadCustomIcon } from "@/app/categories/actions";
import { defaultIconValue, defaultTransferColorValue, defaultTransferIconValue, getCategoryTypeDefaultColorValue, getCategoryTypeDefaultIconValue, getDefaultIconValue, setCategoryTypeDefaultColorValue, setCategoryTypeDefaultIconValue, setDefaultIconValue, type IconOption } from "@/lib/icon-options";

export default function SettingsClient({ initialTransferIcon = defaultTransferIconValue }: { initialTransferIcon?: string }) {
  const [icons, setIcons] = useState<IconOption[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [newCurrency, setNewCurrency] = useState("");
  const [uploading, setUploading] = useState(false);
  const [defaultIcon, setDefaultIcon] = useState<string>(defaultIconValue);
  const [expenseIcon, setExpenseIcon] = useState<string>(defaultIconValue);
  const [incomeIcon, setIncomeIcon] = useState<string>(defaultIconValue);
  const [expenseColor, setExpenseColor] = useState<string>(defaultTransferColorValue);
  const [incomeColor, setIncomeColor] = useState<string>(defaultTransferColorValue);
  const [transferColor, setTransferColor] = useState<string>(defaultTransferColorValue);
  const [transferIcon, setTransferIcon] = useState(initialTransferIcon || defaultTransferIconValue);

  useEffect(() => {
    const saved = localStorage.getItem("finance:currencies");
    if (saved) {
      try {
        setCurrencies(JSON.parse(saved));
      } catch {
        setCurrencies(["SGD", "USD", "EUR"]);
      }
    } else {
      setCurrencies(["SGD", "USD", "EUR"]);
    }
    setDefaultIcon(getDefaultIconValue());
    setExpenseIcon(getCategoryTypeDefaultIconValue("Expense"));
    setIncomeIcon(getCategoryTypeDefaultIconValue("Income"));
    setExpenseColor(getCategoryTypeDefaultColorValue("Expense"));
    setIncomeColor(getCategoryTypeDefaultColorValue("Income"));
    setTransferColor(getCategoryTypeDefaultColorValue("Transfer"));
    fetchIcons();
  }, []);

  const fetchIcons = async () => {
    const res = await fetch("/api/icons");
    const list = (await res.json()) as IconOption[];
    setIcons(list);
  };

  const saveCurrencies = (next: string[]) => {
    setCurrencies(next);
    localStorage.setItem("finance:currencies", JSON.stringify(next));
  };

  const addCurrency = () => {
    const cand = newCurrency.trim().toUpperCase();
    if (!cand) return;
    if (currencies.includes(cand)) {
      setNewCurrency("");
      return;
    }
    const next = [...currencies, cand];
    saveCurrencies(next);
    setNewCurrency("");
  };

  const removeCurrency = (c: string) => {
    saveCurrencies(currencies.filter((x) => x !== c));
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("icon", file);
    const result = await uploadCustomIcon(formData as any);
    setUploading(false);
    if ((result as any)?.icon) {
      await fetchIcons();
    } else {
      alert((result as any)?.error ?? "Upload failed");
    }
  };

  const handleDeleteIcon = async (value: string) => {
    if (!confirm("Delete this icon? This cannot be undone.")) return;
    const res = await fetch("/api/icons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
    const body = await res.json();
    if (res.ok) {
      await fetchIcons();
    } else {
      alert(body?.error ?? "Failed to delete icon");
    }
  };

  const globalIconRows = [
    {
      label: "Default icon",
      description: "Used for new accounts, goals, and categories",
      iconValue: defaultIcon,
      iconType: "Expense" as const,
      colorValue: null,
      onSave: (formData: FormData) => {
        const icon = setDefaultIconValue(formData.get("icon") as string | null);
        setDefaultIcon(icon);
      },
    },
    {
      label: "Expense",
      description: "Default icon and color for expense categories",
      iconValue: expenseIcon,
      iconType: "Expense" as const,
      colorValue: expenseColor,
      onSave: (formData: FormData) => {
        const icon = setCategoryTypeDefaultIconValue("Expense", formData.get("icon") as string | null);
        const color = setCategoryTypeDefaultColorValue("Expense", formData.get("color") as string | null);
        setExpenseIcon(icon);
        setExpenseColor(color);
      },
    },
    {
      label: "Income",
      description: "Default icon and color for income categories",
      iconValue: incomeIcon,
      iconType: "Income" as const,
      colorValue: incomeColor,
      onSave: (formData: FormData) => {
        const icon = setCategoryTypeDefaultIconValue("Income", formData.get("icon") as string | null);
        const color = setCategoryTypeDefaultColorValue("Income", formData.get("color") as string | null);
        setIncomeIcon(icon);
        setIncomeColor(color);
      },
    },
    {
      label: "Transfer",
      description: "Default icon and color for transfer transactions",
      iconValue: transferIcon,
      iconType: "Transfer" as const,
      colorValue: transferColor,
      onSave: async (formData: FormData) => {
        const result = await updateTransferIcon(formData);
        if ("icon" in result) {
          setTransferIcon(result.icon);
          if ("color" in result) {
            setTransferColor(result.color);
          }
        }
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className="rounded-lg border bg-white p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">Global icons</h3>
        <p className="mb-3 text-xs text-slate-500">Manage the project-wide default icons for account, category, and transfer entries.</p>
        <div className="space-y-3">
          {globalIconRows.map((row) => (
            <form key={row.label} action={async (formData) => row.onSave(formData)} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <IconPicker name="icon" defaultValue={row.iconValue} type={row.iconType} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{row.label}</p>
                  <p className="text-[11px] text-slate-500">{row.description}</p>
                </div>
              </div>
              {row.colorValue !== null ? (
                <label className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Color</span>
                  <input
                    type="color"
                    name="color"
                    value={row.colorValue}
                    onChange={(event) => {
                      const nextColor = event.target.value;
                      if (row.label === "Expense") setExpenseColor(nextColor);
                      if (row.label === "Income") setIncomeColor(nextColor);
                      if (row.label === "Transfer") setTransferColor(nextColor);
                    }}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    aria-label={`Choose ${row.label.toLowerCase()} color`}
                  />
                </label>
              ) : null}
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white">Save</button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Currencies</h3>
        <p className="mb-3 text-xs text-slate-500">Manage currency codes used in the app. Changes are stored locally in your browser.</p>
        <div className="mb-3 flex gap-2">
          <input className="w-full rounded-lg border px-3 py-2 text-sm" value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} placeholder="e.g. GBP" />
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={addCurrency}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {currencies.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm">
              <span className="font-medium">{c}</span>
              <button type="button" onClick={() => removeCurrency(c)} className="text-rose-600">×</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold">Custom Icons</h3>
        <p className="mb-3 text-xs text-slate-500">View, add, and remove custom icons. Right-click an icon to remove it.</p>
        <div className="mb-3 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <input type="file" accept="image/png" className="sr-only" onChange={(e) => handleUpload(e.target.files?.[0])} />
            <span className="text-sm">Upload PNG</span>
            {uploading ? <span className="ml-2 text-xs text-slate-500">Uploading...</span> : null}
          </label>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {icons.map((icon) => (
            <button
              key={icon.value}
              type="button"
              onContextMenu={(e) => {
                e.preventDefault();
                if (icon.value === defaultIconValue) {
                  alert("This is the default icon and cannot be deleted.");
                  return;
                }
                handleDeleteIcon(icon.value);
              }}
              title="Right click to delete"
              className="flex h-12 items-center justify-center rounded-lg border hover:border-slate-300"
            >
              <IconDisplay icon={icon.value} className="h-6 w-6 object-contain" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
