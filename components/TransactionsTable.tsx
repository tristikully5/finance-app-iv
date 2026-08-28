"use client";

import InlineEditableCell from "@/components/InlineEditableCell";
import QuickAddShell from "@/app/components/QuickAddShell";
import Link from "next/link";
import TransactionEditDialog from "@/components/TransactionEditDialog";
import IconDisplay from "@/components/IconDisplay";
import TransactionTagsCell from "@/components/TransactionTagsCell";
import MonthCalendarPicker from "@/components/MonthCalendarPicker";
import { updateTransaction } from "@/app/transactions/actions";
import {
  getCategoryTypeDefaultColorValue,
  getCategoryTypeDefaultIconValue,
} from "@/lib/icon-options";
import { useMemo, useState, useEffect } from "react";
import { transactionTablePresets, type TransactionTablePreset, type TransactionTableView } from "@/components/transaction-table-presets";

export type AccountOption = { id: number; name: string; icon: string | null };
export type CategoryOption = { id: number; name: string; type: string; icon?: string | null };
export type GoalOption = { id: number; name: string; icon: string | null };
export type TransactionItem = {
  id: number;
  date: string;
  name: string;
  description: string;
  tags: string[];
  amount: number;
  currency: string;
  type: string;
  accountId: number;
  toAccountId: number | null;
  goalId: number | null;
  monthCategoryId: number;
  allocationState: string;
  allocationOutcome: string | null;
  allocationOutcomeAmount: number;
  account: AccountOption;
  toAccount: AccountOption | null;
  goal: GoalOption | null;
  category: CategoryOption;
};

export type TransactionsTableProps = {
  transactions: TransactionItem[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  goals: GoalOption[];
  tagSuggestions?: string[];
  monthLabel: string;
  monthKey: string;
  previousMonthKey: string;
  nextMonthKey: string;
  todayMonthKey: string;
  preset?: TransactionTablePreset;
};

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "2-digit" }).format(new Date(date));
}

function formatCurrencyNumber(value: number, currency: string) {
  const safeCurrency = currency || "SGD";
  const absolute = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute);

  return `${value < 0 ? "-" : ""}${safeCurrency.toUpperCase()} ${formatted}`;
}

function formatCurrencyLabel(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
}

const DONUT_PALETTES = {
  Income: ["#16a34a", "#0d9488", "#2563eb", "#7c3aed", "#db2777", "#f59e0b", "#0891b2"],
  Expense: ["#e11d48", "#f97316", "#eab308", "#65a30d", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef"],
};

type DonutEntry = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
};

