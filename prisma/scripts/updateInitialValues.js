// prisma/scripts/update_initial_values.ts
const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
  // Update existing Settings rows with initialAmount
  await prisma.settings.updateMany({
    where: {
      initialAmount: null,
    },
    data: {
      initialAmount: 0.0,
    },
  });

  // Fetch all transactions to update their date field based on createdAt
  const transactions = await prisma.transaction.findMany({
    where: {
      date: null,
    },
  });

  // Update transactions with the date part from createdAt
  for (const transaction of transactions) {
    const date = format(new Date(transaction.createdAt), 'yyyy-MM-dd');
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { date: new Date(date) },
    });
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
