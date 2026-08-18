const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDashboardSummary } = require('./transactions.js');

test('calculateDashboardSummary totals income and expenses correctly', () => {
  const summary = calculateDashboardSummary([
    { amount: 1000, type: 'Income' },
    { amount: 250, type: 'Expense' },
    { amount: 75, type: 'Expense' },
  ]);

  assert.equal(summary.totalBalance, 675);
  assert.equal(summary.income, 1000);
  assert.equal(summary.expenses, 325);
});

test('calculateDashboardSummary handles no transactions', () => {
  const summary = calculateDashboardSummary([]);

  assert.equal(summary.totalBalance, 0);
  assert.equal(summary.income, 0);
  assert.equal(summary.expenses, 0);
});
