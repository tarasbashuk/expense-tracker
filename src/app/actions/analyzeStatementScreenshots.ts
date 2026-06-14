'use server';

import OpenAI from 'openai';
import { currentUser } from '@clerk/nextjs/server';
import { Currency, Language, TransactionType } from '@prisma/client';

import { db } from '@/lib/db';
import { getCurrenciesFromMap } from '@/lib/currenciesRate.utils';
import { convertAmountToDefaultCurrency } from '@/lib/currency/convertAmountToDefaultCurrency';
import { getMonobankRates } from '@/lib/monobankRatesCache';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import {
  findMerchantRuleMatch,
  formatMerchantRulesForPrompt,
  getMerchantCategoryRules,
} from '@/lib/merchantRules/merchantRules';
import { applyDuplicateMatches } from '@/lib/importDuplicateMatching/importDuplicateMatching';

const MAX_SCREENSHOTS = 8;
const MAX_FILE_SIZE_MB = 8;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export type ImportReviewStatus =
  | 'new'
  | 'alreadyExists'
  | 'possibleDuplicate'
  | 'needsReview'
  | 'ignored';

export type ScreenshotImportCandidate = {
  sourceImageIndex: number;
  status: ImportReviewStatus;
  date: string | null;
  text: string;
  rawDescription: string;
  amount: number | null;
  amountDefaultCurrency?: number | null;
  currency: Currency | null;
  type: TransactionType | null;
  category: string;
  confidence: number;
  matchReason?: string;
  warnings: string[];
};

export type ScreenshotImportResult = {
  rows?: ScreenshotImportCandidate[];
  warnings?: string[];
  error?: string;
};

