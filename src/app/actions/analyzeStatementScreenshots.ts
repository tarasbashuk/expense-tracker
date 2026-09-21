'use server';

import OpenAI from 'openai';
import * as Sentry from '@sentry/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { Currency, Language, TransactionType } from '@prisma/client';

import { db } from '@/lib/db';
import { ExpenseCategory } from '@/constants/types';
import {
  getExpenseCategoriesList,
  getIncomeCategoriesList,
  isCreditCardCategory,
} from '@/constants/constants';
import {
  findMerchantRuleMatch,
  formatMerchantRulesForPrompt,
  getMerchantCategoryRules,
  isAmbiguousMerchant,
  normalizeMerchantPattern,
} from '@/lib/merchantRules/merchantRules';
import { applyDuplicateMatches } from '@/lib/importDuplicateMatching/importDuplicateMatching';

const MAX_FILES = 8;
const MAX_IMAGE_SIZE_MB = 8;
const MAX_PDF_SIZE_MB = 20;
const MAX_TOTAL_SIZE_MB = 40;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';
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
  sourceFileIndex: number;
  status: ImportReviewStatus;
  date: string | null;
  text: string;
  rawDescription: string;
  amount: number | null;
  amountDefaultCurrency?: number | null;
  currency: Currency | null;
  type: TransactionType | null;
  category: string;
  allowWeakMerchantDateMatch?: boolean;
  confidence: number;
  matchReason?: string;
  warnings: string[];
  receiptGroupId: string | null;
  receiptTotal: number | null;
  isReceiptCategorySplit: boolean;
  receiptLineItems: Array<{
    description: string;
    amount: number;
    category: string;
  }>;
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
          sourceFileIndex: {
            type: 'integer',
            description: 'Zero-based index of the uploaded source file.',
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
          receiptGroupId: {
            type: ['string', 'null'],
            description:
              'Identifier shared only by category rows split from the same grocery-store receipt; otherwise null.',
          },
          receiptTotal: {
            type: ['number', 'null'],
            description:
              'Visible final paid total when receiptLineItems contains a grocery-store receipt; otherwise null.',
          },
          isReceiptCategorySplit: {
            type: 'boolean',
            description:
              'Always false in the model response. The server sets it after reconciling and grouping receiptLineItems.',
          },
          receiptLineItems: {
            type: 'array',
            description:
              'Purchased line items for one grocery-store receipt. Empty for every other document type.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                description: {
                  type: 'string',
                  description: 'Short visible product description.',
                },
                amount: {
                  type: 'number',
                  description:
                    'Full line total after quantity and item-level discounts, not the unit price.',
                },
                category: {
                  type: 'string',
                  description: 'One of the provided expense category enum values.',
                },
              },
              required: ['description', 'amount', 'category'],
            },
          },
        },
        required: [
          'sourceFileIndex',
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
          'receiptGroupId',
          'receiptTotal',
          'isReceiptCategorySplit',
          'receiptLineItems',
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

const normalizeMimeType = (type: string, fileName = '') => {
  const normalizedType = type.toLowerCase();
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedType === 'image/jpg') return 'image/jpeg';
  if (normalizedType === 'application/x-pdf') return PDF_MIME_TYPE;
  if (!normalizedType && normalizedFileName.endsWith('.pdf')) {
    return PDF_MIME_TYPE;
  }

  return normalizedType;
};

const clampConfidence = (value: number) => {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
};

const toMinorUnits = (value: number) => Math.round(value * 100);

const getReceiptReconciliationWarning = (language: Language) =>
  language === Language.UKR
    ? 'Чек не розбито за категоріями, оскільки сума категорій або реквізити групи не збігаються з фінальною сумою чека. Перевірте запис перед збереженням.'
    : 'The receipt was not split by category because the category totals or group details do not match the final receipt total. Review it before saving.';

