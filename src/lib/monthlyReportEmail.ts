import nodemailer from 'nodemailer';

interface TopExpense {
  text: string;
  amountDefaultCurrency: number;
  currency: string;
  date: Date;
}

interface TopCategory {
  category: string;
  count: number;
}

interface MonthlyReportData {
  userEmail: string;
  userName: string;
  month: string;
  totalTransactions: number;
  totalExpenses: number;
  totalIncomes: number;
  topExpenses: TopExpense[];
  topCategories: TopCategory[];
  expenseCategories: Record<string, string>;
  incomeCategories: Record<string, string>;
}

export async function sendMonthlyReportEmail(data: MonthlyReportData) {
  if (!process.env.APP_EMAIL || !process.env.APP_EMAIL_PASS) {
    console.warn('Email configuration missing, skipping monthly report');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.APP_EMAIL,
      pass: process.env.APP_EMAIL_PASS,
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Report - ${data.month}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
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
            border-bottom: 2px solid #e9ecef;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #6c757d;
            margin: 10px 0 0 0;
            font-size: 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .stat-card .value {
            font-size: 24px;
            font-weight: bold;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8px;
            margin-bottom: 20px;
        }
        .expense-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .expense-item:last-child {
            border-bottom: none;
        }
        .expense-text {
            flex: 1;
            margin-right: 20px;
        }
        .expense-amount {
            font-weight: bold;
            color: #e74c3c;
            font-size: 16px;
        }
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 0;
        }
        .category-name {
            font-weight: 500;
            margin-right: 20px;
        }
        .category-count {
            background: #3498db;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Monthly Report</h1>
            <p>${data.month} - Hello ${data.userName}!</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Transactions</h3>
                <div class="value">${data.totalTransactions}</div>
            </div>
            <div class="stat-card">
                <h3>Total Expenses</h3>
                <div class="value">${formatCurrency(data.totalExpenses)}</div>
            </div>
            <div class="stat-card">
                <h3>Total Income</h3>
                <div class="value">${formatCurrency(data.totalIncomes)}</div>
            </div>
            <div class="stat-card">
                <h3>Net Balance</h3>
                <div class="value ${data.totalIncomes - data.totalExpenses >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(data.totalIncomes - data.totalExpenses)}
                </div>
            </div>
        </div>

        ${
          data.topExpenses.length > 0
            ? `
        <div class="section">
            <h2>🏆 Top 5 Expenses</h2>
            ${data.topExpenses
              .map(
                (expense) => `
                <div class="expense-item">
                    <div class="expense-text">
                        <div style="font-weight: 600; margin-bottom: 4px;">${expense.text}</div>
                        <div style="color: #6c757d; font-size: 14px;">${data.expenseCategories[expense.category] || expense.category} • ${expense.date.toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          },
                        )}</div>
                    </div>
                    <div class="expense-amount">${formatCurrency(expense.amountDefaultCurrency)}</div>
                </div>
            `,
              )
              .join('')}
        </div>
        `
            : ''
        }

        ${
          data.topCategories.length > 0
            ? `
        <div class="section">
            <h2>📈 Most Active Categories</h2>
            ${data.topCategories
              .map(
                (category) => `
                <div class="category-item">
                    <span class="category-name">${data.expenseCategories[category.category] || category.category}</span>
                    <span class="category-count">${category.count} transactions</span>
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
            <p>Keep tracking your finances! 💰</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from: process.env.APP_EMAIL,
      to: data.userEmail,
      subject: `📊 Your Monthly Report - ${data.month}`,
      html: htmlContent,
    });

    console.log(`Monthly report email sent to ${data.userEmail}`);
  } catch (error) {
    console.error(`Failed to send monthly report to ${data.userEmail}:`, error);
  }
}
