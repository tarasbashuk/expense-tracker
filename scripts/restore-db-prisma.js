#!/usr/bin/env node

/**
 * Database Restore Script from Prisma JSON backup
 * Usage: node scripts/restore-db-prisma.js <backup-file.json>
 *
 * WARNING: This will DELETE all existing data and restore from backup!
 */

import { restoreBackupData } from './backup-data.js';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log(
      `   Merchant category rules: ${backup.data.merchantCategoryRules?.length || 0}`,
    );
    console.log(
      `   Quick transaction templates: ${backup.data.quickTransactionTemplates?.length || 0}`,
    );

    // Validate before deleting; restore all rows and relations atomically.
    await restoreBackupData(prisma, backup.data);

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
