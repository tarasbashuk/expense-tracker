#!/usr/bin/env node

/**
 * Database Backup Script using Prisma
 * Creates both JSON and SQL backups
 * Usage: node scripts/backup-db-prisma.js [description]
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile(path.join(__dirname, '../.env.local'));
loadEnvFile(path.join(__dirname, '../.env'));

const prisma = new PrismaClient();

// Create backup directory
const backupDir = path.join(__dirname, '../db_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Generate timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const description = process.argv[2] || 'backup';
const jsonBackupFile = path.join(backupDir, `backup_${description}_${timestamp}.json`);
const sqlBackupFile = path.join(backupDir, `backup_${description}_${timestamp}.sql`);

console.log(`📦 Creating backups: ${path.basename(jsonBackupFile)} and ${path.basename(sqlBackupFile)}`);
console.log('This may take a few minutes...\n');

async function createSQLBackup() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not found, skipping SQL backup');
    return false;
  }

  try {
    console.log('📄 Creating SQL backup...');
    execSync(
      `pg_dump "${DATABASE_URL}" --no-owner --no-acl --clean --if-exists > "${sqlBackupFile}"`,
      { stdio: 'pipe' }
    );
    
    const stats = fs.statSync(sqlBackupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ SQL backup created: ${path.basename(sqlBackupFile)} (${fileSizeMB} MB)`);
    return true;
  } catch (error) {
    console.warn('⚠️  SQL backup failed (this is OK if pg_dump version mismatch):');
    console.warn('   You can restore from JSON backup using: node scripts/restore-db-prisma.js');
    if (fs.existsSync(sqlBackupFile)) {
      fs.unlinkSync(sqlBackupFile);
    }
    return false;
  }
}

async function createJSONBackup() {
  try {
    console.log('📊 Creating JSON backup...');
    
    // Export all data
    const [users, transactions, settings] = await Promise.all([
      prisma.user.findMany(),
      prisma.transaction.findMany(),
      prisma.settings.findMany(),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      description,
      data: {
        users,
        transactions,
        settings,
      },
    };

    // Write to file
    fs.writeFileSync(jsonBackupFile, JSON.stringify(backup, null, 2));

    // Get file size
    const stats = fs.statSync(jsonBackupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ JSON backup created: ${path.basename(jsonBackupFile)} (${fileSizeMB} MB)`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Settings: ${settings.length}`);
    return true;
  } catch (error) {
    console.error('\n❌ JSON backup failed!');
    console.error(error);
    if (fs.existsSync(jsonBackupFile)) {
      fs.unlinkSync(jsonBackupFile);
    }
    return false;
  }
}

async function createBackup() {
  try {
    // Create both backups
    const sqlSuccess = await createSQLBackup();
    const jsonSuccess = await createJSONBackup();

    console.log('\n' + '='.repeat(50));
    if (sqlSuccess && jsonSuccess) {
      console.log('✅ Both backups created successfully!');
      console.log(`   SQL: ${path.basename(sqlBackupFile)}`);
      console.log(`   JSON: ${path.basename(jsonBackupFile)}`);
      console.log('\n💡 To restore SQL backup:');
      console.log(`   psql $DATABASE_URL < ${sqlBackupFile}`);
      console.log('\n💡 To restore JSON backup:');
      console.log(`   node scripts/restore-db-prisma.js ${jsonBackupFile}`);
    } else if (jsonSuccess) {
      console.log('✅ JSON backup created successfully!');
      console.log(`   File: ${path.basename(jsonBackupFile)}`);
      console.log('\n💡 To restore:');
      console.log(`   node scripts/restore-db-prisma.js ${jsonBackupFile}`);
    } else {
      console.log('❌ Backup failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Backup failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBackup();

