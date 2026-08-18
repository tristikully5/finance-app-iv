export type TransactionSummary = {
  totalBalance: number;
  income: number;
  expenses: number;
};

export function calculateDashboardSummary(
  transactions: Array<{ amount: number; type: string }>
): TransactionSummary {
  const income = transactions
    .filter((transaction) => transaction.type === 'Income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === 'Expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    totalBalance: income - expenses,
    income,
    expenses,
  };
}
