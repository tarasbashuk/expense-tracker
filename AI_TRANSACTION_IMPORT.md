# AI Transaction Import Plan

## Goal

Add an AI-assisted bank statement import flow that lets a user upload a bank statement or transaction-history screenshots, review extracted transactions, and save selected transactions into the existing transaction database.

Manual transaction creation remains the primary and canonical flow. AI import is an assistive bulk-entry feature, not an autonomous writer.

## Product Principles

- AI should parse and suggest, but should not write directly to the database.
- The user must review transactions before saving them.
- The first version should be useful with a small, reliable scope.
- Duplicate detection should be deterministic in app code for MVP.
- More advanced duplicate analysis can come later as a separate feature or cron job.
- Existing app concepts must stay intact: `amount`, `currency`, `amountDefaultCurrency`, `type`, `category`, and user `defaultCurrency`.

## MVP Scope

1. Show an "Import statement" entry point near the transactions UI.
2. Let the user upload a PDF, CSV, or one or more screenshots.
3. Block the feature when `settings.encryptData === true`.
4. Extract transaction candidates from the file.
5. Use AI only where it adds value:
   - PDF parsing when local parsing is unreliable.
   - Column mapping or category suggestions for CSV.
   - OCR/vision extraction from screenshots.
   - Description cleanup when useful source details exist.
6. Send the PDF, screenshots, or extracted structured rows plus allowed category lists to an LLM when needed.
7. Receive structured transaction candidates.
8. Fetch existing user transactions for the detected statement period.
9. Locally classify candidates as:
   - `new`
   - `alreadyExists`
   - `possibleDuplicate`
   - `needsReview`
10. Show a review modal/table.
11. Let the user edit category and description before saving.
12. Save transactions one row at a time in the first version.

Bulk "save selected" can come after the first version.

## Privacy And Encryption Guardrail

For MVP, AI import is available only when the user's `encryptData` setting is disabled.

Backend behavior:

```ts
if (settings?.encryptData) {
  return {
    error: 'AI import is unavailable while data encryption is enabled',
  };
}
```

Reasoning:

- Avoid decrypting user transactions for AI-related flows.
- Avoid adding encrypted-data matching complexity in the first version.
- Keep the feature behavior predictable.

Future option: allow encrypted users to parse the PDF with AI, then run duplicate matching locally after decrypting existing transactions server-side, without sending existing transactions to the model.

## AI Responsibility

The model should only extract and classify candidate transactions from the uploaded statement or from rows parsed locally from the statement.

The model receives:

- PDF file input, screenshots, or normalized CSV rows plus headers.
- Supported currencies: `EUR`, `PLN`, `UAH`, `USD`.
- Supported income and expense categories.
- Instructions to preserve dates, amounts, currencies, and raw statement descriptions.

The model returns strict structured output shaped like:

```ts
type StatementImportResult = {
  statementPeriod: {
    from: string; // ISO date
    to: string; // ISO date
  } | null;
  transactions: Array<{
    date: string; // ISO date
    amount: number;
    currency: 'EUR' | 'PLN' | 'UAH' | 'USD';
    type: 'Expense' | 'Income';
    rawDescription: string;
    suggestedText: string;
    suggestedCategory: string;
    confidence: number;
  }>;
  warnings: string[];
};
```

The model should not decide whether a transaction already exists in the database for MVP.

## Provider And Model

Recommended initial provider: OpenAI Responses API.

Recommended initial model: a mini/cheaper model capable of PDF/file input and structured outputs, such as `gpt-5.4-mini` if available in the target account.

Use Structured Outputs / JSON schema instead of plain JSON mode, so the app receives schema-adherent data.

Fallback path:

- If the mini model is unreliable for a given PDF, retry manually or automatically with a stronger model.
- Do not start with a multi-provider abstraction unless there is a concrete need.

## File Handling

Preferred PDF MVP path:

- Upload the PDF from the client to a server action or route handler.
- Convert the file to base64 or upload it to OpenAI Files, depending on implementation ergonomics.
- Send the PDF as an OpenAI `input_file`.

Do not manually parse PDFs first unless we hit reliability or cost issues. Let the model handle multilingual PDF statements initially.

Preferred CSV MVP path:

- Decode CSV on the server.
- Support semicolon and comma delimiters.
- Support common encodings, including UTF-8 and CP1250 for Polish bank exports.
- Parse rows locally into raw records.
- Map obvious columns locally when headers are clear, for example:
  - booking date
  - effective date
  - description
  - amount
  - currency
  - balance after operation
