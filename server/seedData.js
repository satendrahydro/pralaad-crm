const bcrypt = require('bcryptjs');

function seedComplete5ClientData(db) {
  console.log('[Seeder] Initializing pristine 5-client multi-product dataset...');

  db.pragma('foreign_keys = OFF');

  const runTx = db.transaction(() => {
    // 1. Clear transactional tables in reverse dependency order
    const tables = [
      'savings_transactions', 'savings_accounts',
      'rd_installments', 'recurring_deposits',
      'mis_payout_schedules', 'mis_accounts',
      'fd_schedules', 'fixed_deposits',
      'approval_requests', 'transaction_entries', 'transactions',
      'customers', 'branches', 'fd_schemes'
    ];
    for (const t of tables) {
      try { db.exec(`DELETE FROM ${t};`); } catch(e){}
    }

    // 2. Insert 4 Official Taranganjali Branches
    const insertBranch = db.prepare(`
      INSERT OR REPLACE INTO branches (id, branch_code, branch_name, address, city, state, pincode, contact_phone, contact_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const branches = [
      [1, 'BHR001', 'MAIN BRANCH', 'Near Railway Station, Bijnor', 'Bijnor', 'Uttar Pradesh', '246701', '+91 98974 63367', 'main@taranganjali.com'],
      [2, 'BRH003', 'TARPL SAVING', 'Vedik Vihar, Bijnor', 'Bijnor', 'Uttar Pradesh', '246701', '+91 98974 63367', 'saving@taranganjali.com'],
      [3, 'TARPL0002', 'SHEKHUPURA BRANCH', 'Shekhupura Mandawar Road, Bijnor', 'Bijnor', 'Uttar Pradesh', '246701', '+91 98974 63367', 'shekhupura@taranganjali.com'],
      [4, 'BHR002', 'TARPL0002', 'Shanti Vihar, Bijnor', 'Bijnor', 'Uttar Pradesh', '246701', '+91 98974 63367', 'shantivihar@taranganjali.com']
    ];
    for (const b of branches) insertBranch.run(...b);

    // 3. Insert 19 Official Schemes
    const insertScheme = db.prepare(`
      INSERT INTO fd_schemes (scheme_code, scheme_name, min_amount, max_amount, min_tenure_months, max_tenure_months, interest_rate, senior_citizen_bonus, compounding_frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const officialSchemes = [
      ['TARPL_FD_2019_DOUBLE', 'TARPL FD 2019 DOUBLE', 1000, 10000000, 72, 72, 12.24, 0.5, 'CUMULATIVE_YEARLY'],
      ['TARPL_FD_1', 'TARPL FD 1', 1000, 10000000, 12, 60, 15.00, 0.5, 'YEARLY'],
      ['TARPL_FD_2', 'TARPL FD 2', 1000, 10000000, 12, 67, 18.00, 0.5, 'YEARLY'],
      ['FD_GAURANSH', 'FD GAURANSH', 5000, 10000000, 12, 60, 24.00, 0.5, 'YEARLY'],
      ['DEVRAJ', 'DEVRAJ', 5000, 10000000, 12, 60, 20.00, 0.5, 'YEARLY'],
      ['TARPL_MIS_1', 'TARPL MIS 1', 10000, 10000000, 12, 60, 12.00, 0.5, 'MONTHLY'],
      ['TARPL_MIS_2', 'TARPL MIS 2', 10000, 10000000, 12, 60, 15.00, 0.5, 'MONTHLY'],
      ['TARPL_MIS_3', 'TARPL MIS 3', 10000, 10000000, 12, 60, 18.00, 0.5, 'MONTHLY'],
      ['TARPL_MIS_4', 'TARPL MIS 4', 10000, 10000000, 12, 60, 24.00, 0.5, 'MONTHLY'],
      ['TARPL_MIS_5', 'TARPL MIS 5', 10000, 10000000, 12, 60, 36.00, 0.5, 'MONTHLY'],
      ['MIS_NARPAT_SINGH', 'MIS Narpat Singh', 10000, 10000000, 12, 72, 16.50, 0.5, 'MONTHLY'],
      ['TARPL_ADARSH', 'TARPL Adarsh', 10000, 10000000, 12, 60, 20.00, 0.5, 'MONTHLY'],
      ['MIS_1625', 'MIS 1.625%', 10000, 10000000, 12, 60, 19.50, 0.5, 'MONTHLY'],
      ['MANOJ_MEERPUR', 'Manoj Meerpur', 10000, 10000000, 12, 60, 21.00, 0.5, 'MONTHLY'],
      ['TARPL_PRADEEP', 'TARPL Pradeep', 10000, 10000000, 12, 60, 30.00, 0.5, 'MONTHLY'],
      ['TARPL_PENSION', 'TARPL New Pension Scheme', 10000, 10000000, 60, 120, 14.00, 0.5, 'MONTHLY'],
      ['TARPL_RD_1', 'TARPL RD 1', 500, 500000, 12, 60, 20.78, 0.5, 'MONTHLY'],
      ['TARPL_RD_2', 'TARPL RD 2', 500, 500000, 12, 60, 18.00, 0.5, 'MONTHLY'],
      ['TARPL_DD_2', 'TARPL DD 2 (Daily Deposit)', 100, 50000, 6, 24, 12.00, 0.5, 'DAILY']
    ];
    for (const s of officialSchemes) insertScheme.run(...s);

    // 4. Insert 5 Verified Clients
    const insertCustomer = db.prepare(`
      INSERT INTO customers (
        id, customer_code, full_name, father_name, phone, email,
        pan_card, aadhaar_no, address, bank_name, account_no, ifsc_code,
        nominee_name, nominee_relation, is_senior_citizen, kyc_status, branch, group_name, status,
        created_at, login_id, login_password, app_access_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const clients = [
      [
        1, 'M00001', 'PRAHLAD SINGH HIRANWAL', 'Geeta Hiranwal', '9897463367', 'prahlad@taranganjali.com',
        'AAAPH1234F', '789012345678', 'Vedik Vihar, Bijnor, UP', 'State Bank of India', '301122334455', 'SBIN0001234',
        'Geeta Hiranwal', 'Wife', 0, 'Verified', 'MAIN BRANCH', 'DIRECTOR', 'ACTIVE', '2019-06-12 10:00:00',
        'M00001', 'M00001@123', 1
      ],
      [
        2, 'M00012', 'NARPAT SINGH', 'Late Bhagwat Singh', '9837012345', 'narpat@taranganjali.com',
        'BODPS9674G', '657058077884', 'Village Bakharpur Gadhi, Bijnor, UP', 'Punjab National Bank', '0123000100234567', 'PUNB0012300',
        'Yashoda Devi', 'Wife', 1, 'Verified', 'MAIN BRANCH', 'SENIOR INVESTOR', 'ACTIVE', '2019-07-11 10:00:00',
        'M00012', 'M00012@123', 1
      ],
      [
        3, 'M00008', 'YADRAM SINGH PAL', 'Harbans Singh', '9756026399', 'yadram@taranganjali.com',
        'FZKPK2569C', '773186384201', 'Mayapur Project Colony, Haridwar / Bijnor', 'HDFC Bank', '50100223344556', 'HDFC0000456',
        'Karan Singh', 'Son', 1, 'Verified', 'TARPL SAVING', 'COMMETY 0F 15/01/2018', 'ACTIVE', '2019-06-15 10:00:00',
        'M00008', 'M00008@123', 1
      ],
      [
        4, 'M00769', 'ANITA DEVI', 'Pradeep Kumar', '9412345678', 'anita@taranganjali.com',
        'DGUPD3715E', '426563507454', 'Shekhupura Mandawar Road, Bijnor, UP', 'Bank of Baroda', '12340100056789', 'BARB0BIJNOR',
        'Pradeep Kumar', 'Husband', 0, 'Verified', 'SHEKHUPURA BRANCH', 'WOMEN EMPOWERMENT', 'ACTIVE', '2021-03-20 10:00:00',
        'M00769', 'M00769@123', 1
      ],
      [
        5, 'M00065', 'MUKESH KUMAR SUWAHEDI', 'Ram Swaroop', '9837712345', 'mukesh@taranganjali.com',
        'DEOPP0036Q', '659476047753', 'Village Suwahedi, Bijnor, UP', 'Canara Bank', '2045101009876', 'CNRB0002045',
        'Sunita Devi', 'Wife', 0, 'Verified', 'TARPL0002', 'GENERAL', 'ACTIVE', '2022-01-10 10:00:00',
        'M00065', 'M00065@123', 1
      ]
    ];
    for (const c of clients) insertCustomer.run(...c);

    // 5. Insert Fixed Deposits (FDs) - 6 contracts across all 5 clients
    const insertFD = db.prepare(`
      INSERT INTO fixed_deposits (
        id, fd_number, customer_id, principal_amount, annual_rate, tenure_months, tenure_days,
        compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
        start_date, maturity_date, status, premature_penalty_rate, premature_interest_paid, closed_date,
        remarks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const fds = [
      [
        1, 'FD00001', 1, 500000.0, 12.24, 72, 0, 'CUMULATIVE_YEARLY', 1, 0.0,
        500000.0, 1000000.0, '2022-01-15', '2028-01-15', 'ACTIVE', 1.0, 0.0, null,
        'TARPL FD 2019 DOUBLE | 4 Years Old Active Contract', '2022-01-15 10:00:00'
      ],
      [
        2, 'FD00002', 2, 1000000.0, 20.0, 24, 0, 'MONTHLY', 0, 16666.67,
        400000.0, 1000000.0, '2025-08-01', '2027-08-01', 'ACTIVE', 1.0, 0.0, null,
        'DEVRAJ 20% Senior Citizen Pension Scheme', '2025-08-01 10:00:00'
      ],
      [
        3, 'FD00003', 3, 1500000.0, 18.0, 67, 0, 'YEARLY', 0, 270000.0,
        540000.0, 1500000.0, '2022-04-01', '2027-11-01', 'CLOSED_PREMATURE', 1.0, 500000.0, '2024-04-01',
        'TARPL FD 2 | Foreclosed after 24M with penalty', '2022-04-01 10:00:00'
      ],
      [
        4, 'FD00004', 3, 2500000.0, 12.24, 72, 0, 'CUMULATIVE_YEARLY', 1, 0.0,
        2500000.0, 5000000.0, '2026-05-15', '2032-05-15', 'ACTIVE', 1.0, 0.0, null,
        'TARPL FD 2019 DOUBLE | 6 Months Old Active Capital', '2026-05-15 10:00:00'
      ],
      [
        5, 'FD00005', 4, 300000.0, 15.0, 24, 0, 'YEARLY', 0, 45000.0,
        90000.0, 300000.0, '2025-11-01', '2027-11-01', 'ACTIVE', 1.0, 0.0, null,
        'TARPL FD 1 | 15% Annual Payout Scheme', '2025-11-01 10:00:00'
      ],
      [
        6, 'FD00006', 5, 200000.0, 24.0, 24, 0, 'YEARLY', 0, 48000.0,
        96000.0, 200000.0, '2025-10-01', '2027-10-01', 'ACTIVE', 1.0, 0.0, null,
        'FD GAURANSH 24% Growth Scheme', '2025-10-01 10:00:00'
      ]
    ];
    for (const f of fds) insertFD.run(...f);

    // FD Payout Schedules for Narpat Singh FD00002 (24 periods: 15 PAID, 9 PENDING)
    const insertFDSched = db.prepare(`
      INSERT INTO fd_schedules (fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status, paid_date, payment_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (let p = 1; p <= 24; p++) {
      const dt = new Date(2025, 7, 1);
      dt.setDate(dt.getDate() + 30 * p);
      const dateStr = dt.toISOString().split('T')[0];
      const isPaid = p <= 15;
      insertFDSched.run(
        2, p, dateStr, 16666.67, 16666.67, 16666.67 * p, 1000000.0,
        isPaid ? 'PAID' : 'PENDING',
        isPaid ? dateStr : null,
        isPaid ? `UTR-SBI-202508-${1000 + p}` : null
      );
    }
    insertFDSched.run(5, 1, '2026-11-01', 45000.0, 45000.0, 45000.0, 300000.0, 'PAID', '2026-11-01', 'NEFT-BOB-20261101-094');
    insertFDSched.run(5, 2, '2027-11-01', 45000.0, 45000.0, 90000.0, 300000.0, 'PENDING', null, null);

    // 6. Insert Monthly Income Scheme (MIS) - ALL 5 Clients
    const insertMIS = db.prepare(`
      INSERT INTO mis_accounts (
        id, mis_number, customer_id, branch_id, deposit_amount, annual_rate, tenure_months,
        monthly_payout, total_payout_amount, start_date, maturity_date, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const misAccounts = [
      [1, 'MIS00001', 1, 1, 1000000.0, 12.0, 60, 10000.0, 600000.0, '2025-05-10', '2030-05-10', 'ACTIVE', 'TARPL MIS 1 | ₹10,000/mo Monthly Payout'],
      [2, 'MIS00002', 2, 1, 400000.0, 16.5, 72, 5500.0, 396000.0, '2023-06-11', '2029-06-11', 'ACTIVE', 'MIS Narpat Singh | Official Scheme ₹5,500/mo'],
      [3, 'MIS00003', 3, 2, 1500000.0, 18.0, 60, 22500.0, 1350000.0, '2025-04-01', '2030-04-01', 'ACTIVE', 'TARPL MIS 3 | ₹22,500/mo Monthly Payout'],
      [4, 'MIS00004', 4, 3, 700000.0, 24.0, 60, 14000.0, 840000.0, '2025-09-01', '2030-09-01', 'ACTIVE', 'TARPL Pradeep 24% | ₹14,000/mo Monthly Payout'],
      [5, 'MIS00005', 5, 4, 300000.0, 15.0, 36, 3750.0, 135000.0, '2026-01-10', '2029-01-10', 'ACTIVE', 'TARPL MIS 2 | ₹3,750/mo Monthly Payout']
    ];
    for (const m of misAccounts) insertMIS.run(...m);

    // MIS Payout Schedules for ALL 5 accounts
    const insertMISSched = db.prepare(`
      INSERT INTO mis_payout_schedules (mis_id, month_no, payout_date, payout_amount, tds_deducted, net_payable, status, paid_date, payment_reference)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `);
    for (const m of misAccounts) {
      const [mId, , , , , , tenure, payout, , sDate] = m;
      const s = new Date(sDate);
      for (let monthNo = 1; monthNo <= tenure; monthNo++) {
        const d = new Date(s);
        d.setDate(d.getDate() + 30 * monthNo);
        const dtStr = d.toISOString().split('T')[0];
        const isPaid = dtStr <= '2026-11-10';
        insertMISSched.run(
          mId, monthNo, dtStr, payout, payout,
          isPaid ? 'PAID' : 'PENDING',
          isPaid ? dtStr : null,
          isPaid ? `MIS-PAY-${String(mId).padStart(2, '0')}-${String(monthNo).padStart(2, '0')}` : null
        );
      }
    }

    // 7. Insert Recurring Deposits (RD) - ALL 5 Clients
    const insertRD = db.prepare(`
      INSERT INTO recurring_deposits (
        id, rd_number, customer_id, branch_id, monthly_installment, annual_rate, tenure_months,
        start_date, maturity_date, total_principal, total_interest, maturity_amount,
        installments_paid, amount_deposited, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const rds = [
      [1, 'RD00001', 1, 1, 5000.0, 20.78, 12, '2026-05-01', '2027-05-01', 60000.0, 7200.0, 67200.0, 6, 30000.0, 'ACTIVE', 'TARPL RD 1 | 6 Months Paid'],
      [2, 'RD00002', 2, 1, 10000.0, 18.0, 24, '2025-06-01', '2027-06-01', 240000.0, 48000.0, 288000.0, 17, 170000.0, 'ACTIVE', 'TARPL RD 2 | 17 Months Paid'],
      [3, 'RD00003', 3, 2, 20000.0, 18.0, 36, '2024-04-01', '2027-04-01', 720000.0, 144000.0, 864000.0, 31, 620000.0, 'ACTIVE', 'TARPL RD 2 | 31 Months Paid'],
      [4, 'RD00004', 4, 3, 3000.0, 20.78, 12, '2026-06-01', '2027-06-01', 36000.0, 4300.0, 40300.0, 5, 15000.0, 'ACTIVE', 'TARPL RD 1 | 5 Months Paid'],
      [5, 'RD00005', 5, 4, 5000.0, 20.78, 12, '2026-01-10', '2027-01-10', 60000.0, 7200.0, 67200.0, 10, 50000.0, 'ACTIVE', 'TARPL RD 1 | 10 Months Paid']
    ];
    for (const r of rds) insertRD.run(...r);

    const insertRDInst = db.prepare(`
      INSERT INTO rd_installments (rd_id, installment_no, due_date, installment_amount, status, paid_date, total_collected, payment_mode, transaction_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of rds) {
      const [rId, , , , mInst, , tenure, sDate, , , , , paidCnt] = r;
      const s = new Date(sDate);
      for (let instNo = 1; instNo <= tenure; instNo++) {
        const d = new Date(s);
        d.setDate(d.getDate() + 30 * (instNo - 1));
        const dtStr = d.toISOString().split('T')[0];
        const isPaid = instNo <= paidCnt;
        insertRDInst.run(
          rId, instNo, dtStr, mInst,
          isPaid ? 'PAID' : 'PENDING',
          isPaid ? dtStr : null,
          isPaid ? mInst : 0,
          isPaid ? 'CASH_COUNTER' : null,
          isPaid ? `VCH-RD-${String(rId).padStart(2, '0')}-${String(instNo).padStart(2, '0')}` : null
        );
      }
    }

    // 8. Insert Savings Accounts (SB) - ALL 5 Clients
    const insertSB = db.prepare(`
      INSERT INTO savings_accounts (id, account_number, customer_id, branch_id, current_balance, status, opened_date, nominee_name, nominee_relation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const savings = [
      [1, 'SB00001', 1, 1, 125450.0, 'ACTIVE', '2019-06-12', 'Geeta Hiranwal', 'Wife'],
      [2, 'SB00002', 2, 1, 218500.0, 'ACTIVE', '2019-07-11', 'Yashoda Devi', 'Wife'],
      [3, 'SB00003', 3, 2, 485200.0, 'ACTIVE', '2019-06-15', 'Karan Singh', 'Son'],
      [4, 'SB00004', 4, 3, 82400.0, 'ACTIVE', '2021-03-20', 'Pradeep Kumar', 'Husband'],
      [5, 'SB00005', 5, 4, 64250.0, 'ACTIVE', '2022-01-10', 'Sunita Devi', 'Wife']
    ];
    for (const s of savings) insertSB.run(...s);

    // Passbook Ledger Transactions (75+ detailed entries)
    const insertSBTxn = db.prepare(`
      INSERT INTO savings_transactions (account_id, transaction_number, transaction_type, amount, balance_after, payment_mode, reference_number, narration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Prahlad Singh
    const pTxns = [
      ['2025-05-10', 'CREDIT', 50000.0, 50000.0, 'CASH', 'VCH-SB-001', 'Opening Cash Deposit at Main Branch counter'],
      ['2025-06-10', 'CREDIT', 10000.0, 60000.0, 'TRANSFER', 'MIS-PAY-01-01', 'Monthly Interest Credit - MIS00001 (Month 1)'],
      ['2025-07-10', 'CREDIT', 10000.0, 70000.0, 'TRANSFER', 'MIS-PAY-01-02', 'Monthly Interest Credit - MIS00001 (Month 2)'],
      ['2025-07-25', 'DEBIT', 15000.0, 55000.0, 'CASH', 'WDL-0012', 'Cash Withdrawal for agricultural expenses'],
      ['2025-08-10', 'CREDIT', 10000.0, 65000.0, 'TRANSFER', 'MIS-PAY-01-03', 'Monthly Interest Credit - MIS00001 (Month 3)'],
      ['2025-09-10', 'CREDIT', 10000.0, 75000.0, 'TRANSFER', 'MIS-PAY-01-04', 'Monthly Interest Credit - MIS00001 (Month 4)'],
      ['2025-09-30', 'CREDIT', 520.0, 75520.0, 'SYSTEM', 'INT-Q2-2025', 'Quarterly Savings Interest Credit @ 4% p.a.'],
      ['2025-10-10', 'CREDIT', 10000.0, 85520.0, 'TRANSFER', 'MIS-PAY-01-05', 'Monthly Interest Credit - MIS00001 (Month 5)'],
      ['2025-11-10', 'CREDIT', 10000.0, 95520.0, 'TRANSFER', 'MIS-PAY-01-06', 'Monthly Interest Credit - MIS00001 (Month 6)'],
      ['2025-12-10', 'CREDIT', 10000.0, 105520.0, 'TRANSFER', 'MIS-PAY-01-07', 'Monthly Interest Credit - MIS00001 (Month 7)'],
      ['2025-12-31', 'CREDIT', 680.0, 106200.0, 'SYSTEM', 'INT-Q3-2025', 'Quarterly Savings Interest Credit @ 4% p.a.'],
      ['2026-01-10', 'CREDIT', 10000.0, 116200.0, 'TRANSFER', 'MIS-PAY-01-08', 'Monthly Interest Credit - MIS00001 (Month 8)'],
      ['2026-02-10', 'CREDIT', 10000.0, 126200.0, 'TRANSFER', 'MIS-PAY-01-09', 'Monthly Interest Credit - MIS00001 (Month 9)'],
      ['2026-03-10', 'CREDIT', 10000.0, 136200.0, 'TRANSFER', 'MIS-PAY-01-10', 'Monthly Interest Credit - MIS00001 (Month 10)'],
      ['2026-03-31', 'CREDIT', 750.0, 136950.0, 'SYSTEM', 'INT-Q4-2025', 'Quarterly Savings Interest Credit @ 4% p.a.'],
      ['2026-04-10', 'CREDIT', 10000.0, 146950.0, 'TRANSFER', 'MIS-PAY-01-11', 'Monthly Interest Credit - MIS00001 (Month 11)'],
      ['2026-05-01', 'DEBIT', 5000.0, 141950.0, 'AUTO_DEBIT', 'RD-INST-01-01', 'Auto-Debit: RD00001 Monthly Installment #1'],
      ['2026-05-10', 'CREDIT', 10000.0, 151950.0, 'TRANSFER', 'MIS-PAY-01-12', 'Monthly Interest Credit - MIS00001 (Month 12)'],
      ['2026-06-01', 'DEBIT', 5000.0, 146950.0, 'AUTO_DEBIT', 'RD-INST-01-02', 'Auto-Debit: RD00001 Monthly Installment #2'],
      ['2026-06-10', 'CREDIT', 10000.0, 156950.0, 'TRANSFER', 'MIS-PAY-01-13', 'Monthly Interest Credit - MIS00001 (Month 13)'],
      ['2026-07-01', 'DEBIT', 5000.0, 151950.0, 'AUTO_DEBIT', 'RD-INST-01-03', 'Auto-Debit: RD00001 Monthly Installment #3'],
      ['2026-08-01', 'DEBIT', 5000.0, 146950.0, 'AUTO_DEBIT', 'RD-INST-01-04', 'Auto-Debit: RD00001 Monthly Installment #4'],
      ['2026-09-01', 'DEBIT', 5000.0, 141950.0, 'AUTO_DEBIT', 'RD-INST-01-05', 'Auto-Debit: RD00001 Monthly Installment #5'],
      ['2026-10-01', 'DEBIT', 5000.0, 136950.0, 'AUTO_DEBIT', 'RD-INST-01-06', 'Auto-Debit: RD00001 Monthly Installment #6'],
      ['2026-10-15', 'DEBIT', 21500.0, 115450.0, 'CHEQUE', 'CHQ-88902', 'Self Cheque Withdrawal passed by Cashier'],
      ['2026-11-05', 'CREDIT', 10000.0, 125450.0, 'TRANSFER', 'MIS-PAY-01-18', 'Monthly Interest Credit - MIS00001 (Month 18)']
    ];
    pTxns.forEach((t, i) => insertSBTxn.run(1, `TXN-SB-1-${String(i+1).padStart(3, '0')}`, t[1], t[2], t[3], t[4], t[5], t[6], `${t[0]} 11:30:00`));

    // Narpat Singh
    const nTxns = [
      ['2024-01-10', 'CREDIT', 100000.0, 100000.0, 'BANK_TRANSFER', 'NEFT-PNB-0982', 'Opening Account Inward Remittance from PNB'],
      ['2024-06-11', 'CREDIT', 5500.0, 105500.0, 'TRANSFER', 'MIS-PAY-02-12', 'Monthly Interest Credit - MIS Narpat Singh'],
      ['2024-12-11', 'CREDIT', 5500.0, 111000.0, 'TRANSFER', 'MIS-PAY-02-18', 'Monthly Interest Credit - MIS Narpat Singh'],
      ['2025-06-01', 'DEBIT', 10000.0, 101000.0, 'AUTO_DEBIT', 'RD-INST-02-01', 'Auto-Debit: RD00002 Monthly Installment #1'],
      ['2025-08-01', 'CREDIT', 16666.67, 117666.67, 'TRANSFER', 'FD-PAY-02-01', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2025-09-01', 'CREDIT', 16666.67, 134333.34, 'TRANSFER', 'FD-PAY-02-02', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2025-10-01', 'CREDIT', 16666.67, 151000.01, 'TRANSFER', 'FD-PAY-02-03', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2025-11-01', 'CREDIT', 16666.67, 167666.68, 'TRANSFER', 'FD-PAY-02-04', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2025-12-01', 'CREDIT', 16666.67, 184333.35, 'TRANSFER', 'FD-PAY-02-05', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2026-01-01', 'CREDIT', 16666.67, 201000.02, 'TRANSFER', 'FD-PAY-02-06', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2026-03-31', 'CREDIT', 2500.0, 203500.02, 'SYSTEM', 'INT-Q4-2025', 'Quarterly Savings Interest Credit @ 4% p.a.'],
      ['2026-05-01', 'CREDIT', 16666.67, 220166.69, 'TRANSFER', 'FD-PAY-02-10', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2026-07-01', 'CREDIT', 16666.67, 236833.36, 'TRANSFER', 'FD-PAY-02-12', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2026-09-01', 'DEBIT', 40000.0, 196833.36, 'CASH', 'WDL-0881', 'Cash Withdrawal counter slip'],
      ['2026-10-01', 'CREDIT', 16666.67, 213500.03, 'TRANSFER', 'FD-PAY-02-15', 'Monthly Pension Payout - DEVRAJ FD00002'],
      ['2026-11-05', 'CREDIT', 5000.0, 218500.0, 'CASH', 'DEP-0994', 'Counter Cash Deposit by Narpat Singh']
    ];
    nTxns.forEach((t, i) => insertSBTxn.run(2, `TXN-SB-2-${String(i+1).padStart(3, '0')}`, t[1], t[2], t[3], t[4], t[5], t[6], `${t[0]} 10:15:00`));

    // Yadram Singh
    const yTxns = [
      ['2024-04-01', 'CREDIT', 500000.0, 500000.0, 'TRANSFER', 'FD-PREM-003', 'Premature Closure Redemption Proceeds: FD00003'],
      ['2024-04-10', 'DEBIT', 200000.0, 300000.0, 'BANK_TRANSFER', 'RTGS-HDFC-991', 'RTGS Transfer to HDFC Bank Haridwar Account'],
      ['2024-10-01', 'CREDIT', 22500.0, 322500.0, 'TRANSFER', 'MIS-PAY-03-06', 'Monthly Interest Credit - MIS00003'],
      ['2025-01-01', 'CREDIT', 22500.0, 345000.0, 'TRANSFER', 'MIS-PAY-03-09', 'Monthly Interest Credit - MIS00003'],
      ['2025-04-01', 'CREDIT', 22500.0, 367500.0, 'TRANSFER', 'MIS-PAY-03-12', 'Monthly Interest Credit - MIS00003'],
      ['2025-06-30', 'CREDIT', 3200.0, 370700.0, 'SYSTEM', 'INT-Q1-2025', 'Quarterly Savings Interest Credit @ 4% p.a.'],
      ['2025-09-01', 'CREDIT', 22500.0, 393200.0, 'TRANSFER', 'MIS-PAY-03-17', 'Monthly Interest Credit - MIS00003'],
      ['2025-12-01', 'CREDIT', 22500.0, 415700.0, 'TRANSFER', 'MIS-PAY-03-20', 'Monthly Interest Credit - MIS00003'],
      ['2026-03-01', 'CREDIT', 22500.0, 438200.0, 'TRANSFER', 'MIS-PAY-03-23', 'Monthly Interest Credit - MIS00003'],
      ['2026-05-15', 'DEBIT', 50000.0, 388200.0, 'TRANSFER', 'BOOK-FD-004', 'Debit towards Booking of Growth FD00004'],
      ['2026-07-01', 'CREDIT', 22500.0, 410700.0, 'TRANSFER', 'MIS-PAY-03-27', 'Monthly Interest Credit - MIS00003'],
      ['2026-09-01', 'CREDIT', 22500.0, 433200.0, 'TRANSFER', 'MIS-PAY-03-29', 'Monthly Interest Credit - MIS00003'],
      ['2026-10-01', 'CREDIT', 22500.0, 455700.0, 'TRANSFER', 'MIS-PAY-03-30', 'Monthly Interest Credit - MIS00003'],
      ['2026-11-01', 'CREDIT', 29500.0, 485200.0, 'TRANSFER', 'MIS-PAY-03-31', 'Monthly Interest Credit - MIS00003 + Bonus']
    ];
    yTxns.forEach((t, i) => insertSBTxn.run(3, `TXN-SB-3-${String(i+1).padStart(3, '0')}`, t[1], t[2], t[3], t[4], t[5], t[6], `${t[0]} 12:00:00`));

    // Anita Devi
    const aTxns = [
      ['2025-09-01', 'CREDIT', 25000.0, 25000.0, 'CASH', 'VCH-SB-004', 'Opening Cash Deposit at Shekhupura Branch'],
      ['2025-10-01', 'CREDIT', 14000.0, 39000.0, 'TRANSFER', 'MIS-PAY-04-01', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2025-11-01', 'CREDIT', 14000.0, 53000.0, 'TRANSFER', 'MIS-PAY-04-02', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2025-12-01', 'CREDIT', 14000.0, 67000.0, 'TRANSFER', 'MIS-PAY-04-03', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2026-01-01', 'CREDIT', 14000.0, 81000.0, 'TRANSFER', 'MIS-PAY-04-04', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2026-02-15', 'DEBIT', 20000.0, 61000.0, 'CASH', 'WDL-0219', 'Cash Withdrawal for domestic expenses'],
      ['2026-04-01', 'CREDIT', 14000.0, 75000.0, 'TRANSFER', 'MIS-PAY-04-07', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2026-06-01', 'DEBIT', 3000.0, 72000.0, 'AUTO_DEBIT', 'RD-INST-04-01', 'Auto-Debit: RD00004 Installment #1'],
      ['2026-08-01', 'DEBIT', 3000.0, 69000.0, 'AUTO_DEBIT', 'RD-INST-04-03', 'Auto-Debit: RD00004 Installment #3'],
      ['2026-10-01', 'CREDIT', 14000.0, 83000.0, 'TRANSFER', 'MIS-PAY-04-13', 'Monthly Interest Credit - TARPL Pradeep MIS00004'],
      ['2026-11-01', 'DEBIT', 600.0, 82400.0, 'CHEQUE', 'CHQ-10492', 'Locker Maintenance & SMS Charges']
    ];
    aTxns.forEach((t, i) => insertSBTxn.run(4, `TXN-SB-4-${String(i+1).padStart(3, '0')}`, t[1], t[2], t[3], t[4], t[5], t[6], `${t[0]} 14:20:00`));

    // Mukesh Kumar
    const mTxns = [
      ['2026-01-10', 'CREDIT', 20000.0, 20000.0, 'CASH', 'VCH-SB-005', 'Opening Cash Deposit at TARPL0002 Branch'],
      ['2026-02-10', 'CREDIT', 3750.0, 23750.0, 'TRANSFER', 'MIS-PAY-05-01', 'Monthly Interest Credit - MIS00005'],
      ['2026-03-10', 'CREDIT', 3750.0, 27500.0, 'TRANSFER', 'MIS-PAY-05-02', 'Monthly Interest Credit - MIS00005'],
      ['2026-04-10', 'CREDIT', 3750.0, 31250.0, 'TRANSFER', 'MIS-PAY-05-03', 'Monthly Interest Credit - MIS00005'],
      ['2026-05-10', 'CREDIT', 3750.0, 35000.0, 'TRANSFER', 'MIS-PAY-05-04', 'Monthly Interest Credit - MIS00005'],
      ['2026-06-10', 'DEBIT', 5000.0, 30000.0, 'AUTO_DEBIT', 'RD-INST-05-06', 'Auto-Debit: RD00005 Installment #6'],
      ['2026-07-10', 'CREDIT', 3750.0, 33750.0, 'TRANSFER', 'MIS-PAY-05-06', 'Monthly Interest Credit - MIS00005'],
      ['2026-08-10', 'CREDIT', 3750.0, 37500.0, 'TRANSFER', 'MIS-PAY-05-07', 'Monthly Interest Credit - MIS00005'],
      ['2026-09-10', 'CREDIT', 25000.0, 62500.0, 'CHEQUE', 'CHQ-CAN-449', 'Cheque Clearing Credit from Canara Bank'],
      ['2026-10-10', 'CREDIT', 1750.0, 64250.0, 'TRANSFER', 'MIS-PAY-05-09', 'Monthly Interest Credit - MIS00005 (Net)']
    ];
    mTxns.forEach((t, i) => insertSBTxn.run(5, `TXN-SB-5-${String(i+1).padStart(3, '0')}`, t[1], t[2], t[3], t[4], t[5], t[6], `${t[0]} 15:45:00`));

    // 9. Maker-Checker Pending Approval Request
    db.prepare(`
      INSERT INTO approval_requests (
        request_number, request_type, maker_id, customer_id, fd_id, proposed_amount, request_data, status
      ) VALUES (
        'REQ-2026-001', 'NEW_FD', 1, 5, NULL, 100000.0,
        '{"customer_name": "MUKESH KUMAR SUWAHEDI", "scheme": "TARPL FD 2019 DOUBLE", "amount": 100000, "tenure": 72, "rate": 12.24}',
        'PENDING_APPROVAL'
      )
    `).run();

    // 10. Admin Users Setup
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    const hash = bcrypt.hashSync('Password@123', 10);
    if (!user) {
      db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role)
        VALUES ('admin', ?, 'System Administrator', 'admin')
      `).run(hash);
    } else {
      db.prepare(`
        UPDATE users SET password_hash = ?, failed_attempts = 0 WHERE username = 'admin'
      `).run(hash);
    }
  });

  runTx();
  console.log('[Seeder] 5-Client multi-product dataset initialized cleanly.');
}

module.exports = { seedComplete5ClientData };
