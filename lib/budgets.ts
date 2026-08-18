export function buildMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthValue(value: string) {
  const match = /^([0-9]{4})-([0-9]{1,2})$/.exec(value);

  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, key: buildMonthKey(now.getFullYear(), now.getMonth() + 1) };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return { year, month, key: buildMonthKey(year, month) };
}

export function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