function SummaryDonut({ entries, label, currency }: { entries: DonutEntry[]; label: string; currency: string }) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const centerAmount = formatCurrencyNumber(total, currency);
  const centerAmountClass = centerAmount.length > 14 ? "text-[10px]" : centerAmount.length > 10 ? "text-xs" : "text-sm";

  const rawLabelPositions = entries.map((entry, index) => {
    const segment = total === 0 ? 0 : (entry.value / total) * 100;
    const startAngle = entries.slice(0, index).reduce((sum, previousEntry) => sum + (total === 0 ? 0 : (previousEntry.value / total) * 100), 0) * 3.6 - 90;
    const midAngle = startAngle + segment * 3.6 / 2;
    const radians = (midAngle * Math.PI) / 180;
    const lineStartRadius = 39;
    const elbowRadius = 50;
    const lineStartX = 50 + Math.cos(radians) * lineStartRadius;
    const lineStartY = 50 + Math.sin(radians) * lineStartRadius;
    const elbowX = 50 + Math.cos(radians) * elbowRadius;
    const elbowY = 50 + Math.sin(radians) * elbowRadius;
    const anchor = elbowX > 50 ? "start" : "end";
    const lineEndX = anchor === "start" ? 80 : 20;
    const lineEndY = Math.max(8, Math.min(92, elbowY));

    return {
      ...entry,
      labelX: anchor === "start" ? 83 : 17,
      labelY: lineEndY,
      lineStartX,
      lineStartY,
      elbowX,
      elbowY,
      lineEndX,
      lineEndY,
      anchor,
      percent: total === 0 ? 0 : Math.round((entry.value / total) * 100),
      key: `${entry.name}-${index}`,
    };
  });

  const adjustedLabelY = new Map<string, number>();
  for (const anchor of ["start", "end"] as const) {
    const positions = rawLabelPositions
      .filter((position) => position.anchor === anchor)
      .sort((a, b) => a.labelY - b.labelY);
    let previousY = -Infinity;

    positions.forEach((position) => {
      const nextY = Math.min(92, Math.max(position.labelY, previousY + 13));
      adjustedLabelY.set(position.key, nextY);
      previousY = nextY;
    });
  }

  const labelPositions = rawLabelPositions.map((position) => ({
    ...position,
    labelY: adjustedLabelY.get(position.key) ?? position.labelY,
    lineEndY: adjustedLabelY.get(position.key) ?? position.lineEndY,
  }));

  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {labelPositions.map((item) => (
          <polyline key={`${item.key}-line`} points={`${item.lineStartX},${item.lineStartY} ${item.elbowX},${item.elbowY} ${item.lineEndX},${item.lineEndY}`} fill="none" stroke="#94a3b8" strokeWidth="0.45" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>

      <svg viewBox="0 0 100 100" className="relative h-full w-full -rotate-90" aria-label={`${label} category breakdown`} role="img">
        <circle cx="50" cy="50" r="31" fill="none" strokeWidth="13" className="stroke-slate-100" />
        {entries.map((entry, index) => {
          const segment = total === 0 ? 0 : (entry.value / total) * 100;
          const segmentLength = entries.length > 1 ? Math.max(segment - 0.8, 0) : segment;
          const offset = entries.slice(0, index).reduce((sum, previousEntry) => sum + (total === 0 ? 0 : (previousEntry.value / total) * 100), 0);
          return <circle key={entry.name} cx="50" cy="50" r="31" fill="none" pathLength="100" strokeWidth="13" strokeLinecap="butt" strokeDasharray={`${segmentLength} ${100 - segmentLength}`} strokeDashoffset={-offset} stroke={entry.color} />;
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`max-w-full whitespace-nowrap font-bold leading-tight text-slate-800 ${centerAmountClass}`}>{centerAmount}</span>
        <span className="mt-1 whitespace-nowrap text-[9px] text-slate-500">Total {label}</span>
      </div>

      {labelPositions.map((item) => (
        <div
          key={item.key}
          className="pointer-events-none absolute flex items-center"
          style={{
            left: `${item.labelX}%`,
            top: `${item.labelY}%`,
            transform: `translate(${item.anchor === "start" ? "2px" : "-100%"}, -50%)`,
            maxWidth: "34%",
          }}
        >
          <div className="space-y-0.5 text-[10px] leading-tight text-slate-600" style={{ textAlign: item.anchor === "start" ? "left" : "right" }}>
            <div className="whitespace-nowrap font-semibold">{item.name}</div>
            <div className="whitespace-nowrap text-[9px] text-slate-500">{item.percent}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizedAmountForDisplay(transaction: Pick<TransactionItem, "type" | "amount">) {
  if (transaction.type === "Expense" && transaction.amount < 0) {
    return Math.abs(transaction.amount);
  }
  return transaction.amount;
}

function transactionDelta(transaction: TransactionItem) {
  if (transaction.type === "Income") return transaction.amount;
  if (transaction.type === "Expense") return -Math.abs(transaction.amount);
  return -Math.abs(transaction.amount);
}

function getTransactionTypeIcon(transaction: TransactionItem) {
  if (transaction.type === "Transfer") {
    return transaction.category.icon || getCategoryTypeDefaultIconValue("Transfer");
  }
  if (transaction.type === "Allocate") {
    return transaction.category.icon || getCategoryTypeDefaultIconValue("Allocate");
  }
  return transaction.category.icon || getCategoryTypeDefaultIconValue(transaction.type === "Income" ? "Income" : "Expense");
}

type TransactionAccentType = "Income" | "Expense" | "Transfer" | "Allocate";

type TransactionColors = Record<TransactionAccentType, string>;

function transactionAccentType(type: string): TransactionAccentType {
  if (type === "Income" || type === "Transfer" || type === "Allocate") return type;
  return "Expense";
}

function transactionAccentClass(type: string) {
  return `transaction-accent-${transactionAccentType(type).toLowerCase()}`;
}

function allocationStatus(transaction: Pick<TransactionItem, "type" | "amount" | "allocationState" | "allocationOutcome" | "allocationOutcomeAmount">) {
  if (transaction.type !== "Allocate") return null;
  if (transaction.allocationState !== "Concluded") return "Allocated";
  if (transaction.allocationOutcome === "Released") return "Released";
  if (transaction.allocationOutcome === "Cancelled") return "Cancelled";
  if (transaction.allocationOutcome === "Spent") {
    return transaction.allocationOutcomeAmount === normalizedAmountForDisplay(transaction) ? "Spent" : "Partially spent";
  }
  return "Allocated";
}

function allocationStatusClass(status: string | null) {
  if (status === "Released") return "transaction-status-released";
  if (status === "Cancelled") return "transaction-status-cancelled";
  if (status === "Partially spent") return "transaction-status-partially-spent";
  if (status === "Spent") return "transaction-status-spent";
  return "transaction-status-allocated";
}

function transactionCategoryLabel(category: CategoryOption) {
  return category.type === "Allocate" && category.name === "Allocate" ? "Goal allocation" : category.name;
}

function getTypeFallbackIcon(type: string) {
  if (type === "Transfer") return getCategoryTypeDefaultIconValue("Transfer");
  if (type === "Allocate") return getCategoryTypeDefaultIconValue("Allocate");
  if (type === "Income") return getCategoryTypeDefaultIconValue("Income");
  return getCategoryTypeDefaultIconValue("Expense");
}

function destinationValue(transaction: TransactionItem) {
  if (transaction.goalId) return `goal:${transaction.goalId}`;
  if (transaction.toAccountId) return `account:${transaction.toAccountId}`;
  return "";
}

function destinationOverrides(value: string): Pick<TransactionItem, "toAccountId" | "goalId"> {
  if (value.startsWith("goal:")) {
    return { toAccountId: null, goalId: Number(value.slice(5)) };
  }

  if (value.startsWith("account:")) {
    return { toAccountId: Number(value.slice(8)), goalId: null };
  }

  return { toAccountId: null, goalId: null };
}

function getTransactionDayKey(date: string) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function TransferArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1.75 8h10.5M9.75 4.75L13 8l-3.25 3.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M5 2.5v3M11 2.5v3M2.5 7h11" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2.5 3h11L9.25 8v4.25l-2.5 1V8L2.5 3Z" strokeLinejoin="round" />
    </svg>
  );
}

export default function TransactionsTable({
  transactions,
  accounts,
  categories,
  goals,
  tagSuggestions = [],
  monthLabel,
  monthKey,
  previousMonthKey,
  nextMonthKey,
  todayMonthKey,
  preset = transactionTablePresets.full,
}: TransactionsTableProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<TransactionTableView>(preset.initialView);
  const [transactionColors] = useState<TransactionColors>(() => ({
    Income: getCategoryTypeDefaultColorValue("Income"),
    Expense: getCategoryTypeDefaultColorValue("Expense"),
    Transfer: getCategoryTypeDefaultColorValue("Transfer"),
    Allocate: getCategoryTypeDefaultColorValue("Allocate"),
  }));

  // Read persisted view mode after mount to avoid hydration mismatches.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("finance:transactions-view");
      if (saved === "table" || saved === "calendar") {
        setViewMode(saved as TransactionTableView);
      }
    } catch (e) {
      // ignore localStorage errors (e.g., privacy mode)
    }
  }, []);
  const [typeFilter, setTypeFilter] = useState<"All" | "Income" | "Expense" | "Transfer" | "Allocate">("All");
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);

  const setViewModeAndPersist = (next: TransactionTableView) => {
    setViewMode(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("finance:transactions-view", next);
    }
  };

  useEffect(() => {
    Object.entries(transactionColors).forEach(([type, color]) => {
      document.documentElement.style.setProperty(`--transaction-${type.toLowerCase()}-color`, color);
    });
  }, [transactionColors]);

  const activeView = viewMode === "table" && preset.showTableView ? "table" : "calendar";

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        transaction.name.toLowerCase().includes(query) ||
        transaction.account.name.toLowerCase().includes(query) ||
        transaction.category.name.toLowerCase().includes(query);

      return matchesSearch && (typeFilter === "All" || transaction.type === typeFilter);
    });
  }, [searchTerm, transactions, typeFilter]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce<Record<string, TransactionItem[]>>((groups, transaction) => {
      const key = getTransactionDayKey(transaction.date);
      groups[key] = [...(groups[key] ?? []), transaction];
      return groups;
    }, {});
  }, [filteredTransactions]);

  const orderedDays = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));
  }, [groupedTransactions]);

  const summaryCurrency = filteredTransactions[0]?.currency ?? "SGD";
  const monthIncome = filteredTransactions.filter((item) => item.type === "Income").reduce((sum, item) => sum + item.amount, 0);
  const monthExpense = filteredTransactions.filter((item) => item.type === "Expense").reduce((sum, item) => sum + normalizedAmountForDisplay(item), 0);
  const monthNet = monthIncome - monthExpense;

  const categoryBreakdowns = useMemo(() => {
    const buildBreakdown = (type: "Income" | "Expense") => {
      const typeTransactions = filteredTransactions.filter((item) => item.type === type);
      const total = typeTransactions.reduce((sum, item) => sum + normalizedAmountForDisplay(item), 0);
      const grouped = new Map<string, Omit<DonutEntry, "percentage">>();

      typeTransactions.forEach((transaction, index) => {
        const key = String(transaction.category.id ?? `${transaction.category.name}-${index}`);
        const palette = DONUT_PALETTES[type];
        const current = grouped.get(key) ?? {
          name: transaction.category.name,
          value: 0,
          icon: transaction.category.icon || getTypeFallbackIcon(type),
          color: palette[index % palette.length],
        };

        current.value += normalizedAmountForDisplay(transaction);
        grouped.set(key, current);
      });

      return [...grouped.values()]
        .sort((a, b) => b.value - a.value)
        .map((entry, index) => ({
          ...entry,
          color: DONUT_PALETTES[type][index % DONUT_PALETTES[type].length],
          percentage: total === 0 ? 0 : (entry.value / total) * 100,
        }));
    };

    return {
      income: buildBreakdown("Income"),
      expense: buildBreakdown("Expense"),
    };
  }, [filteredTransactions]);

  const calendarDays = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey);
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(year, month - 1, index - leadingDays + 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        key,
        inMonth: date.getMonth() === month - 1,
        day: date.getDate(),
        transactions: groupedTransactions[key] ?? [],
      };
    });
  }, [groupedTransactions, monthKey]);

  const makeUpdateForm = (transaction: TransactionItem, overrides: Partial<TransactionItem> = {}) => {
    const formData = new FormData();
    formData.append("id", String(transaction.id));
    formData.append("date", overrides.date ?? transaction.date.slice(0, 10));
    formData.append("name", overrides.name ?? transaction.name);
    formData.append("description", overrides.description ?? transaction.description ?? "");
    formData.append("tags", JSON.stringify(overrides.tags ?? transaction.tags ?? []));
    formData.append("amount", String(overrides.amount ?? transaction.amount));
    formData.append("currency", overrides.currency ?? transaction.currency);
    formData.append("type", overrides.type ?? transaction.type);

    const accountId = overrides.accountId ?? transaction.accountId;
    const toAccountId = "toAccountId" in overrides ? overrides.toAccountId : transaction.toAccountId;
    const goalId = "goalId" in overrides ? overrides.goalId : transaction.goalId;

    formData.append("accountId", String(accountId));
    formData.append("toAccountId", String(toAccountId ?? ""));
    formData.append("goalId", String(goalId ?? ""));
    formData.append("monthCategoryId", String(overrides.monthCategoryId ?? transaction.monthCategoryId));
    return updateTransaction(formData);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          {preset.showMonthNavigation ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Link href={`/transactions?month=${previousMonthKey}`} className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50" aria-label="Previous month">‹</Link>
                <MonthCalendarPicker key={monthKey} monthKey={monthKey} monthLabel={monthLabel} todayMonthKey={todayMonthKey} />
                <Link href={`/transactions?month=${nextMonthKey}`} className="inline-flex h-9 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50" aria-label="Next month">›</Link>
                <Link href={`/transactions?month=${todayMonthKey}`} className="ml-1 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Today</Link>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {preset.showViewToggle ? (
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {preset.showCalendarView ? <button
                  type="button"
                  onClick={() => setViewModeAndPersist("calendar")}
                  className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${activeView === "calendar" ? "border-slate-200 bg-white text-slate-900 shadow-sm" : "border-transparent bg-transparent text-slate-600 hover:bg-white/60"}`}
                >
                  Calendar
                </button> : null}
                {preset.showTableView ? <button
                  type="button"
                  onClick={() => setViewModeAndPersist("table")}
                  className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition ${activeView === "table" ? "border-slate-200 bg-white text-slate-900 shadow-sm" : "border-transparent bg-transparent text-slate-600 hover:bg-white/60"}`}
                >
                  Table
                </button> : null}
              </div>
            ) : null}

            {preset.showSearch ? <label className="relative">
              <span className="sr-only">Search transactions</span>
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search transactions..." className="h-9 w-44 rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </label> : null}
            {preset.showTypeFilter ? <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600">
              <FilterIcon />
              <span className="sr-only">Filter transactions</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="bg-transparent outline-none">
                <option value="All">Filter</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Transfer">Transfer</option>
                <option value="Allocate">Allocate</option>
              </select>
            </label> : null}
            {preset.showQuickAdd ? <QuickAddShell kind="transaction" accounts={accounts} categories={categories} goals={goals} tagSuggestions={tagSuggestions} buttonClassName="flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800" buttonContent="＋ Add transaction" /> : null}
          </div>
        </div>

        <div className={`p-4 ${preset.showSummaryPanels ? "xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4" : ""}`}>
          <div className="min-w-0">
            {activeView === "table" ? (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      {orderedDays.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No transactions found for {monthLabel}.</div> : orderedDays.map((day) => {
                        const dayTransactions = groupedTransactions[day];
                        const cashTransactions = dayTransactions.filter((item) => item.type === "Income" || item.type === "Expense");
                        const nonCashTransactions = dayTransactions.filter((item) => item.type === "Transfer" || item.type === "Allocate");
                        const dayCashDelta = cashTransactions.reduce((sum, item) => sum + transactionDelta(item), 0);
                        const dayNonCashTotal = nonCashTransactions.reduce((sum, item) => sum + Math.abs(item.type === "Allocate" && item.allocationState === "Concluded" ? item.allocationOutcomeAmount : item.amount), 0);
                        const hasCashActivity = cashTransactions.length > 0;
                        const hasNonCashActivity = nonCashTransactions.length > 0;
                        const hasSeparateTotals = hasCashActivity && hasNonCashActivity;
                        const dayBalance = hasCashActivity ? Math.abs(dayCashDelta) : dayNonCashTotal;
                        const dayBalanceClass = hasCashActivity ? dayCashDelta > 0 ? "text-emerald-600" : dayCashDelta < 0 ? "text-rose-600" : "text-slate-600" : "text-slate-600";
                        const isOpen = expandedDays[day] ?? true;

                        return (
                          <div key={day} className="relative border-b border-slate-100 last:border-b-0">
                            <button type="button" onClick={() => setExpandedDays((current) => ({ ...current, [day]: !isOpen }))} className="transaction-day-grid w-full items-center bg-slate-50 px-4 py-2.5 text-left hover:bg-slate-100">
                              <span className="flex items-center gap-2 text-xs font-semibold text-slate-800"><span className={`text-[10px] transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span><CalendarIcon />{formatDay(`${day}T12:00:00`)}</span>
                              <span />
                              {preset.showDayTotals ? <>
                                {hasSeparateTotals ? <span className="col-start-3 justify-self-end text-right text-xs font-semibold text-slate-600" title="Transfers and allocations" aria-label="Transfers and allocations total">{formatCurrencyLabel(dayNonCashTotal, dayTransactions[0]?.currency ?? "SGD")}</span> : <span />}
                                <span className={`col-start-4 justify-self-end text-right text-xs font-semibold ${dayBalanceClass}`} title={hasCashActivity ? "Income and expenses net" : "Transfers and allocations total"} aria-label={hasCashActivity ? "Income and expenses net" : "Transfers and allocations total"}>{formatCurrencyLabel(dayBalance, dayTransactions[0]?.currency ?? "SGD")}</span>
                              </> : null}
                            </button>

                            {isOpen ? dayTransactions.map((transaction) => {
                              const isIncome = transaction.type === "Income";
                              const isReleasedAllocation = transaction.type === "Allocate" && transaction.allocationState === "Concluded" && transaction.allocationOutcome === "Released";
                              const isSpentAllocation = transaction.type === "Allocate" && transaction.allocationState === "Concluded" && transaction.allocationOutcome === "Spent";
                              const originalAllocationAmount = normalizedAmountForDisplay(transaction);
                              const hasSpentAmountChange = isSpentAllocation && transaction.allocationOutcomeAmount !== originalAllocationAmount;
                              const isConcludedAllocation = isReleasedAllocation || hasSpentAmountChange;
                              const status = allocationStatus(transaction);
                              return <div key={transaction.id} onClick={(event) => { const target = event.target as HTMLElement; if (target.closest("button, input, select, a")) return; setEditingTransaction(transaction); }} className={`transaction-row-grid transaction-card ${transactionAccentClass(transaction.type)} cursor-pointer items-center px-4 py-3 text-xs hover:bg-slate-50`}>
                                <div className="transaction-category-cell min-w-0">
                                  <span className="transaction-icon-circle">
                                    <IconDisplay icon={getTransactionTypeIcon(transaction)} className="h-5 w-5 object-contain" />
                                  </span>
                                  <InlineEditableCell
                                    value={String(transaction.monthCategoryId)}
                                    type="select"
                                    options={categories
                                      .filter((item) => item.type === transaction.type)
                                      .map((item) => ({ label: transactionCategoryLabel(item), value: String(item.id), icon: item.icon || getTypeFallbackIcon(transaction.type) }))}
                                    onSave={(value) => makeUpdateForm(transaction, { monthCategoryId: Number(value) || transaction.monthCategoryId })}
                                    className="min-w-0 truncate font-semibold text-slate-800"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <InlineEditableCell value={transaction.name} onSave={(value) => makeUpdateForm(transaction, { name: value })} className={`block truncate font-semibold text-slate-900 ${isReleasedAllocation ? "line-through" : ""}`} />
                                  {(transaction.type === "Transfer" || transaction.type === "Allocate") ? (
                                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                      <InlineEditableCell noFullWidth value={String(transaction.accountId)} type="select" options={accounts.map((item) => ({ label: item.name, value: String(item.id), icon: item.icon }))} onSave={(value) => makeUpdateForm(transaction, { accountId: Number(value) || transaction.accountId })} className="min-w-0 truncate text-[11px] text-slate-500" showOptionIcons />
                                      <span className="mx-1"><TransferArrowIcon /></span>
                                      <InlineEditableCell
                                        noFullWidth
                                        value={transaction.type === "Allocate" ? `goal:${transaction.goalId ?? ""}` : destinationValue(transaction)}
                                        type="select"
                                        options={transaction.type === "Allocate" ? [
                                          ...goals.map((item) => ({ label: item.name, value: `goal:${item.id}`, icon: item.icon }))
                                        ] : [
                                          ...accounts.filter((item) => item.id !== transaction.accountId).map((item) => ({ label: item.name, value: `account:${item.id}`, icon: item.icon })),
                                          ...goals.map((item) => ({ label: item.name, value: `goal:${item.id}`, icon: item.icon }))
                                        ]}
                                        onSave={(value) => makeUpdateForm(transaction, transaction.type === "Allocate" ? { goalId: Number(value.replace("goal:", "")) || null, toAccountId: null } : destinationOverrides(value))}
                                        className="min-w-0 truncate text-[11px] text-slate-500"
                                        showOptionIcons
                                      />
                                    </div>
                                  ) : (
                                    <InlineEditableCell value={String(transaction.accountId)} type="select" options={accounts.map((item) => ({ label: item.name, value: String(item.id), icon: item.icon }))} onSave={(value) => makeUpdateForm(transaction, { accountId: Number(value) || transaction.accountId })} className="mt-0.5 block text-[11px] text-slate-500" showOptionIcons />
                                  )}
                                </div>
                                <div className="min-w-0 self-start">
                                  {transaction.description ? <div className="mt-1 truncate text-[12px] text-slate-500">{transaction.description}</div> : null}
                                  <TransactionTagsCell tags={transaction.tags ?? []} suggestions={tagSuggestions} onSave={(tags) => makeUpdateForm(transaction, { tags })} />
                                </div>
                                <div className={`flex flex-col items-end gap-1 text-right font-semibold ${transaction.type === "Transfer" ? "text-slate-600" : transaction.type === "Allocate" ? "text-slate-700" : isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                                  {preset.showAllocationStatus && status ? <span className={`transaction-status-badge ${allocationStatusClass(status)}`}>{status}</span> : null}
                                  <div className="flex items-center justify-end gap-1.5">
                                    {hasSpentAmountChange ? <>
                                      <InlineEditableCell value={String(originalAllocationAmount)} type="number" displayValue={formatCurrencyLabel(originalAllocationAmount, transaction.currency)} onSave={(value) => makeUpdateForm(transaction, { amount: Number(value) || 0 })} className="text-right text-[11px] font-normal text-slate-400 line-through" />
                                      <span className="whitespace-nowrap text-sm font-semibold text-slate-700">{formatCurrencyLabel(transaction.allocationOutcomeAmount, transaction.currency)}</span>
                                    </> : <InlineEditableCell value={String(originalAllocationAmount)} type="number" displayValue={formatCurrencyLabel(originalAllocationAmount, transaction.currency)} onSave={(value) => makeUpdateForm(transaction, { amount: Number(value) || 0 })} className={`text-right ${isConcludedAllocation ? "line-through" : ""}`} />}
                                  </div>
                                </div>
                            </div>;
                          }) : null}
                        </div>
                      );
                    })}
                    {filteredTransactions.length > 0 ? <div className="flex items-center justify-center gap-2 px-4 py-5 text-[11px] text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded border border-slate-200">▧</span>No more transactions</div> : null}
                  </div>
                </div>
              </div>

            </>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="border-r border-slate-200 px-2 py-3 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map(({ key, inMonth, day, transactions: dayTransactions }) => {
                  const hasTransactions = dayTransactions.length > 0;
                  const isToday = key === new Date().toISOString().slice(0, 10);

                  return (
                    <div key={key} className={`min-h-[120px] border-r border-b border-slate-200 bg-white p-2 last:border-r-0 ${!inMonth ? "bg-slate-50 text-slate-300" : "text-slate-700"}`}>
                      <div className={`mb-2 flex items-center justify-between text-[11px] font-semibold ${!inMonth ? "text-slate-300" : "text-slate-600"}`}>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-slate-900 text-white" : "bg-transparent"}`}>{day}</span>
                      </div>

                      <div className="space-y-1.5">
                        {dayTransactions.slice(0, 3).map((transaction) => {
                          const isIncome = transaction.type === "Income";
                          const isTransfer = transaction.type === "Transfer";
                          const isReleasedAllocation = transaction.type === "Allocate" && transaction.allocationState === "Concluded" && transaction.allocationOutcome === "Released";
                          const isSpentAllocation = transaction.type === "Allocate" && transaction.allocationState === "Concluded" && transaction.allocationOutcome === "Spent";
                          const hasSpentAmountChange = isSpentAllocation && transaction.allocationOutcomeAmount !== normalizedAmountForDisplay(transaction);
                          const status = allocationStatus(transaction);
                          const tone = isIncome ? "bg-emerald-100 text-emerald-800 border-emerald-200" : isTransfer ? "bg-violet-100 text-violet-800 border-violet-200" : "bg-rose-100 text-rose-700 border-rose-200";

                          return (
                            <button
                              key={transaction.id}
                              type="button"
                              onClick={() => setEditingTransaction(transaction)}
                              className={`transaction-calendar-card ${transactionAccentClass(transaction.type)} w-full rounded-md border px-1.5 py-1 text-left text-[10px] shadow-sm transition hover:opacity-90 ${tone}`}
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-white/70">
                                  {isTransfer ? <TransferArrowIcon /> : <IconDisplay icon={transaction.category.icon} className="h-3 w-3 object-contain" />}
                                </span>
                                <span className={`truncate font-semibold ${isReleasedAllocation ? "line-through" : ""}`}>{transaction.name}</span>
                              </div>
                              {preset.showAllocationStatus && status ? <span className={`transaction-status-badge ${allocationStatusClass(status)} mt-1`}>{status}</span> : null}
                              <div className="mt-1 flex items-center justify-between gap-1 text-[9px] font-medium">
                                <span className="truncate">{transaction.account.name}</span>
                                <span className={`flex shrink-0 items-center gap-1 ${isIncome ? "text-emerald-900" : "text-rose-700"}`}>
                                  {hasSpentAmountChange ? <>
                                    <span className="text-[10px] font-semibold">{formatCurrencyNumber(-transaction.allocationOutcomeAmount, transaction.currency)}</span>
                                    <span className="text-[9px] text-rose-300 line-through">{formatCurrencyNumber(-transaction.amount, transaction.currency)}</span>
                                  </> : <span className={isReleasedAllocation ? "line-through" : ""}>{transaction.type === "Income" ? formatCurrencyNumber(transaction.amount, transaction.currency) : formatCurrencyNumber(-transaction.amount, transaction.currency)}</span>}
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {dayTransactions.length > 3 ? (
                          <div className="px-1 text-[9px] font-medium text-slate-500">+{dayTransactions.length - 3} more</div>
                        ) : null}

                        {!hasTransactions && <div className="h-6" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Month total</span>
                <span className="text-emerald-600">{formatCurrencyNumber(monthIncome, summaryCurrency)}</span>
                <span className="text-rose-600">- {formatCurrencyNumber(monthExpense, summaryCurrency)}</span>
                <span className="font-semibold text-slate-800">= {formatCurrencyNumber(monthNet, summaryCurrency)}</span>
              </div>
            </>
          )}
        </div>

        {preset.showSummaryPanels ? <aside className="mt-4 space-y-4 xl:mt-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-700">Income this month</div>
                <div className="mt-1 text-sm font-bold text-emerald-600">{formatCurrencyNumber(monthIncome, summaryCurrency)}</div>
              </div>
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold text-slate-400" aria-label="Income breakdown information">i</span>
            </div>
            <div className="mt-3 flex justify-center">
              <SummaryDonut entries={categoryBreakdowns.income} label="Income" currency={summaryCurrency} />
            </div>
            <div className="mt-4 space-y-2">
              {categoryBreakdowns.income.length ? categoryBreakdowns.income.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border" style={{ backgroundColor: `${entry.color}18`, borderColor: entry.color }}>
                      <IconDisplay icon={entry.icon} className="h-4 w-4 object-contain" />
                    </span>
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-3 font-medium text-slate-700">
                    <span>{formatCurrencyNumber(entry.value, summaryCurrency)}</span>
                    <span className="w-8 text-right text-[10px] text-slate-500">{Math.round(entry.percentage)}%</span>
                  </span>
                </div>
              )) : <div className="text-center text-[11px] text-slate-500">No income data</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-700">Expenses this month</div>
                <div className="mt-1 text-sm font-bold text-rose-600">{formatCurrencyNumber(monthExpense, summaryCurrency)}</div>
              </div>
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold text-slate-400" aria-label="Expense breakdown information">i</span>
            </div>
            <div className="mt-3 flex justify-center">
              <SummaryDonut entries={categoryBreakdowns.expense} label="Expenses" currency={summaryCurrency} />
            </div>
            <div className="mt-4 space-y-2">
              {categoryBreakdowns.expense.length ? categoryBreakdowns.expense.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border" style={{ backgroundColor: `${entry.color}18`, borderColor: entry.color }}>
                      <IconDisplay icon={entry.icon} className="h-4 w-4 object-contain" />
                    </span>
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-3 font-medium text-slate-700">
                    <span>{formatCurrencyNumber(entry.value, summaryCurrency)}</span>
                    <span className="w-8 text-right text-[10px] text-slate-500">{Math.round(entry.percentage)}%</span>
                  </span>
                </div>
              )) : <div className="text-center text-[11px] text-slate-500">No expense data</div>}
            </div>
          </div>
        </aside> : null}
        </div>
      </section>

      {editingTransaction ? (
        <TransactionEditDialog transaction={editingTransaction} accounts={accounts} categories={categories} goals={goals} tagSuggestions={tagSuggestions} onClose={() => setEditingTransaction(null)} />
      ) : null}
    </>
  );
}
