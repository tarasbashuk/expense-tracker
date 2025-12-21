import nodemailer from 'nodemailer';
import { formatCurrency } from '@/lib/formatCurrency';
import { Currency } from '@prisma/client';

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  avgPerMonth: number;
}

interface TopTransaction {
  text: string;
  amountDefaultCurrency: number;
  currency: string;
  date: Date;
  category: string;
}

interface YearlyReportData {
  userEmail: string;
  userName: string;
  year: string;
  totalTransactions: number;
  totalExpenses: number;
  totalIncomes: number;
  avgExpensesPerMonth: number;
  avgIncomesPerMonth: number;
  expenseCategories: CategorySummary[];
  incomeCategories: CategorySummary[];
  topExpenses: TopTransaction[];
  topIncomes: TopTransaction[];
  expenseCategoriesMap: Record<string, string>;
  incomeCategoriesMap: Record<string, string>;
  defaultCurrency?: Currency;
}

export async function sendYearlyReportEmail(data: YearlyReportData) {
  if (!process.env.APP_EMAIL || !process.env.APP_EMAIL_PASS) {
    console.warn('Email configuration missing, skipping yearly report');

    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_EMAIL_PASS,
    },
  });

  // Use user's default currency with fallback to EUR
  const currency = data.defaultCurrency || Currency.EUR;
  const formatCurrencyForEmail = (amount: number) => formatCurrency(amount, currency);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yearly Report - ${data.year}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }
        .header p {
            color: #6c757d;
            margin: 10px 0 0 0;
            font-size: 18px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .stat-card.income {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        }
        .stat-card.expense {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        }
        .stat-card.net {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        }
        .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 13px;
            opacity: 0.95;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-card .value {
            font-size: 22px;
            font-weight: bold;
        }
        .stat-card .sub-value {
            font-size: 12px;
            opacity: 0.9;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 35px;
        }
        .section h2 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 22px;
        }
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .category-item:last-child {
            border-bottom: none;
        }
        .category-info {
            flex: 1;
            margin-right: 20px;
        }
        .category-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 4px;
        }
        .category-meta {
            font-size: 13px;
            color: #6c757d;
        }
        .category-amounts {
            text-align: right;
        }
        .category-total {
            font-weight: bold;
            font-size: 16px;
            color: #2c3e50;
            margin-bottom: 2px;
        }
        .category-avg {
            font-size: 12px;
            color: #6c757d;
        }
        .transaction-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .transaction-item:last-child {
            border-bottom: none;
        }
        .transaction-text {
            flex: 1;
            margin-right: 20px;
        }
        .transaction-amount {
            font-weight: bold;
            font-size: 15px;
        }
        .transaction-amount.expense {
            color: #e74c3c;
        }
        .transaction-amount.income {
            color: #27ae60;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .positive {
            color: #27ae60;
        }
        .negative {
            color: #e74c3c;
        }
        .highlight-box {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .highlight-box h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 18px;
        }
        .highlight-box .big-number {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Yearly Report ${data.year}</h1>
            <p>Hello ${data.userName}! Here's your financial summary for the year</p>
        </div>

        <div class="highlight-box">
            <h3>💰 Net Balance</h3>
            <div class="big-number ${data.totalIncomes - data.totalExpenses >= 0 ? 'positive' : 'negative'}">
                ${formatCurrencyForEmail(data.totalIncomes - data.totalExpenses)}
            </div>
            <p style="margin: 5px 0 0 0; color: #6c757d;">
                ${data.totalIncomes >= data.totalExpenses ? 'Great job! You saved money this year! 🎉' : 'Consider reviewing your expenses to improve your financial health'}
            </p>
        </div>

        <div class="stats-grid">
            <div class="stat-card income">
                <h3>Total Income</h3>
                <div class="value">${formatCurrencyForEmail(data.totalIncomes)}</div>
                <div class="sub-value">Avg: ${formatCurrencyForEmail(data.avgIncomesPerMonth)}/month</div>
            </div>
            <div class="stat-card expense">
                <h3>Total Expenses</h3>
                <div class="value">${formatCurrencyForEmail(data.totalExpenses)}</div>
                <div class="sub-value">Avg: ${formatCurrencyForEmail(data.avgExpensesPerMonth)}/month</div>
            </div>
            <div class="stat-card">
                <h3>Transactions</h3>
                <div class="value">${data.totalTransactions}</div>
                <div class="sub-value">Throughout ${data.year}</div>
            </div>
        </div>

        ${
          data.incomeCategories.length > 0
            ? `
        <div class="section">
            <h2>💵 Income by Category</h2>
            ${data.incomeCategories
              .map(
                (cat) => `
                <div class="category-item">
                    <div class="category-info">
                        <div class="category-name">${data.incomeCategoriesMap[cat.category] || cat.category}</div>
                        <div class="category-meta">${cat.count} transaction${cat.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="category-amounts">
                        <div class="category-total positive">${formatCurrencyForEmail(cat.total)}</div>
                        <div class="category-avg">Avg: ${formatCurrencyForEmail(cat.avgPerMonth)}/month</div>
                    </div>
                </div>
            `,
              )
              .join('')}
        </div>
        `
            : ''
        }

        ${
          data.expenseCategories.length > 0
            ? `
        <div class="section">
            <h2>💸 Expenses by Category</h2>
            ${data.expenseCategories
              .map(
                (cat) => `
                <div class="category-item">
                    <div class="category-info">
                        <div class="category-name">${data.expenseCategoriesMap[cat.category] || cat.category}</div>
                        <div class="category-meta">${cat.count} transaction${cat.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="category-amounts">
                        <div class="category-total negative">${formatCurrencyForEmail(cat.total)}</div>
                        <div class="category-avg">Avg: ${formatCurrencyForEmail(cat.avgPerMonth)}/month</div>
                    </div>
                </div>
            `,
              )
              .join('')}
        </div>
        `
            : ''
        }

        ${
          data.topIncomes.length > 0
            ? `
        <div class="section">
            <h2>🏆 Top 10 Incomes</h2>
            ${data.topIncomes
              .map(
                (income) => `
                <div class="transaction-item">
                    <div class="transaction-text">
                        <div style="font-weight: 600; margin-bottom: 4px;">${income.text}</div>
                        <div style="color: #6c757d; font-size: 13px;">${data.incomeCategoriesMap[income.category] || income.category} • ${income.date.toLocaleDateString(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  },
                )}</div>
                    </div>
                    <div class="transaction-amount income">${formatCurrencyForEmail(income.amountDefaultCurrency)}</div>
                </div>
            `,
              )
              .join('')}
        </div>
        `
            : ''
        }

        ${
          data.topExpenses.length > 0
            ? `
        <div class="section">
            <h2>💳 Top 10 Expenses</h2>
            ${data.topExpenses
              .map(
                (expense) => `
                <div class="transaction-item">
                    <div class="transaction-text">
                        <div style="font-weight: 600; margin-bottom: 4px;">${expense.text}</div>
                        <div style="color: #6c757d; font-size: 13px;">${data.expenseCategoriesMap[expense.category] || expense.category} • ${expense.date.toLocaleDateString(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  },
                )}</div>
                    </div>
                    <div class="transaction-amount expense">${formatCurrencyForEmail(expense.amountDefaultCurrency)}</div>
                </div>
            `,
              )
              .join('')}
        </div>
        `
            : ''
        }

        <div class="footer">
            <p>Generated by TB Expense App</p>
            <p>Thank you for tracking your finances with us! 💰</p>
            <p style="margin-top: 10px; font-size: 12px; color: #95a5a6;">
                Keep up the great work in ${parseInt(data.year) + 1}! 🚀
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from: process.env.APP_EMAIL,
      to: data.userEmail,
      subject: `Your Yearly Report ${data.year} - TB Expense`,
      html: htmlContent,
    });

    console.log(`Yearly report email sent to ${data.userEmail}`);
  } catch (error) {
    console.error(`Failed to send yearly report to ${data.userEmail}:`, error);
  }
}

