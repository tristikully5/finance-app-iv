"use client";

import QuickAddPopover from "@/components/QuickAddPopover";
import { QuickAddAccountForm, QuickAddCategoryForm, QuickAddGoalForm, QuickAddTransactionForm } from "@/components/QuickAddForms";
import type { TransactionDialogPreset } from "@/components/transaction-dialog-presets";

type QuickAddShellProps = {
  kind: "account" | "category" | "goal" | "transaction";
  accounts?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string; type: string }>;
  goals?: Array<{ id: number; name: string }>;
  tagSuggestions?: string[];
  buttonClassName?: string;
  buttonContent?: React.ReactNode;
  categoryType?: "Expense" | "Income";
  wrapperClassName?: string;
  transactionPreset?: TransactionDialogPreset;
};

export default function QuickAddShell({ kind, accounts = [], categories = [], goals = [], tagSuggestions = [], buttonClassName, buttonContent, categoryType, wrapperClassName, transactionPreset }: QuickAddShellProps) {
  const title =
    kind === "account"
      ? "Add account"
      : kind === "category"
        ? "Add category"
        : kind === "goal"
          ? "Add goal"
          : "Add transaction";

  return (
    <QuickAddPopover title={title} buttonClassName={buttonClassName} buttonContent={buttonContent} wrapperClassName={wrapperClassName}>
      {kind === "account" ? (
        <QuickAddAccountForm />
      ) : kind === "category" ? (
        <QuickAddCategoryForm defaultType={categoryType} />
      ) : kind === "goal" ? (
        <QuickAddGoalForm />
      ) : (
        <QuickAddTransactionForm accounts={accounts} categories={categories} goals={goals} tagSuggestions={tagSuggestions} preset={transactionPreset} />
      )}
    </QuickAddPopover>
  );
}
