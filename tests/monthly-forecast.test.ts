import { expect, test } from 'vitest';
import {
  buildForecastInput,
  calculateForecast,
  getForecastPeriods,
} from '@/lib/monthlyReport/forecast';
import { renderMonthlyForecast } from '@/lib/monthlyReport/renderForecast';
import { transaction } from './fixtures';

const now = new Date('2026-09-01T09:00:00Z');
const historical = (overrides: Parameters<typeof transaction>[0] = {}) =>
  transaction({ date: new Date('2025-09-15'), ...overrides });

const recurring = (overrides: Parameters<typeof transaction>[0] = {}) =>
  transaction({ isRecurring: true, ...overrides });

const emptyDecisions = () => ({
  replacements: [],
  optionalExpenses: [],
  assumptions: [],
});

const exampleInput = () =>
  buildForecastInput(
    [
      historical({
        text: 'School tuition',
        category: 'education',
        amountDefaultCurrency: 500,
      }),
      historical({
        text: 'Books',
        category: 'education',
        amountDefaultCurrency: 100,
      }),
      historical({
        text: 'Phone',
        category: 'gadgets',
        amountDefaultCurrency: 700,
      }),
      historical({
        text: 'Annual vehicle service',
        category: 'auto',
        amountDefaultCurrency: 600,
      }),
      recurring({
        text: 'Old school name',
        category: 'education',
        amountDefaultCurrency: 650,
      }),
      recurring({
        text: 'Colegio merchant',
        category: 'education',
        date: new Date('2026-09-03'),
        amountDefaultCurrency: 800,
      }),
    ],
    now,
  );

const exampleDecisions = () => ({
  replacements: [
    {
      ref: 1,
      replacementRef: 6,
      reason: 'Same school tuition with a new name and price.',
    },
    {
      ref: 5,
      replacementRef: 6,
      reason: 'Current school payment replaces the previous month.',
    },
  ],
  optionalExpenses: [
    { ref: 3, reason: 'A phone purchase may not repeat annually.' },
  ],
  assumptions: [
    'Annual vehicle maintenance is retained at its historical price.',
  ],
});

test('semantic decisions replace school across both periods, retain books and service, and separate a phone purchase', () => {
  const input = exampleInput();

  const result = calculateForecast(input, exampleDecisions());

  expect(result.historicalTotal).toBe(1900);
  expect(result.replacedHistoricalTotal).toBe(500);
  expect(result.recurringTotal).toBe(800);
  expect(result.total).toBe(1500);
  expect(result.optionalTotal).toBe(700);
  expect(result.totalWithOptional).toBe(2200);
  expect(result.categories).toEqual([
    { category: 'education', total: 900 },
    { category: 'auto', total: 600 },
  ]);
  expect(input.transactions).toHaveLength(6);
});

test('raw input separates periods, strips private fields and excludes expired recurrence, income and repayments', () => {
  const input = buildForecastInput(
    [
      historical(),
      recurring({ recurringEndDate: new Date('2026-09-11') }),
      recurring({ recurringEndDate: new Date('2026-09-12') }),
      recurring({ date: new Date('2026-09-01') }),
      historical({ type: 'Income' }),
      historical({ category: 'CCRepayment' }),
      historical({ date: new Date('2025-10-01') }),
      transaction({ date: new Date('2026-09-04') }),
    ],
    now,
  );

  expect(input.transactions.map((r) => r.source)).toEqual([
    'historical',
    'previousRecurring',
    'currentRecurring',
  ]);
  expect(input.transactions.map((r) => r.ref)).toEqual([1, 2, 3]);
  expect(JSON.stringify(input)).not.toContain('userId');
  expect(JSON.stringify(input)).not.toContain('test-user');
  expect(JSON.stringify(input)).not.toContain('createdAt');
  expect(input.transactions[1].recurringEndDate).toBe('2026-09-12');
});

