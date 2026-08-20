export type IconOption = {
  value: string;
  label: string;
};

export const defaultIconValue = "/icons/icons8-home-48-png-8d685785-bf65-4df0-80d9-6520d7d8c7e1.png";
export const defaultTransferIconValue = "/icons/icons8-right-arrow-48-png-4d311a54-9fd2-4c56-a0ba-4e2ae9f3c464.png";
export const defaultAllocateIconValue = defaultTransferIconValue;
export const defaultExpenseColorValue = "#e11d48";
export const defaultIncomeColorValue = "#16a34a";
export const defaultTransferColorValue = "#7c3aed";
export const defaultAllocateColorValue = "#7c3aed";
const defaultIconStorageKey = "finance:default-icon";
const expenseIconStorageKey = "finance:expense-icon";
const incomeIconStorageKey = "finance:income-icon";
const transferIconStorageKey = "finance:transfer-icon";
const allocateIconStorageKey = "finance:allocate-icon";
const expenseColorStorageKey = "finance:expense-color";
const incomeColorStorageKey = "finance:income-color";
const transferColorStorageKey = "finance:transfer-color";
const allocateColorStorageKey = "finance:allocate-color";

export function getDefaultIconValue() {
  if (typeof window === "undefined") {
    return defaultIconValue;
  }

  const stored = window.localStorage.getItem(defaultIconStorageKey);
  return isCustomIcon(stored) ? stored : defaultIconValue;
}

export function getCategoryTypeDefaultIconValue(type: "Expense" | "Income" | "Transfer" | "Allocate") {
  if (typeof window === "undefined") {
    return type === "Transfer" ? defaultTransferIconValue : type === "Allocate" ? defaultAllocateIconValue : defaultIconValue;
  }

  const storageKey = type === "Expense" ? expenseIconStorageKey : type === "Income" ? incomeIconStorageKey : type === "Transfer" ? transferIconStorageKey : allocateIconStorageKey;
  const stored = window.localStorage.getItem(storageKey);
  return isCustomIcon(stored) ? stored : type === "Transfer" ? defaultTransferIconValue : type === "Allocate" ? defaultAllocateIconValue : defaultIconValue;
}

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function getCategoryTypeDefaultColorValue(type: "Expense" | "Income" | "Transfer" | "Allocate") {
  if (typeof window === "undefined") {
    return type === "Expense" ? defaultExpenseColorValue : type === "Income" ? defaultIncomeColorValue : type === "Transfer" ? defaultTransferColorValue : defaultAllocateColorValue;
  }

  const storageKey = type === "Expense" ? expenseColorStorageKey : type === "Income" ? incomeColorStorageKey : type === "Transfer" ? transferColorStorageKey : allocateColorStorageKey;
  const stored = window.localStorage.getItem(storageKey);
  return isHexColor(stored) ? stored : type === "Expense" ? defaultExpenseColorValue : type === "Income" ? defaultIncomeColorValue : type === "Transfer" ? defaultTransferColorValue : defaultAllocateColorValue;
}

export function setDefaultIconValue(value: string | null | undefined) {
  const nextValue = isCustomIcon(value) ? value : defaultIconValue;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(defaultIconStorageKey, nextValue);
  }

  return nextValue;
}

export function setCategoryTypeDefaultIconValue(type: "Expense" | "Income" | "Transfer" | "Allocate", value: string | null | undefined) {
  const defaultValue = type === "Expense" ? defaultIconValue : type === "Income" ? defaultIconValue : type === "Transfer" ? defaultTransferIconValue : defaultAllocateIconValue;
  const nextValue = isCustomIcon(value) ? value : defaultValue;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(type === "Expense" ? expenseIconStorageKey : type === "Income" ? incomeIconStorageKey : type === "Transfer" ? transferIconStorageKey : allocateIconStorageKey, nextValue);
  }

  return nextValue;
}

export function setCategoryTypeDefaultColorValue(type: "Expense" | "Income" | "Transfer" | "Allocate", value: string | null | undefined) {
  const nextValue = isHexColor(value) ? value : type === "Expense" ? defaultExpenseColorValue : type === "Income" ? defaultIncomeColorValue : type === "Transfer" ? defaultTransferColorValue : defaultAllocateColorValue;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(type === "Expense" ? expenseColorStorageKey : type === "Income" ? incomeColorStorageKey : type === "Transfer" ? transferColorStorageKey : allocateColorStorageKey, nextValue);
  }

  return nextValue;
}

export function isCustomIcon(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\/icons\/[^/]+\.png$/i.test(value);
}
