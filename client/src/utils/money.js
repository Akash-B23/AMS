export function formatPaiseAsRupees(paise) {
  const value = Number(paise ?? 0) / 100;
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

export function rupeesToPaise(rupees) {
  const value = Number.parseFloat(rupees);
  if (Number.isNaN(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function formatBillingPeriod(isoDate) {
  if (!isoDate) return "—";
  const [year, month] = String(isoDate).slice(0, 10).split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return "—";
  const [year, month, day] = String(isoDate).slice(0, 10).split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
