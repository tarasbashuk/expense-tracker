#!/usr/bin/env node

/**
 * Database Restore Script from Prisma JSON backup
 * Usage: node scripts/restore-db-prisma.js <backup-file.json>
 * 
 * WARNING: This will DELETE all existing data and restore from backup!
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Get backup file from command line
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Error: Please provide backup file path');
  console.error('Usage: node scripts/restore-db-prisma.js <backup-file.json>');
  process.exit(1);
}

const backupPath = path.isAbsolute(backupFile)
  ? backupFile
  : path.join(__dirname, '../', backupFile);

if (!fs.existsSync(backupPath)) {
  console.error(`❌ Error: Backup file not found: ${backupPath}`);
  process.exit(1);
}

console.log(`📦 Restoring from backup: ${path.basename(backupPath)}`);
console.log('⚠️  WARNING: This will DELETE all existing data!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

// Wait 5 seconds for user to cancel
await new Promise((resolve) => setTimeout(resolve, 5000));

async function restoreBackup() {
  try {
    // Read backup file
    console.log('Reading backup file...');
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backup = JSON.parse(backupContent);

    if (!backup.data) {
      throw new Error('Invalid backup format: missing data field');
    }

    console.log('\n📊 Backup info:');
    console.log(`   Timestamp: ${backup.timestamp || 'unknown'}`);
    console.log(`   Description: ${backup.description || 'none'}`);
    console.log(`   Users: ${backup.data.users?.length || 0}`);
    console.log(`   Transactions: ${backup.data.transactions?.length || 0}`);
    console.log(`   Settings: ${backup.data.settings?.length || 0}`);

    // Delete all existing data (in correct order due to foreign keys)
    console.log('\n🗑️  Deleting existing data...');
    await prisma.transaction.deleteMany();
    await prisma.settings.deleteMany();
    await prisma.user.deleteMany();

    // Restore users first
    if (backup.data.users && backup.data.users.length > 0) {
      console.log(`\n👤 Restoring ${backup.data.users.length} users...`);
      for (const user of backup.data.users) {
        await prisma.user.create({
          data: {
            ...user,
            id: user.id, // Keep original ID
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
          },
        });
      }
      console.log('✅ Users restored');
    }

    // Restore settings
    if (backup.data.settings && backup.data.settings.length > 0) {
      console.log(`\n⚙️  Restoring ${backup.data.settings.length} settings...`);
      for (const setting of backup.data.settings) {
        await prisma.settings.create({
          data: {
            ...setting,
            id: setting.id, // Keep original ID
            createdAt: setting.createdAt ? new Date(setting.createdAt) : new Date(),
            updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : new Date(),
          },
        });
      }
      console.log('✅ Settings restored');
    }

    // Restore transactions
    if (backup.data.transactions && backup.data.transactions.length > 0) {
      console.log(
        `\n💰 Restoring ${backup.data.transactions.length} transactions...`,
      );
      // Restore in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < backup.data.transactions.length; i += batchSize) {
        const batch = backup.data.transactions.slice(i, i + batchSize);
        await prisma.transaction.createMany({
          data: batch.map((transaction) => ({
            ...transaction,
            id: transaction.id, // Keep original ID
            date: transaction.date ? new Date(transaction.date) : new Date(),
            createdAt: transaction.createdAt
              ? new Date(transaction.createdAt)
              : new Date(),
            updatedAt: transaction.updatedAt
              ? new Date(transaction.updatedAt)
              : new Date(),
            recurringEndDate: transaction.recurringEndDate
              ? new Date(transaction.recurringEndDate)
              : null,
          })),
        });
        process.stdout.write(
          `   ${Math.min(i + batchSize, backup.data.transactions.length)}/${backup.data.transactions.length}\r`,
        );
      }
      console.log('\n✅ Transactions restored');
    }

    console.log('\n✅ Restore completed successfully!');
  } catch (error) {
    console.error('\n❌ Restore failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreBackup();

