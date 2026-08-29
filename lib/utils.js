// Helper to ensure numbers are ALWAYS formatted with pure English digits (1, 2, 3, 4...)
export function formatNumber(val) {
  if (val === null || val === undefined || val === "") return "0";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("en-US", { useGrouping: true }).format(num);
}

export function formatCurrency(val) {
  return `${formatNumber(val)} ج.م`;
}
