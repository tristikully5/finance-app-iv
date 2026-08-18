"use client";

import QuickAddPopover from "@/components/QuickAddPopover";
import { QuickAddAccountForm, QuickAddCategoryForm, QuickAddGoalForm, QuickAddTransactionForm } from "@/components/QuickAddForms";

type QuickAddShellProps = {
  kind: "account" | "category" | "goal" | "transaction";
  accounts?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string; type: string }>;
  goals?: Array<{ id: number; name: string }>;
  buttonClassName?: string;
  buttonContent?: React.ReactNode;
  categoryType?: "Expense" | "Income";
  wrapperClassName?: string;
};

export default function QuickAddShell({ kind, accounts = [], categories = [], goals = [], buttonClassName, buttonContent, categoryType, wrapperClassName }: QuickAddShellProps) {
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
        <QuickAddTransactionForm accounts={accounts} categories={categories} goals={goals} />
      )}
    </QuickAddPopover>
  );
}
