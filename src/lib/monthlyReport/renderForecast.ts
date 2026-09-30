import type { MonthlyForecast } from './forecast';
import { escapeHtml } from './renderAnalysis';

export function renderMonthlyForecast(
  forecast: MonthlyForecast | null | undefined,
  currency: string,
  language: string,
) {
  if (!forecast) {
    return '';
  }

  const uk = language === 'UKR';
  const format = (amount: number) =>
    escapeHtml(
      new Intl.NumberFormat(uk ? 'uk-UA' : 'en-US', {
        style: 'currency',
        currency,
      }).format(amount),
    );
  const title = `${uk ? 'Прогноз витрат на' : 'Expense forecast for'} ${escapeHtml(forecast.month)}`;

  if (!forecast.hasHistoricalExpenses && !forecast.hasRecurringExpenses) {
    return `<div class="section"><h2>${title}</h2><p>${uk ? 'Недостатньо даних для прогнозу: немає витрат за цей місяць торік або актуальних регулярних платежів.' : 'Insufficient data: no expenses for the same month last year or current recurring payments.'}</p></div>`;
  }

  return `<div class="section">
    <h2>${title}</h2>
    <p style="font-size:24px;font-weight:bold">≈ ${format(forecast.total)}</p>
    <ul>
      <li>${uk ? 'Витрати за той самий місяць торік' : 'Expenses for the same month last year'} (${escapeHtml(forecast.historicalMonth)}): ${forecast.hasHistoricalExpenses ? format(forecast.historicalTotal) : uk ? 'немає даних' : 'unavailable'}</li>
      <li>${uk ? 'Вилучено старі регулярні платежі та знайдені перетини' : 'Removed old recurring payments and matched overlaps'}: −${format(forecast.replacedHistoricalTotal)}</li>
      <li>${uk ? 'Додано актуальні регулярні платежі' : 'Added current recurring payments'}: +${format(forecast.recurringTotal)}</li>
    </ul>
    ${!forecast.hasHistoricalExpenses ? `<p>${uk ? 'Частковий прогноз: враховано лише регулярні витрати.' : 'Partial forecast: only recurring expenses are included.'}</p>` : ''}
    <p style="color:#6c757d;font-size:13px">${uk ? 'Орієнтовна сума, не бюджет. Перетини визначено за однаковими описами й категоріями. Перейменовані платежі можуть дублюватися, а торішні разові покупки — не повторитися. Регулярні суми взято з поточного місяця, за відсутності — з попереднього; завершені повторення виключено. Використано збережені суми в основній валюті без прогнозування курсу.' : 'An estimate, not a budget. Overlaps are matched by identical descriptions and categories. Renamed payments may overlap, and last year’s one-off purchases may not recur. Recurring amounts use the current month where available, otherwise the previous month; expired recurrences are excluded. Stored amounts in the default currency are used without predicting exchange rates.'}</p>
  </div>`;
}