- Use AI only for ambiguous column mapping or category suggestions.

Important CSV lesson from the Alior Bank sample:

- CSV can provide reliable dates, amounts, currencies, and balances.
- It may still contain generic card descriptions such as `Transakcja kartą debetową`.
- If the statement does not include merchant details, AI should not invent them.
- In this case, AI can suggest generic categories with low confidence, but the review UI must make editing easy.

Preferred screenshot MVP path:

- Let the user upload one or more mobile banking screenshots.
- Send screenshots to a vision-capable model with strict structured output.
- Ask the model to extract only visible transaction rows.
- Include the current date or a user-selected statement period so relative labels like `Yesterday` can be resolved.
- Deduplicate overlapping rows across screenshots locally.
- Treat screenshots as a high-value source when CSV/PDF hides merchant details.

Important screenshot lesson from the Alior Bank sample:

- The screenshot contains merchant names such as `LIDL ESTEPONA-CANCELAD`, `VETERINARIA MAMUT`, `LA RED COSTA DEL SOL S`, and `WWW.AMAZON* NL2GY1P04`.
- These details are missing from the Alior CSV/PDF exports, where many rows appear only as `Transakcja kartą debetową`.
- For this bank, screenshots may produce a better user experience than PDF/CSV because they preserve merchant context.
- AI should still return confidence values because screenshot OCR can misread text, dates, or decimal separators.

Potential future optimization:

- Use local PDF text extraction first.
- Send extracted text to the model for text-based statements.
- Fall back to PDF/vision for scanned or poorly structured documents.

## Internal Transfers And Currency Exchange

Bank statements may include internal transfers, own-funds transfers, currency exchange, and settlement rows that should not become ordinary expense/income transactions.

For MVP, classify these as `ignored` or `needsReview`, not as income.

Examples:

- `Transfer środków własnych`
- `Transfer of the own funds`
- `Rozliczenie transakcji Kantor Walutowy`
- Screenshot rows labeled `Currency exchange` / `Exchange`

Currency exchange can produce one positive row and one negative row, for example `+300 EUR` and `-1280.16 PLN`. These are not real income/expense events for budgeting purposes and should be ignored by default unless the user explicitly chooses to import them.

Refunds are different: a positive card/payment row may be a refund and should be shown for review instead of automatically ignored.

## Currency Conversion

Every imported transaction must have `amountDefaultCurrency` before it can be saved.

Rules:

- If transaction currency equals user default currency, `amountDefaultCurrency = amount`.
- If currencies differ, use the current Monobank rates, matching the existing app behavior.
- Historical exchange rates are not required for MVP.
- The review UI can show both original amount and base-currency amount when currencies differ.

Important implementation note:

The app already has conversion logic in:

- `src/components/AddTransactionModal/AddTransactionModal.tsx`
- `src/app/api/cron/process-recurring-transactions/route.ts`

Before AI import writes converted amounts, extract this logic into a shared helper and preserve the current `currenciesMap` semantics produced by `getCurrenciesFromMap`.

Do not "fix" multiplication/division based on a generic exchange-rate assumption without checking Monobank's actual response shape and the existing `rateKey` semantics.

Suggested helper:

```ts
convertAmountToDefaultCurrency({
  amount,
  fromCurrency,
  defaultCurrency,
  currenciesMap,
});
```

Use this helper from:

- AI import
- recurring transactions cron
- later, manual transaction modal if practical

Add focused tests or examples for:

- `EUR -> UAH`
- `UAH -> EUR`
- `USD -> UAH`
- `UAH -> USD`
- `PLN -> EUR`
- `EUR -> PLN`

## Duplicate Matching MVP

Duplicate matching should happen in app code after AI extraction.

Fetch existing transactions for the statement period, optionally with a small date buffer:

- from `statementPeriod.from - 2 days`
- to `statementPeriod.to + 2 days`

Initial matching tiers:

### Already Exists

High confidence match:

- same type
- same currency
- same amount within `0.01`
- same date, or date difference within 1 day
- description similarity is helpful but not required for exact amount/date matches

### Possible Duplicate

Medium confidence match:

- date within 2 days
- currency same
- amount close with rounding tolerance, for example:
  - exact within `0.01`
  - same amount after rounding to a whole number, ignoring cents
  - amountDefaultCurrency close after conversion
