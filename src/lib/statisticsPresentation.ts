export function initialHalfYear(year: number, now = new Date()): number {
  return year === now.getFullYear() && now.getMonth() >= 6 ? 1 : 0;
}

export function yearlyPresentation(
  income: number[],
  expense: number[],
  counts: number[],
  year: number,
  now = new Date(),
) {
  const months = Array.from({ length: 12 }, (_, month) => {
    const hasData = counts[month] > 0;
    const future =
      year > now.getFullYear() ||
      (year === now.getFullYear() && month > now.getMonth());

    return {
      month,
      income: income[month] ?? 0,
      expense: expense[month] ?? 0,
      hasData,
      missing: future && !hasData,
      incomplete: year === now.getFullYear() && month === now.getMonth(),
    };
  });

  return {
    months,
    rows: months.filter((month) => month.hasData).reverse(),
    income: income.reduce((sum, value) => sum + value, 0),
    expense: expense.reduce((sum, value) => sum + value, 0),
    axisMax: Math.max(1, ...income, ...expense) * 1.1,
  };
}