test('handles January and leap February recurrence boundaries', () => {
  const periods = getForecastPeriods(new Date('2026-01-31T23:00:00Z'));
  const input = buildForecastInput(
    [
      recurring({
        date: new Date('2024-01-31'),
        recurringEndDate: new Date('2024-02-29'),
      }),
      recurring({
        date: new Date('2024-01-30'),
        recurringEndDate: new Date('2024-02-28'),
      }),
    ],
    new Date('2024-02-01'),
  );

  expect(periods.previousStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  expect(periods.historicalStart.toISOString()).toBe(
    '2025-01-01T00:00:00.000Z',
  );
  expect(input.transactions).toHaveLength(1);
});

test('removes historical recurring records, adds new obligations and sums decimals without float drift', () => {
  const input = buildForecastInput(
    [
      historical({ isRecurring: true, amountDefaultCurrency: 50 }),
      recurring({ text: 'Subscription A', amountDefaultCurrency: 0.1 }),
      recurring({ text: 'Subscription B', amountDefaultCurrency: 0.2 }),
    ],
    now,
  );

  const result = calculateForecast(input, emptyDecisions());

  expect(result.total).toBe(0.3);
  expect(result.replacedHistoricalTotal).toBe(50);
});

test.each([
  [{ ref: 99, replacementRef: 6, reason: 'Unknown ref' }],
  [{ ref: 1, replacementRef: 1, reason: 'Self replacement' }],
  [{ ref: 6, replacementRef: 5, reason: 'Reversed priority' }],
  [{ ref: 1, replacementRef: 2, reason: 'Historical target' }],
  [{ ref: 1, replacementRef: 6, reason: '' }],
  [{ ref: '1', replacementRef: 6, reason: 'Wrong type' }],
  [
    { ref: 1, replacementRef: 6, reason: 'One' },
    { ref: 1, replacementRef: 5, reason: 'Two' },
  ],
  [
    { ref: 1, replacementRef: 5, reason: 'Chain' },
    { ref: 5, replacementRef: 6, reason: 'Chain' },
  ],
])('rejects invalid replacement graph %#', (...replacements) => {
  expect(() =>
    calculateForecast(exampleInput(), { ...emptyDecisions(), replacements }),
  ).toThrow('Invalid forecast decisions');
});

test.each([
  [{ ref: 99, reason: 'Unknown' }],
  [{ ref: 5, reason: 'Cannot remove active obligations' }],
  [{ ref: 1, reason: 'Already replaced' }],
  [
    { ref: 3, reason: 'Phone' },
    { ref: 3, reason: 'Phone twice' },
  ],
])(
  'rejects optional expenses with invalid or conflicting refs %#',
  (...optionalExpenses) => {
    expect(() =>
      calculateForecast(exampleInput(), {
        ...exampleDecisions(),
        optionalExpenses,
      }),
    ).toThrow();
  },
);

test('rejects malformed decisions and optional historical recurring payments', () => {
  const input = buildForecastInput([historical({ isRecurring: true })], now);

  expect(() => calculateForecast(input, null)).toThrow();
  expect(() =>
    calculateForecast(input, { ...emptyDecisions(), assumptions: [123] }),
  ).toThrow();
  expect(() =>
    calculateForecast(input, {
      ...emptyDecisions(),
      optionalExpenses: [{ ref: 1, reason: 'Already excluded' }],
    }),
  ).toThrow();
  expect(() =>
    buildForecastInput([historical({ amount: NaN })], now),
  ).toThrow();
});

test('email renders localized categories, substitutions, optional totals and escapes all model content', () => {
  const decisions = exampleDecisions();
  decisions.assumptions = ['<script>bad</script>'];
  decisions.replacements[0].reason = '<img src=x>';
  const input = exampleInput();
  input.transactions[2].description = '<Phone>';

  const result = calculateForecast(input, decisions);
  const html = renderMonthlyForecast(result, 'EUR', 'UKR');

  expect(html).toContain('Можливі додаткові витрати');
  expect(html).toContain('Освіта');
  expect(html).toContain('Colegio merchant');
  expect(html).toContain('&lt;Phone&gt;');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<img');
  expect(html).toContain('2 200,00');
});

test('distinguishes partial, empty and unavailable forecasts without showing invented zero totals', () => {
  const partial = calculateForecast(
    buildForecastInput([recurring()], now),
    emptyDecisions(),
  );
  const empty = calculateForecast(
    buildForecastInput([], now),
    emptyDecisions(),
  );

  expect(renderMonthlyForecast(partial, 'EUR', 'UKR')).toContain(
    'Частковий прогноз',
  );
  expect(renderMonthlyForecast(partial, 'EUR', 'ENG')).toContain(
    'Partial forecast',
  );
  expect(renderMonthlyForecast(empty, 'EUR', 'ENG')).toContain(
    'Insufficient data',
  );
  expect(renderMonthlyForecast(empty, 'EUR', 'ENG')).not.toContain('≈');
  expect(renderMonthlyForecast(null, 'EUR', 'ENG')).toContain('unavailable');
  expect(renderMonthlyForecast(null, 'EUR', 'ENG')).not.toContain('≈');
});

test('a combined current subscription replaces multiple old charges without adding the target twice', () => {
  const input = buildForecastInput(
    [
      historical({ text: 'News A', amountDefaultCurrency: 4 }),
      historical({ text: 'News B', amountDefaultCurrency: 6 }),
      recurring({ text: 'News A', amountDefaultCurrency: 5 }),
      recurring({ text: 'News B', amountDefaultCurrency: 7 }),
      recurring({
        text: 'News A+B',
        amountDefaultCurrency: 9,
        date: new Date('2026-09-10'),
      }),
      historical({ text: 'Separate purchase', amountDefaultCurrency: 20 }),
    ],
    now,
  );

  const result = calculateForecast(input, {
    replacements: [1, 2, 3, 4].map((ref) => ({
      ref,
      replacementRef: 5,
      reason: 'The two subscriptions are now billed as one bundle.',
    })),
    optionalExpenses: [],
    assumptions: [],
  });

  expect(result.historicalTotal).toBe(30);
  expect(result.replacedHistoricalTotal).toBe(10);
  expect(result.recurringTotal).toBe(9);
  expect(result.total).toBe(29);
  expect(result.replacements).toHaveLength(4);
});

test('invalid replacement direction has a distinct diagnostic code', () => {
  expect(() =>
    calculateForecast(exampleInput(), {
      ...emptyDecisions(),
      replacements: [
        { ref: 6, replacementRef: 5, reason: 'Reversed direction' },
      ],
    }),
  ).toThrow(expect.objectContaining({ code: 'invalid_replacement_direction' }));
});
