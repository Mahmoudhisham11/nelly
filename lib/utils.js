// Helper to ensure monetary numbers are rounded properly to 2 decimal places
export function roundCurrency(val) {
  const num = Number(val) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Helper to ensure numbers are ALWAYS formatted with pure English digits (1, 2, 3, 4...)
export function formatNumber(val) {
  if (val === null || val === undefined || val === "") return "0";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat("en-US", { 
    useGrouping: true,
    maximumFractionDigits: 2 
  }).format(num);
}

export function formatCurrency(val) {
  return `${formatNumber(val)} ج.م`;
}

