import type { AnalysisInput } from './data';
import type { MonthlyAnalysis } from './analysis';

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!,
  );

export function renderMonthlyAnalysis(
  analysis: MonthlyAnalysis | null | undefined,
  transactions: AnalysisInput['transactions'],
  language: string,
) {
  if (!analysis) return '';
  const uk = language === 'UKR';
  const byRef = new Map(transactions.map((t) => [t.ref, t]));
  const groups = analysis.duplicates
    .map((group) => {
      const rows = group.refs
        .map((ref) => {
          const t = byRef.get(ref)!;
          const amount = new Intl.NumberFormat(uk ? 'uk-UA' : 'en-US', {
            style: 'currency',
            currency: t.currency,
          }).format(t.amount);

          return `<li>${escapeHtml(t.date)} · ${escapeHtml(t.description)} · <strong>${escapeHtml(amount)}</strong></li>`;
        })
        .join('');

      return `<div style="padding:12px 0;border-bottom:1px solid #e9ecef"><ul>${rows}</ul><p>${escapeHtml(group.reason)}</p></div>`;
    })
    .join('');

  return `
    <div class="section">
      <h2>🔎 ${uk ? 'Можливі дублікати' : 'Possible duplicates'}</h2>
      ${groups || `<p>${uk ? 'AI не позначив можливих дублікатів. Це не гарантує їх відсутності.' : 'AI did not flag possible duplicates. This does not guarantee there are none.'}</p>`}
      <p style="color:#6c757d;font-size:13px">${uk ? 'Це припущення для перевірки. Записи й підсумки звіту не змінено.' : 'These are suggestions to review. Transactions and report totals are unchanged.'}</p>
    </div>
    ${
      analysis.insights.length
        ? `<div class="section">
      <h2>✨ ${uk ? 'Місяць очима AI' : 'Your month through AI’s eyes'}</h2>
      ${analysis.insights.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}
    </div>`
        : ''
    }
  `;
}