type ModelImportResult = {
  transactions: ScreenshotImportCandidate[];
  warnings: string[];
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sourceImageIndex: {
            type: 'integer',
            description: 'Zero-based index of the uploaded image.',
          },
          status: {
            type: 'string',
            enum: [
              'new',
              'alreadyExists',
              'possibleDuplicate',
              'needsReview',
              'ignored',
            ],
          },
          date: {
            type: ['string', 'null'],
            description:
              'Normalize any visible or inferred transaction/receipt date to YYYY-MM-DD. Source dates may use any locale or format.',
          },
          text: {
            type: 'string',
            description:
              'Clean user-facing transaction text, usually merchant/store name.',
          },
          rawDescription: {
            type: 'string',
            description: 'Raw visible transaction label/subtitle.',
          },
          amount: {
            type: ['number', 'null'],
            description:
              'Absolute transaction or receipt total amount. Use positive values; type/status carries meaning.',
          },
          currency: {
            type: ['string', 'null'],
            enum: [...Object.values(Currency), null],
          },
          type: {
            type: ['string', 'null'],
            enum: [...Object.values(TransactionType), null],
          },
          category: {
            type: 'string',
            description:
              'One of the provided category enum values, or "others" when uncertain.',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          matchReason: {
            type: 'string',
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'sourceImageIndex',
          'status',
          'date',
          'text',
          'rawDescription',
          'amount',
          'currency',
          'type',
          'category',
          'confidence',
          'matchReason',
          'warnings',
        ],
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['transactions', 'warnings'],
} as const;

const normalizeMimeType = (type: string) => {
  if (type === 'image/jpg') return 'image/jpeg';

  return type;
};

const clampConfidence = (value: number) => {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
};

const buildPrompt = (
  referenceDate: string,
  userMerchantRules: string,
  responseLanguage: Language,
) => {
  const expenseCategories = EXPENSE_CATEGORIES_LIST.map(
    ({ value, label }) => `${value}: ${label}`,
  ).join('\n');
  const incomeCategories = INCOME_CATEGORIES_LIST.map(
    ({ value, label }) => `${value}: ${label}`,
  ).join('\n');
  const responseLanguageName =
    responseLanguage === Language.UKR ? 'Ukrainian' : 'English';

  return `Extract financial transactions from the uploaded screenshots. The screenshots can be mobile banking history, card transaction lists, payment confirmations, receipts, invoices, or a mix of these.

Reference date for relative labels such as "Today" or "Yesterday": ${referenceDate}.

Response language for explanatory text: ${responseLanguageName}.

Supported currencies: ${Object.values(Currency).join(', ')}.

Expense categories:
${expenseCategories}

Income categories:
${incomeCategories}

Useful merchant/category hints:
- MERCADONA, LIDL, BIEDRONKA, CARREFOUR, AUCHAN, ALDI, KAUFLAND, ZABKA, SUPERMARKET, MARKET -> groceries.
- UBER, BOLT, TAXI, TRAIN, BUS, METRO, PARKING, APARC -> transport or auto, depending on context.
- AMAZON, ALLEGRO, ZALANDO, IKEA, DECATHLON -> shopping unless the visible merchant context is more specific.
- VETERINARIA, VET, PETSHOP, ZOO -> pets.
- RESTAURANT, CAFE, BAR, MCDONALD, KFC, BURGER, COSTA, STARBUCKS -> dining.

User-specific merchant rules:
${userMerchantRules}

Rules:
- Write matchReason and warnings in ${responseLanguageName}.
- Keep structured enum fields exactly as specified: status, currency, type, and category must not be translated.
- Keep merchant/store names in text and rawDescription in their original visible language; do not translate merchant names.
- First decide what each screenshot shows: bank/card transaction history, receipt/invoice/payment document, or irrelevant content.
- Extract only transactions or receipts that are visible in the screenshots.
- For bank/card history, return one row per visible transaction.
- For receipts/invoices/payment confirmations, return one row per receipt/document using the merchant/store name and the final paid total. Do not return individual receipt line items yet.
- If multiple uploaded screenshots are clearly different parts of the same single receipt/document, merge them into one transaction when confidence is high. If unsure, use status="needsReview" and add a warning.
- Source dates can appear in any locale or format. Always output date as YYYY-MM-DD.
- If a date group says "Yesterday", resolve it from the reference date.
- For ambiguous numeric dates such as 06/07/2026, infer locale from screenshot language/bank region when possible; otherwise use status="needsReview" and add a warning.
- Amounts should be absolute positive numbers. Use type=Expense for negative/debit card payments and type=Income for real positive income/refunds.
- If both an original/local merchant amount and a converted/account-settlement amount are visible, use the original/local merchant amount and currency as amount/currency. Add a warning that a converted account amount was also visible.
- If only the account/displayed converted amount is visible, use that amount/currency and add a warning when the original merchant currency may be hidden or cut off.
- For receipts, use the actual receipt/payment currency. Do not replace it with a card/account conversion currency.
- Mark currency exchange, own transfers, internal transfers, card settlements, and balance movements as status="ignored". Do not classify currency exchange as income or expense.
- Do NOT mark visible card purchases as ignored only because they are under Upcoming Transactions, Card blockade, Card authorization, or pending/hold sections.
- Upcoming/card authorization purchases with a visible merchant and amount should usually be status="new", type=Expense, with the best category inferred from the merchant.
- Use status="needsReview" for upcoming/card authorization rows only when the row is partially cut off, the amount/currency/date is ambiguous, or it may be a refund.
- If a positive card row looks like a refund, use status="needsReview" and type=Income.
- For a mixed retail receipt, choose the dominant category by total value when visible. If the mix is unclear, use the merchant/store category and add a warning such as "Mixed receipt; category may need review."
- Do not split supermarket/retail receipts into groceries/home/shopping sub-transactions in this version.
- Preserve merchant names exactly enough to be useful, but remove obvious card processor noise only if confidence is high.
- If merchant/category is uncertain, use category="others" and lower confidence.
- Do not invent merchant details that are not visible.
- If duplicate rows appear because screenshots overlap, include them once when you are confident they are the same visible transaction.
- Use matchReason to briefly explain status/category choices.`;
};

export default async function analyzeStatementScreenshots(
  formData: FormData,
): Promise<ScreenshotImportResult> {
  const user = await currentUser();
  const userId = user?.id;

  if (!userId) {
    return { error: 'User not found' };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is missing' };
  }

  const settings = await db.settings.findUnique({
    where: { clerkUserId: userId },
    select: { defaultCurrency: true, encryptData: true, language: true },
  });

  if (settings?.encryptData) {
    return {
      error: 'AI import is unavailable while data encryption is enabled',
    };
  }

  const files = formData
    .getAll('screenshots')
    .filter((value): value is File => value instanceof File);
  const referenceDate =
    formData.get('referenceDate')?.toString() ||
    new Date().toISOString().slice(0, 10);

  if (!files.length) {
    return { error: 'Please upload at least one screenshot' };
  }

  if (files.length > MAX_SCREENSHOTS) {
    return { error: `Please upload up to ${MAX_SCREENSHOTS} screenshots` };
  }

  try {
    const merchantRules = await getMerchantCategoryRules(userId);
    const imageParts = await Promise.all(
      files.map(async (file, index) => {
        const mimeType = normalizeMimeType(file.type);

        if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
          throw new Error(
            `Unsupported image type: ${file.type || file.name}. Please use PNG, JPG, or WEBP screenshots.`,
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `${file.name} is larger than ${MAX_FILE_SIZE_MB} MB`,
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        return {
          type: 'input_image' as const,
          image_url: `data:${mimeType};base64,${buffer.toString('base64')}`,
          detail: 'high' as const,
          index,
        };
      }),
    );
    const openai = new OpenAI();
    const model =
      process.env.OPENAI_TRANSACTION_IMPORT_MODEL || 'gpt-5.4-mini';
    console.log('[AI import] analyze screenshots request', {
      model,
      referenceDate,
      merchantRules: merchantRules.length,
      files: files.map((file, index) => ({
        index,
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    });
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildPrompt(
                referenceDate,
                formatMerchantRulesForPrompt(merchantRules),
                settings?.language || Language.ENG,
              ),
            },
            ...imageParts.map(({ index: _index, ...part }) => part),
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'statement_screenshot_import',
          strict: true,
          schema,
        },
      },
    });

    console.log('[AI import] raw response output_text', response.output_text);

    const parsed = JSON.parse(response.output_text) as ModelImportResult;
    console.log('[AI import] parsed response', JSON.stringify(parsed, null, 2));

    const rows = parsed.transactions.map((row) => ({
      ...row,
      confidence: clampConfidence(row.confidence),
      warnings: row.warnings || [],
      category:
        findMerchantRuleMatch(row.text, merchantRules)?.category ||
        row.category ||
        'others',
    }));

    let conversionWarnings: string[] = [];
    let currenciesMap: Record<string, number> | null = null;
    const shouldConvertRows = rows.some(
      (row) =>
        row.amount &&
        row.currency &&
        settings?.defaultCurrency &&
        row.currency !== settings.defaultCurrency,
    );

    if (shouldConvertRows) {
      try {
        currenciesMap = getCurrenciesFromMap(await getMonobankRates());
      } catch (error) {
        console.error('Currency conversion failed for import preview:', error);
        conversionWarnings = [
          'Unable to fetch currency rates for preview conversion. You can still review rows, but converted amounts will be empty.',
        ];
      }
    }

    const rowsWithDefaultAmounts = rows.map((row) => {
      if (!row.amount || !row.currency || !settings?.defaultCurrency) {
        return { ...row, amountDefaultCurrency: null };
      }

      if (row.currency === settings.defaultCurrency) {
        return { ...row, amountDefaultCurrency: row.amount };
      }

      const convertedAmount = currenciesMap
        ? convertAmountToDefaultCurrency({
            amount: row.amount,
            fromCurrency: row.currency,
            defaultCurrency: settings.defaultCurrency,
            currenciesMap,
          })
        : null;

      return {
        ...row,
        amountDefaultCurrency: convertedAmount,
        warnings: convertedAmount
          ? row.warnings
          : [
              ...row.warnings,
              `Unable to calculate amount in ${settings.defaultCurrency}.`,
            ],
      };
    });
    const rowsWithDuplicateMatches = await applyDuplicateMatches(
      userId,
      rowsWithDefaultAmounts,
    );
    console.log(
      '[AI import] normalized rows',
      JSON.stringify(rowsWithDuplicateMatches, null, 2),
    );

    return {
      rows: rowsWithDuplicateMatches,
      warnings: [...(parsed.warnings || []), ...conversionWarnings],
    };
  } catch (error: any) {
    console.error('OpenAI screenshot import error:', error);

    return {
      error:
        error?.message ||
        'Unable to analyze screenshots. Please try again later.',
    };
  }
}