const getReceiptSplitReason = (language: Language, receiptTotal: number) =>
  language === Language.UKR
    ? `Позиції продуктового чека згруповано за категоріями; сума категорій перевірена та дорівнює фінальній сумі ${receiptTotal.toFixed(2)}.`
    : `Grocery receipt items were grouped by category; the category sum was verified against the ${receiptTotal.toFixed(2)} final total.`;

const reconcileReceiptCategorySplits = (
  transactions: ScreenshotImportCandidate[],
  language: Language,
): ScreenshotImportCandidate[] => {
  const createFallback = (group: ScreenshotImportCandidate[]) => {
    const first = group[0];
    const receiptTotal = first.receiptTotal;
    const rowTotal = group.reduce(
      (sum, row) => sum + toMinorUnits(row.amount || 0),
      0,
    );
    const fallbackAmount =
      receiptTotal !== null &&
      Number.isFinite(receiptTotal) &&
      receiptTotal > 0
        ? receiptTotal
        : rowTotal / 100;

    return {
      ...first,
      status: 'needsReview' as const,
      amount: fallbackAmount,
      type: TransactionType.Expense,
      category: ExpenseCategory.Groceries,
      confidence: Math.min(first.confidence, 0.5),
      rawDescription: group
        .map((row) => row.rawDescription)
        .filter(Boolean)
        .join('; '),
      warnings: [
        ...(first.warnings || []),
        getReceiptReconciliationWarning(language),
      ],
      receiptGroupId: null,
      receiptTotal: null,
      isReceiptCategorySplit: false,
      receiptLineItems: [],
    };
  };

  const itemizedTransactions = transactions.flatMap((transaction, index) => {
    const lineItems = transaction.receiptLineItems || [];

    if (!lineItems.length) {
      return [transaction];
    }

    const receiptTotal = transaction.receiptTotal;
    const hasValidTotal =
      receiptTotal !== null &&
      Number.isFinite(receiptTotal) &&
      receiptTotal > 0;
    const hasValidItems = lineItems.every(
      (item) =>
        item.description.trim() &&
        Number.isFinite(item.amount) &&
        item.amount > 0 &&
        Object.values(ExpenseCategory).includes(
          item.category as ExpenseCategory,
        ),
    );
    const lineItemTotal = lineItems.reduce(
      (sum, item) => sum + toMinorUnits(item.amount),
      0,
    );

    if (
      !hasValidTotal ||
      !hasValidItems ||
      lineItemTotal !== toMinorUnits(receiptTotal)
    ) {
      return [createFallback([transaction])];
    }

    const categoryGroups = new Map<
      string,
      { amountInMinorUnits: number; descriptions: string[] }
    >();

    lineItems.forEach((item) => {
      const group = categoryGroups.get(item.category) || {
        amountInMinorUnits: 0,
        descriptions: [],
      };
      group.amountInMinorUnits += toMinorUnits(item.amount);
      group.descriptions.push(item.description);
      categoryGroups.set(item.category, group);
    });

    const categoryRows = Array.from(categoryGroups.entries());

    if (
      !categoryRows.length ||
      categoryRows.some(([, group]) => group.amountInMinorUnits <= 0)
    ) {
      return [createFallback([transaction])];
    }

    if (categoryRows.length === 1) {
      const [category, group] = categoryRows[0];

      return [
        {
          ...transaction,
          amount: receiptTotal,
          category,
          rawDescription: group.descriptions.join(', '),
          receiptGroupId: null,
          receiptTotal: null,
          isReceiptCategorySplit: false,
          receiptLineItems: [],
        },
      ];
    }

    const receiptGroupId = `grocery-receipt-${transaction.sourceFileIndex}-${index}`;
    const splitReason = getReceiptSplitReason(language, receiptTotal);

    return categoryRows.map(([category, group]) => ({
      ...transaction,
      amount: group.amountInMinorUnits / 100,
      category,
      rawDescription: group.descriptions.join(', '),
      matchReason: transaction.matchReason
        ? `${transaction.matchReason} ${splitReason}`
        : splitReason,
      receiptGroupId,
      receiptTotal,
      isReceiptCategorySplit: true,
      receiptLineItems: [],
    }));
  });

  const splitGroups = new Map<string, ScreenshotImportCandidate[]>();

  itemizedTransactions.forEach((transaction) => {
    if (!transaction.isReceiptCategorySplit || !transaction.receiptGroupId) {
      return;
    }

    const group = splitGroups.get(transaction.receiptGroupId) || [];
    group.push(transaction);
    splitGroups.set(transaction.receiptGroupId, group);
  });

  const processedGroups = new Set<string>();

  return itemizedTransactions.flatMap((transaction) => {
    if (!transaction.isReceiptCategorySplit) {
      return [transaction];
    }

    if (!transaction.receiptGroupId) {
      return [createFallback([transaction])];
    }

    const groupId = transaction.receiptGroupId;

    if (processedGroups.has(groupId)) {
      return [];
    }

    processedGroups.add(groupId);
    const group = splitGroups.get(groupId) || [transaction];
    const first = group[0];
    const receiptTotal = first.receiptTotal;
    const categories = new Set(group.map((row) => row.category));
    const hasConsistentDetails = group.every(
      (row) =>
        row.receiptTotal !== null &&
        receiptTotal !== null &&
        toMinorUnits(row.receiptTotal) === toMinorUnits(receiptTotal) &&
        row.date === first.date &&
        row.currency === first.currency &&
        row.type === TransactionType.Expense &&
        normalizeMerchantPattern(row.text) ===
          normalizeMerchantPattern(first.text),
    );
    const hasValidAmounts = group.every(
      (row) => row.amount !== null && Number.isFinite(row.amount) && row.amount > 0,
    );
    const hasValidCategories = group.every((row) =>
      Object.values(ExpenseCategory).includes(row.category as ExpenseCategory),
    );
    const categoryTotal = group.reduce(
      (sum, row) => sum + toMinorUnits(row.amount || 0),
      0,
    );
    const isReconciled =
      receiptTotal !== null &&
      Number.isFinite(receiptTotal) &&
      receiptTotal > 0 &&
      hasConsistentDetails &&
      hasValidAmounts &&
      hasValidCategories &&
      categories.size === group.length &&
      categoryTotal === toMinorUnits(receiptTotal);

    if (isReconciled && group.length > 1) {
      return group;
    }

    if (isReconciled) {
      return [
        {
          ...first,
          receiptGroupId: null,
          receiptTotal: null,
          isReceiptCategorySplit: false,
        },
      ];
    }

    return [createFallback(group)];
  });
};

