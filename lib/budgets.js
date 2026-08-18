function buildMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthValue(value) {
  const match = /^([0-9]{4})-([0-9]{1,2})$/.exec(value);

  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, key: buildMonthKey(now.getFullYear(), now.getMonth() + 1) };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return { year, month, key: buildMonthKey(year, month) };
}

function formatMonthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

module.exports = {
  buildMonthKey,
  parseMonthValue,
  formatMonthLabel,
};