- description somewhat similar, if available

### Needs Review

Use when:

- date or currency is missing/uncertain
- model confidence is low
- amount parsing is suspicious
- multiple existing transactions could match one statement row

### New

No meaningful match found.

Split/merge matching is out of scope for MVP.

## UI Flow

Suggested first version:

1. Button: "Import statement".
2. Modal step 1: choose source and upload files.
3. Loading state while analysis runs.
4. Modal step 2: review table.

Source options:

- Screenshots
- CSV/PDF

Mobile-first screenshot flow:

- This app is a web app, so iPhone users should be able to upload screenshots through the native file picker.
- Use a file input that accepts images and supports multiple selection.
- iOS should allow selecting screenshots from Photos, taking a new photo, or choosing files from Files/iCloud.
- Show selected image previews before analysis.
- Let the user remove mistakenly selected images.
- Keep the flow comfortable on a small screen; screenshots may be the primary mobile import path.

Suggested input for screenshots:

```html
<input type="file" accept="image/*" multiple />
```

Suggested combined input:

```html
<input
  type="file"
  accept=".pdf,.csv,application/pdf,text/csv,image/*"
  multiple
/>
```

Mobile upload notes:

- iPhone screenshots are usually PNG, but uploads can include JPG or HEIC depending on source.
- Support common image MIME types and decide whether HEIC should be converted client-side, server-side, or rejected with a clear message.
- Compress or resize large images before sending them to AI when possible.
- For long histories, users may upload multiple scrolling screenshots with overlapping rows.
- Deduplicate overlapping visible transactions locally after AI extraction.
- Resolve relative date labels like `Yesterday` using the upload date or a user-selected reference date/period.

Review table columns:

- Status
- Date
- Description
- Amount
- Base amount, when different
- Type
- Category select
- Save action

Editable fields:

- `suggestedText`
- `suggestedCategory`
- possibly `type`

Read-only fields for MVP:

- date
- amount
- currency
- base amount

Row actions:

- Save
- Ignore

Later:

- Save selected
- Filter by status
- Show matched existing transaction details

## Backend Shape

Likely files/modules:

- `src/app/actions/importStatementPreview.ts`
- `src/app/actions/saveImportedTransaction.ts` or reuse `addUpdateTransaction`
- `src/lib/ai/statementImport.ts`
- `src/lib/transactions/duplicateMatching.ts`
- `src/lib/currency/convertAmountToDefaultCurrency.ts`

The preview action should:

1. Authenticate current Clerk user.
2. Load settings.
3. Block when `encryptData` is true.
4. Call AI extraction.
5. Fetch Monobank rates.
6. Convert candidate amounts to default currency.
7. Fetch existing transactions for the period.
8. Run duplicate matching.
9. Return review rows to the client.

Saving can reuse `addUpdateTransaction` as long as the row already contains a valid `amountDefaultCurrency`.

## Suggested Review Row Type

```ts
type ImportReviewRow = {
  importId: string;
  status:
    | 'new'
    | 'alreadyExists'
    | 'possibleDuplicate'
    | 'needsReview'
    | 'ignored';
  candidate: {
    date: string;
    text: string;
    rawDescription: string;
    amount: number;
    amountDefaultCurrency: number;
    currency: 'EUR' | 'PLN' | 'UAH' | 'USD';
    type: 'Expense' | 'Income';
    category: string;
    confidence: number;
  };
  matchedTransactionIds: string[];
  matchReason?: string;
  warnings: string[];
};
```

## Future Ideas

- Cron job to detect possible duplicates across the user's existing database.
- AI-assisted duplicate explanation for ambiguous cases.
- Import history with uploaded statement fingerprint/hash.
- Prevent importing the same PDF twice.
- Bank-specific parsing improvements.
- CSV/XLSX statement support.
- Historical exchange rates, if the selected provider supports them reliably.
- Bulk save selected rows.
- Split/merge transaction review.

## First Implementation Checklist

1. Extract shared currency conversion helper and verify current behavior.
2. Add OpenAI SDK and environment variable handling.
3. Build server-side PDF import preview action.
4. Add schema for structured AI response.
5. Implement basic duplicate matching.
6. Build import modal review UI.
7. Save one suggested transaction at a time.
8. Add basic error and loading states.
9. Test with small sample statements in different languages.
