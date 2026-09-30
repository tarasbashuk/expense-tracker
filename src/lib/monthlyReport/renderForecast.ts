import type { MonthlyForecast } from './forecast';
import { escapeHtml } from './renderAnalysis';
import en from '@/locales/en-US.json';
import ukMessages from '@/locales/uk-UA.json';

export function renderMonthlyForecast(
  forecast: MonthlyForecast | null | undefined,
  currency: string,
  language: string,
) {
  const uk = language === 'UKR';

  if (!forecast) {
    return `<div class="section"><h2>${uk ? 'Прогноз витрат' : 'Expense forecast'}</h2><p>${uk ? 'AI-прогноз недоступний для цього звіту. Фактичні підсумки місяця наведено вище.' : 'The AI forecast is unavailable for this report. Actual monthly totals are shown above.'}</p></div>`;
  }

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

  const messages: Record<string, string> = uk ? ukMessages : en;
  const categoryRows = forecast.categories
    .map(
      (item) =>
        `<tr><td style="padding:6px 0">${escapeHtml(messages[`categories.${item.category}`] ?? item.category)}</td><td style="text-align:right;padding:6px 0">${format(item.total)}</td></tr>`,
    )
    .join('');
  const replacementRows = forecast.replacements
    .map(
      (item) =>
        `<li>${escapeHtml(item.description)} → ${escapeHtml(item.replacementDescription)}: ${escapeHtml(item.reason)}</li>`,
    )
    .join('');
  const optionalRows = forecast.optionalExpenses
    .map(
      (item) =>
        `<li>${escapeHtml(item.description)} — ${format(item.amount)}: ${escapeHtml(item.reason)}</li>`,
    )
    .join('');

  return `<div class="section">
    <h2>${title}</h2>
    <p style="font-size:24px;font-weight:bold">≈ ${format(forecast.total)}</p>
    <table style="width:100%;border-collapse:collapse"><tbody>${categoryRows}</tbody></table>
    <ul>
      <li>${uk ? 'Витрати за той самий місяць торік' : 'Expenses for the same month last year'} (${escapeHtml(forecast.historicalMonth)}): ${forecast.hasHistoricalExpenses ? format(forecast.historicalTotal) : uk ? 'немає даних' : 'unavailable'}</li>
      <li>${uk ? 'Вилучено старі регулярні платежі та знайдені перетини' : 'Removed old recurring payments and matched overlaps'}: −${format(forecast.replacedHistoricalTotal)}</li>
      <li>${uk ? 'Винесено в можливі додаткові витрати' : 'Separated as possible additional expenses'}: −${format(forecast.optionalTotal)}</li>
      <li>${uk ? 'Додано актуальні регулярні платежі' : 'Added current recurring payments'}: +${format(forecast.recurringTotal)}</li>
    </ul>
    ${!forecast.hasHistoricalExpenses ? `<p>${uk ? 'Частковий прогноз: враховано лише регулярні витрати.' : 'Partial forecast: only recurring expenses are included.'}</p>` : ''}
    ${optionalRows ? `<h3>${uk ? 'Можливі додаткові витрати' : 'Possible additional expenses'}</h3><ul>${optionalRows}</ul><p>${uk ? 'Разом із цими витратами' : 'Total including these expenses'}: ≈ ${format(forecast.totalWithOptional)}</p>` : ''}
    ${replacementRows ? `<h3>${uk ? 'Зіставлення платежів за оцінкою AI' : 'Payment matches estimated by AI'}</h3><ul>${replacementRows}</ul>` : ''}
    ${forecast.assumptions.length ? `<h3>${uk ? 'Припущення' : 'Assumptions'}</h3><ul>${forecast.assumptions.map((text) => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : ''}
    <p style="color:#6c757d;font-size:13px">${uk ? 'Орієнтовна сума, не бюджет. AI зіставляє платежі за змістом і визначає можливі разові витрати; ці припущення можуть бути помилковими. Підсумки обчислено зі збережених сум в основній валюті. Сезонні витрати можуть повторитися за іншою ціною. Транзакції не змінено.' : 'An estimate, not a budget. AI matches payments by meaning and identifies possible one-off expenses; these assumptions may be wrong. Totals are calculated from stored amounts in the default currency. Seasonal expenses may recur at a different price. Transactions are unchanged.'}</p>
  </div>`;
}
