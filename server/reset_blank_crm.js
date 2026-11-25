/**
 * Clean Blank Client Handover Reset Script
 * Preserves Admin account, Branches, Deposit Schemes, Ledger Chart of Accounts, Ranks & Settings,
 * while removing all demo/test customers, deposits, loans, vouchers, agents, and setting blank_crm_mode=1.
 * Automatically creates a timestamped SQLite backup before wiping.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'fd_crm.sqlite');
if (fs.existsSync(dbFile)) {
  const backupFile = path.join(os.tmpdir(), `fd_crm_backup_before_blank_${Date.now()}.sqlite`);
  const Database = require('better-sqlite3');
  const tmpDb = new Database(dbFile);
  try { tmpDb.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
  tmpDb.close();
  fs.copyFileSync(dbFile, backupFile);
  console.log('Backup created:', backupFile);
}

const db = require('./db');

function resetToBlankCRM() {
  const tx = db.transaction(() => {
    const deleteTables = [
      'transaction_entries',
      'transactions',
      'fd_schedules',
      'fixed_deposits',
      'rd_installments',
      'recurring_deposits',
      'mis_payout_schedules',
      'mis_accounts',
      'savings_transactions',
      'savings_accounts',
      'loans_against_deposit',
      'gold_loans',
      'borrowings_udhar',
      'daily_expenses',
      'day_book_cash_entries',
      'approval_requests',
      'whatsapp_logs',
      'audit_logs',
      'staff_permission_audits',
      'agents',
      'customers'
    ];

    for (const tbl of deleteTables) {
      try {
        db.prepare(`DELETE FROM ${tbl}`).run();
        try {
          db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(tbl);
        } catch (e) {}
      } catch (e) {
        console.warn(`Skipped table ${tbl}:`, e.message);
      }
    }

    // Remove temporary audit/test users while preserving main admin account
    try {
      db.prepare("DELETE FROM users WHERE username != 'admin'").run();
    } catch (e) {}

    // Reset summary counters on configuration masters
    try { db.prepare("UPDATE agent_ranks SET associates_count = 0").run(); } catch (e) {}
    try { db.prepare("UPDATE collection_centers SET total_members = 0, total_collected = 0, advisor_id = NULL").run(); } catch (e) {}

    // Enable blank CRM mode so startup initDB() never re-seeds fake demo rows and ledger baselines start at 0.00
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('blank_crm_mode', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  tx();
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
  console.log('CRM database cleanly reset to Blank Client Handover state (blank_crm_mode=1).');
}

if (require.main === module) {
  resetToBlankCRM();
  process.exit(0);
}

module.exports = { resetToBlankCRM };
