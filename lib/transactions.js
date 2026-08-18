function calculateDashboardSummary(transactions) {
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

module.exports = {
  calculateDashboardSummary,
};
