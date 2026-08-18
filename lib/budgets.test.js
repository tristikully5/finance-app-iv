const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMonthKey, parseMonthValue, formatMonthLabel } = require('./budgets');

test('buildMonthKey uses year-month padding', () => {
  assert.equal(buildMonthKey(2026, 8), '2026-08');
  assert.equal(buildMonthKey(2026, 1), '2026-01');
});

test('parseMonthValue accepts a year-month string and returns a normalized object', () => {
  assert.deepEqual(parseMonthValue('2026-08'), { year: 2026, month: 8, key: '2026-08' });
  assert.deepEqual(parseMonthValue('2026-1'), { year: 2026, month: 1, key: '2026-01' });
});

test('formatMonthLabel renders a human-readable label', () => {
  assert.equal(formatMonthLabel(2026, 8), 'Aug 2026');
  assert.equal(formatMonthLabel(2026, 1), 'Jan 2026');
});
