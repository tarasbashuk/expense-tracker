# Recurring Transactions

## Feature Description

Recurring transactions allow you to automatically create transactions monthly based on an initial transaction. This is useful for:

- Subscriptions (Netflix, Spotify, etc.)
- Installments
- Regular payments

## How it works

1. **Creating a recurring transaction**: User creates a transaction with the "Recurring transaction" option
2. **Setting the term**: You can set an end date or leave it infinite
3. **Automatic creation**: Cron job runs daily at 2:00 AM and checks for transactions from one month ago
4. **Date handling**: The system properly handles different number of days in months (e.g., January 31 → February 28)

## Setup

### 1. Environment Variables

Add to `.env`:

```env
CRON_SECRET=your-secret-key-here
```

### 2. Vercel Cron Jobs

The `vercel.json` file is already configured to run the cron job daily at 2:00 AM.

### 3. Manual Testing

To test, you can manually trigger the API endpoint:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/process-recurring-transactions \
  -H "Authorization: Bearer your-secret-key-here"
```

## Usage Examples

### Infinite Subscription

- Transaction: Netflix $15.99
- Date: January 15, 2024
- Recurring: ✅
- End date: (empty)
- Result: Transaction will be created monthly until cancelled

### Installment with Term

- Transaction: iPhone installment $50
- Date: March 1, 2024
- Recurring: ✅
- End date: March 1, 2025
- Result: Transaction will be created monthly until March 1, 2025

### Handling Different Number of Days

- Transaction January 31 → new transaction February 28 (or 29 in leap year)
- Transaction March 30 → new transaction April 30
- Transaction May 15 → new transaction June 15

## Security

- API endpoint is protected by a secret key
- Cron job only runs through Vercel
- All transactions are created with the same encryption parameters

## Monitoring

Check Vercel logs to monitor cron job operation:

```bash
vercel logs --follow
```

## Troubleshooting

### Cron job not running

1. Check if `vercel.json` is properly configured
2. Check Vercel logs
3. Check if `CRON_SECRET` is properly set

### Transactions not being created

1. Check if there are recurring transactions from one month ago
2. Check if the recurrence period hasn't ended
3. Check API endpoint logs