const buildLanguageInstructions = (language: Language) =>
  language === Language.UKR
    ? 'Write every matchReason and every warnings item only in Ukrainian. Never answer in Polish or in the source document language. Keep merchant names and rawDescription in their original visible language. Keep status, currency, type, and category enum values unchanged.'
    : 'Write every matchReason and every warnings item only in English. Never answer in the source document language unless it is English. Keep merchant names and rawDescription in their original visible language. Keep status, currency, type, and category enum values unchanged.';

const buildPrompt = (
  referenceDate: string,
  userMerchantRules: string,
  responseLanguage: Language,
  hasPdfFiles: boolean,
  creditCardTrackingEnabled: boolean,
) => {
  const expenseCategories = getExpenseCategoriesList(creditCardTrackingEnabled)
    .map(({ value, label }) => `${value}: ${label}`)
    .join('\n');
  const incomeCategories = getIncomeCategoriesList(creditCardTrackingEnabled)
    .map(({ value, label }) => `${value}: ${label}`)
    .join('\n');
  const responseLanguageName =
    responseLanguage === Language.UKR ? 'Ukrainian' : 'English';
  const genericBankTransactionText =
    responseLanguage === Language.UKR
      ? 'Банківська транзакція'
      : 'Bank transaction';
  const pdfInstructions = hasPdfFiles
    ? `
PDF bank statement reconciliation rules:
- The primary goal is to extract every real transaction candidate from the statement so the application can compare it with existing database records afterward. You do not have the database records, so do not decide that a row already exists based only on the PDF.
- Do not omit a statement row merely because its merchant, beneficiary, or purpose text is incomplete, abbreviated, generic, or unavailable.
- When a row has a reliable date and amount but weak description, use the shortest useful visible bank label as text and rawDescription.
- If no meaningful description is visible, use "${genericBankTransactionText}" as text, preserve any available raw label in rawDescription, set status="needsReview", lower confidence, and add a warning.
- A currency stated once for the account, statement, table, or column applies to rows in that scope. Infer it only when that scope is clear.
- If a transaction date is absent and cannot be derived from its row or statement context, return date=null, status="needsReview", and a warning. Do not invent a day.
- Do not return rows with no identifiable transaction amount. Add a document warning instead.
- Extract debit and credit rows even when the statement does not explicitly label them as card purchases. Infer type=Expense for debits/outflows and type=Income for credits/inflows, except ignored movements described below.
- Prefer the posted/booked transaction date when both posting and value dates exist; mention the other date only in rawDescription when useful.
- Respect the order of multi-line date headers and cells. In Polish statements, "Data księgowania" is the booking/posting date and "Data transakcji" is the transaction date. When both are present, use "Data księgowania" as date.
- Example: under a header ordered as "Data księgowania" then "Data transakcji", a cell containing "12-06-2026" then "10-06-2026" must produce date="2026-06-12".
`
    : '';

  return `Extract financial transactions from the uploaded files. Files can be PDF bank statements, mobile banking screenshots, card transaction lists, payment confirmations, receipts, invoices, or a mix of these.

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
- AMAZON and AMZN are ambiguous marketplaces -> others unless the uploaded document clearly shows what was purchased. Do not use a user-specific merchant rule for them.
- ALLEGRO, ZALANDO, IKEA, DECATHLON -> shopping unless the visible merchant context is more specific.
- VETERINARIA, VET, PETSHOP, ZOO -> pets.
- RESTAURANT, CAFE, BAR, MCDONALD, KFC, BURGER, COSTA, STARBUCKS -> dining.
- COLEGIO, COLEGIOS, SCHOOL, LAUDE -> education.
- VETASSUR, VETERINARIA, VETERINARY, VET, PETSHOP, ZOO -> pets.

User-specific merchant rules:
${userMerchantRules}
${pdfInstructions}

Rules:
- Write matchReason and warnings in ${responseLanguageName}.
- Keep structured enum fields exactly as specified: status, currency, type, and category must not be translated.
- Keep merchant/store names in text and rawDescription in their original visible language; do not translate merchant names.
- First decide what each uploaded file shows: bank/card transaction history, receipt/invoice/payment document, or irrelevant content.
- Extract only transactions or receipts that are present in the uploaded files.
- For bank/card history, return one row per visible transaction. Do not summarize the whole screenshot as ignored when it contains at least one normal merchant card payment.
- A row labeled "Card payment", "Card transaction", "Payment by card", or similar with a visible merchant/person name and a debit amount is a real purchase candidate. It should usually be status="new", type=Expense, even if the same screenshot also contains currency exchange, own transfer, or other ignored rows.
- Include visible person-name merchants when they are card payments, for example "OLHA MEDVEDIEVA -456.88 PLN Card payment" should be extracted as a new expense candidate, not ignored.
- Direct debit / receipt debit rows are real expenses, not ignored transfers. Spanish bank rows containing "Recibo", "Adeudo", "Domiciliacion", "Domiciliación", "Mandato", or "Ref. Mandato" with a merchant/beneficiary and a negative amount should usually be status="new", type=Expense.
- Examples: "Recibo Gc Re Colegios Laude Slu ... -1.359,00 EUR" is an education expense; "Recibo Vetassur ... -27,96 EUR" is a pets expense.
- Bank transfer rows are not automatically internal transfers. If a row says "Transferencia ... A Favor De <external merchant/person>" and has a negative amount, treat it as a payment/expense candidate unless it is clearly between the user's own accounts.
- Example: "Transferencia Inmediata A Favor De Tdc Marbella -99,99 EUR" should be extracted as a new expense candidate, not ignored, unless the screenshot explicitly shows it is an own-account transfer.
- For receipts/invoices/payment confirmations, normally return one row per receipt/document using the merchant/store name and the final paid total. The grocery-store receipt exception below is the only case where one receipt may produce multiple rows.
- If multiple uploaded files or pages are clearly different parts of the same single receipt/document, merge them into one transaction when confidence is high. If unsure, use status="needsReview" and add a warning.
- Grocery-store receipt itemization (the server performs the category split):
  - For every grocery store or supermarket receipt with readable line totals and a readable final paid total, you MUST extract receiptLineItems. Do this even when most products are groceries or a previous merchant rule suggests groceries. Category ambiguity alone is not a reason to skip itemization; use category="others" for an uncertain product.
  - Return exactly one parent transaction row for each unique grocery receipt. Set its amount and receiptTotal to the visible final paid total, type=Expense, category="groceries", isReceiptCategorySplit=false, and receiptGroupId=null. Populate receiptLineItems with every purchased line exactly once. The server will validate the arithmetic and create category aggregate rows.
  - Each receiptLineItems amount must be the full line total after quantity and item-level discounts, not the unit price. Do not include VAT/tax summary rows, payment-method rows, or the final total as line items. Incorporate a readable discount into the affected line total; never invent an adjustment to force a match.
  - Classify food, drinks, and drinking water as groceries; tissues, toilet paper, wet toilet paper, kitchen rolls, cleaning products, and household consumables as home; personal-care products as beauty; medicines as healthcare; and pet products as pets. Use other provided expense categories when clearly applicable.
  - Product names may be abbreviated or in another language. If the line amount is readable, an abbreviated name does not prevent itemization. Put genuinely unclassifiable products in others.
  - Verify in exact minor currency units that the sum of receiptLineItems.amount equals receiptTotal. If it does not match, return the one unsplit parent transaction with receiptLineItems=[], receiptTotal=null, status="needsReview", and a warning. Never return partially extracted line items.
  - Arithmetic example: food/drink lines 2.72 + 9.10 + 3.12 + 1.15 + 1.15 become groceries=17.24; household-paper lines 5.20 + 3.70 + 4.65 + 3.70 become home=17.25; their verified receiptTotal is 34.49.
  - Multiple photos may show overlapping or different parts of the same receipt. First determine whether they are one document using merchant, receipt number, date/time, totals, and overlapping line items. Count every purchased line exactly once. If the files might show different receipts, do not merge them.
  - Never populate receiptLineItems for bank/card transaction lists, payment confirmations, invoices, restaurant receipts, general retailers, or other receipt types.
  - For every row without a fully reconciled grocery receipt, set receiptLineItems=[], receiptTotal=null, isReceiptCategorySplit=false, and receiptGroupId=null.
- Source dates can appear in any locale or format. Always output date as YYYY-MM-DD.
- If a date group says "Yesterday", resolve it from the reference date.
- For ambiguous numeric dates such as 06/07/2026, infer locale from screenshot language/bank region when possible; otherwise use status="needsReview" and add a warning.
- Amounts should be absolute positive numbers. Use type=Expense for negative/debit card payments and type=Income for real positive income/refunds.
- If both an original/local merchant amount and a converted/account-settlement amount are visible, use the original/local merchant amount and currency as amount/currency. Add a warning that a converted account amount was also visible.
- If only the account/displayed converted amount is visible, use that amount/currency and add a warning when the original merchant currency may be hidden or cut off.
- For receipts, use the actual receipt/payment currency. Do not replace it with a card/account conversion currency.
- Mark currency exchange, own-account transfers, internal transfers between the user's own accounts, card settlements, and balance movements as status="ignored". Do not classify currency exchange as income or expense. This ignore rule does not apply to normal merchant/person card payments, direct debits, receipt debits, or external bank-transfer payments.
- Do NOT mark visible card purchases as ignored only because they are under Upcoming Transactions, Card blockade, Card authorization, or pending/hold sections.
- Upcoming/card authorization purchases with a visible merchant and amount should usually be status="new", type=Expense, with the best category inferred from the merchant.
- Use status="needsReview" for upcoming/card authorization rows only when the row is partially cut off, the amount/currency/date is ambiguous, or it may be a refund.
- If a positive card row looks like a refund, use status="needsReview" and type=Income.
- For a mixed non-grocery retail receipt, choose the dominant category by total value when visible. If the mix is unclear, use the merchant/store category and add a warning such as "Mixed receipt; category may need review."
- Preserve merchant names exactly enough to be useful, but remove obvious card processor noise only if confidence is high.
- If it feels natural and clearly matches the merchant/category, you may prefix text with one relevant emoji, such as 🛒 for groceries, ☕ for cafes, 🐾 for pets/vet, 🅿️ for parking, 🎬 for cinema, 💊 for pharmacy/healthcare, ✈️ for travel, or 🛍️ for shopping.
- Use at most one emoji. Do not add an emoji when confidence is low, status is ignored/alreadyExists, or the merchant/category is ambiguous.
- Keep the merchant/store name readable after the emoji. Do not replace merchant names with emoji-only text.
- If merchant/category is uncertain, use category="others" and lower confidence.
- Do not invent merchant details that are not visible.
- If duplicate rows appear because screenshots, pages, or uploaded files overlap, include them once when you are confident they are the same visible transaction.
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
    select: {
      defaultCurrency: true,
      encryptData: true,
      language: true,
      creditCardTrackingEnabled: true,
    },
  });

  if (settings?.encryptData) {
    return {
      error: 'AI import is unavailable while data encryption is enabled',
    };
  }

  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File);
  const referenceDate =
    formData.get('referenceDate')?.toString() ||
    new Date().toISOString().slice(0, 10);

  if (!files.length) {
    return { error: 'Please upload at least one image or PDF file' };
  }

  if (files.length > MAX_FILES) {
    return { error: `Please upload up to ${MAX_FILES} files` };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return {
      error: `Uploaded files are larger than ${MAX_TOTAL_SIZE_MB} MB in total`,
    };
  }

  try {
    const merchantRules = await getMerchantCategoryRules(userId);
    const inputParts = await Promise.all(
      files.map(async (file, index) => {
        const mimeType = normalizeMimeType(file.type, file.name);
        const isPdf = mimeType === PDF_MIME_TYPE;

        if (!isPdf && !SUPPORTED_IMAGE_TYPES.has(mimeType)) {
          throw new Error(
            `Unsupported file type: ${file.type || file.name}. Please use PDF, PNG, JPG, or WEBP files.`,
          );
        }

        const maxFileSizeBytes = isPdf
          ? MAX_PDF_SIZE_BYTES
          : MAX_IMAGE_SIZE_BYTES;
        const maxFileSizeMb = isPdf ? MAX_PDF_SIZE_MB : MAX_IMAGE_SIZE_MB;

        if (file.size > maxFileSizeBytes) {
          throw new Error(`${file.name} is larger than ${maxFileSizeMb} MB`);
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        if (isPdf) {
          return {
            type: 'input_file' as const,
            filename: file.name,
            file_data: `data:${PDF_MIME_TYPE};base64,${buffer.toString('base64')}`,
            detail: 'high' as const,
            index,
          };
        }

        return {
          type: 'input_image' as const,
          image_url: `data:${mimeType};base64,${buffer.toString('base64')}`,
          detail: 'high' as const,
          index,
        };
      }),
    );
    const openai = new OpenAI();
    const model = process.env.OPENAI_TRANSACTION_IMPORT_MODEL || 'gpt-5.4-mini';
    const hasPdfFiles = files.some(
      (file) => normalizeMimeType(file.type, file.name) === PDF_MIME_TYPE,
    );
    const importStartedAt = Date.now();
    const sentryContext = {
      model,
      fileCount: files.length,
      totalSize,
      hasPdfFiles,
    };

    Sentry.captureMessage('AI file import started', {
      level: 'info',
      tags: {
        feature: 'smart-import',
        source: hasPdfFiles ? 'pdf' : 'image',
      },
      extra: sentryContext,
    });
    console.log('[AI import] analyze files request', {
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
      instructions: buildLanguageInstructions(
        settings?.language || Language.ENG,
      ),
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
                hasPdfFiles,
                settings?.creditCardTrackingEnabled || false,
              ),
            },
            ...inputParts.map(({ index: _index, ...part }) => part),
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'financial_file_import',
          strict: true,
          schema,
        },
      },
    });

    Sentry.captureMessage('AI file import model response received', {
      level: 'info',
      tags: {
        feature: 'smart-import',
        source: hasPdfFiles ? 'pdf' : 'image',
      },
      extra: {
        ...sentryContext,
        responseId: response.id,
        modelDurationMs: Date.now() - importStartedAt,
      },
    });

    console.log('[AI import] raw response output_text', response.output_text);

    const parsed = JSON.parse(response.output_text) as ModelImportResult;
    console.log('[AI import] parsed response', JSON.stringify(parsed, null, 2));

    const reconciledTransactions = reconcileReceiptCategorySplits(
      parsed.transactions,
      settings?.language || Language.ENG,
    );
    const rows = reconciledTransactions.map((row) => ({
      ...row,
      allowWeakMerchantDateMatch:
        normalizeMimeType(
          files[row.sourceFileIndex]?.type || '',
          files[row.sourceFileIndex]?.name || '',
        ) === PDF_MIME_TYPE,
      status:
        row.status === 'ignored' || row.status === 'needsReview'
          ? row.status
          : ('new' as const),
      confidence: clampConfidence(row.confidence),
      warnings: row.warnings || [],
      category: (() => {
        if (row.isReceiptCategorySplit) {
          return !settings?.creditCardTrackingEnabled &&
            isCreditCardCategory(row.category)
            ? 'others'
            : row.category;
        }

        if (isAmbiguousMerchant(row.text)) {
          return 'others';
        }

        const matchedCategory =
          findMerchantRuleMatch(row.text, merchantRules)?.category ||
          row.category ||
          'others';

        return !settings?.creditCardTrackingEnabled &&
          isCreditCardCategory(matchedCategory)
          ? 'others'
          : matchedCategory;
      })(),
    }));

    const rowsWithDefaultAmounts = rows.map((row) => {
      if (!row.amount || !row.currency || !settings?.defaultCurrency) {
        return { ...row, amountDefaultCurrency: null };
      }

      if (row.currency === settings.defaultCurrency) {
        return { ...row, amountDefaultCurrency: row.amount };
      }

      return {
        ...row,
        amountDefaultCurrency: null,
      };
    });
    const rowsWithDuplicateMatches = await applyDuplicateMatches(
      userId,
      rowsWithDefaultAmounts,
      settings?.language || Language.ENG,
    );
    console.log(
      '[AI import] normalized rows',
      JSON.stringify(rowsWithDuplicateMatches, null, 2),
    );

    Sentry.addBreadcrumb({
      category: 'smart-import',
      message: 'AI file import completed',
      level: 'info',
      data: {
        rowCount: rowsWithDuplicateMatches.length,
        totalDurationMs: Date.now() - importStartedAt,
      },
    });

    return {
      rows: rowsWithDuplicateMatches,
      warnings: parsed.warnings || [],
    };
  } catch (error: any) {
    console.error('OpenAI file import error:', error);
    Sentry.captureException(error, {
      tags: {
        feature: 'smart-import',
      },
      extra: {
        fileCount: files.length,
        totalSize,
        hasPdfFiles: files.some(
          (file) => normalizeMimeType(file.type, file.name) === PDF_MIME_TYPE,
        ),
      },
    });

    return {
      error:
        error?.message || 'Unable to analyze files. Please try again later.',
    };
  }
}
