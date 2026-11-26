const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { calculateFD, calculatePrematureWithdrawal } = require('../calculator');
const { getUserPermissions } = require('../middleware/permissions');

// 1. GET /api/approvals - List approval requests
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, type } = req.query;
    const isEmployee = req.user.role === 'employee';

    let query = `
      SELECT 
        a.*,
        maker.full_name as maker_name,
        maker.username as maker_username,
        checker.full_name as checker_name,
        c.full_name as customer_name,
        c.phone as customer_phone,
        fd.fd_number
      FROM approval_requests a
      JOIN users maker ON a.maker_id = maker.id
      LEFT JOIN users checker ON a.checker_id = checker.id
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN fixed_deposits fd ON a.fd_id = fd.id
      WHERE 1=1
    `;
    const params = [];

    // Employees only see their own requests
    if (isEmployee) {
      query += ` AND a.maker_id = ? `;
      params.push(req.user.id);
    }

    if (status && status !== 'ALL') {
      query += ` AND a.status = ? `;
      params.push(status);
    }

    if (type && type !== 'ALL') {
      query += ` AND a.request_type = ? `;
      params.push(type);
    }

    query += ` ORDER BY a.id DESC `;

    const requests = db.prepare(query).all(...params);

    // Parse JSON request_data
    const formatted = requests.map(r => {
      let parsed = {};
      try { parsed = JSON.parse(r.request_data); } catch(e){}
      return { ...r, request_data: parsed };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/approvals - Submit a new request (Maker action)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { request_type, customer_id, fd_id, proposed_amount, request_data, remarks } = req.body;

    if (!request_type || !request_data) {
      return res.status(400).json({ success: false, message: 'Request type and action data are required.' });
    }

    // Strict Granular Permission Enforcement for Staff Makers
    if (req.user.role === 'employee') {
      const perms = getUserPermissions(req.user.id);
      if (perms) {
        if (request_type === 'NEW_FD' && perms.fd_creation === false) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            permission: 'fd_creation',
            message: "Access denied. Super Admin has disabled the 'FD Creation' function for your staff account."
          });
        }
        if (request_type === 'NEW_RD' && perms.rd_creation === false) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            permission: 'rd_creation',
            message: "Access denied. Super Admin has disabled the 'RD Creation' function for your staff account."
          });
        }
        if (request_type === 'NEW_MIS' && perms.mis_creation === false) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            permission: 'mis_creation',
            message: "Access denied. Super Admin has disabled the 'MIS Creation' function for your staff account."
          });
        }
        if (request_type === 'NEW_SAVINGS_ACCOUNT' && perms.savings_creation === false) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            permission: 'savings_creation',
            message: "Access denied. Super Admin has disabled the 'Savings Account Creation' function for your staff account."
          });
        }
        if (['PREMATURE_CLOSURE', 'MATURITY_SETTLEMENT'].includes(request_type) && perms.fd_closure_request === false) {
          return res.status(403).json({
            success: false,
            code: 'PERMISSION_DENIED',
            permission: 'fd_closure_request',
            message: "Access denied. Super Admin has disabled the 'Maturity / Closure Request' function for your staff account."
          });
        }
      }
    }

    // Parse and strictly validate request_data
    let parsedData = {};
    try {
      parsedData = typeof request_data === 'string' ? JSON.parse(request_data) : request_data;
    } catch(e) {
      return res.status(400).json({ success: false, message: 'Invalid JSON request_data format.' });
    }

    const effectiveCustId = customer_id || parsedData.customerId || parsedData.customer_id;

    if (['NEW_FD', 'NEW_RD', 'NEW_MIS', 'NEW_SAVINGS_ACCOUNT'].includes(request_type)) {
      if (!effectiveCustId) {
        return res.status(400).json({ success: false, message: 'Customer ID is required for this request.' });
      }
      const custExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(effectiveCustId);
      if (!custExists) {
        return res.status(404).json({ success: false, message: 'Specified customer does not exist.' });
      }

      // Mandatory positive amount
      const amt = parseFloat(proposed_amount !== undefined ? proposed_amount : (parsedData.principal || parsedData.principal_amount || parsedData.monthlyInstallment || parsedData.monthly_installment || parsedData.depositAmount || parsedData.deposit_amount || parsedData.openingBalance));
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: 'A valid positive amount (> 0) is required.' });
      }

      // Validate tenure if applicable
      if (parsedData.tenureMonths !== undefined || parsedData.tenure_months !== undefined) {
        const tenure = parseInt(parsedData.tenureMonths !== undefined ? parsedData.tenureMonths : parsedData.tenure_months);
        if (isNaN(tenure) || tenure <= 0) {
          return res.status(400).json({ success: false, message: 'Tenure months must be an integer greater than 0.' });
        }
      }

      // Validate interest rate if applicable
      if (parsedData.annualRate !== undefined || parsedData.annual_rate !== undefined) {
        const rate = parseFloat(parsedData.annualRate !== undefined ? parsedData.annualRate : parsedData.annual_rate);
        if (isNaN(rate) || rate <= 0 || rate > 100) {
          return res.status(400).json({ success: false, message: 'Annual interest rate must be between 0.1% and 100%.' });
        }
      }

      // Duplicate submission guard (60 second throttle on identical pending request)
      const existingPending = db.prepare(`
        SELECT id, request_number FROM approval_requests
        WHERE customer_id = ? AND request_type = ? AND status = 'PENDING_APPROVAL'
          AND created_at >= datetime('now', '-60 seconds')
      `).get(effectiveCustId, request_type);
      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: `Duplicate submission blocked: Request ${existingPending.request_number} for this customer is already pending approval.`
        });
      }
    }

    const reqNumber = `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const insert = db.prepare(`
      INSERT INTO approval_requests (
        request_number, request_type, maker_id, customer_id, fd_id, proposed_amount, request_data, status, decision_remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
    `).run(
      reqNumber,
      request_type,
      req.user.id,
      effectiveCustId || null,
      fd_id || null,
      proposed_amount || 0,
      JSON.stringify(request_data),
      remarks || 'Submitted for Admin verification'
    );

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, 'SUBMIT_FOR_APPROVAL', 'APPROVAL_REQUEST', reqNumber, `Maker submitted ${request_type} for ₹${proposed_amount || 0}`);
    } catch(e){}

    res.json({
      success: true,
      message: `Request ${reqNumber} submitted successfully. Awaiting Admin Checker verification.`,
      requestId: insert.lastInsertRowid,
      request_number: reqNumber
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/approvals/:id/approve - Checker / Admin approval
router.post('/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const reqId = req.params.id;
  const { decision_remarks } = req.body;

  try {
    const request = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(reqId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Approval request not found.' });
    }

    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ 
        success: false, 
        message: `Request is already in status '${request.status}' and cannot be approved again.` 
      });
    }

    const payload = JSON.parse(request.request_data);
    let executionResult = null;

    // Use transaction to ensure complete atomicity
    const executeApproval = db.transaction(() => {
      // 3.1 NEW FD APPROVAL
      if (request.request_type === 'NEW_FD') {
        const customerId = payload.customerId || payload.customer_id || request.customer_id;
        const principal = parseFloat(payload.principal || payload.principal_amount) || 0;
        const annualRate = parseFloat(payload.annualRate || payload.annual_rate) || 0;
        const tenureMonths = parseInt(payload.tenureMonths || payload.tenure_months) || 12;
        const tenureDays = parseInt(payload.tenureDays || payload.tenure_days) || 0;
        const compoundingFrequency = payload.compoundingFrequency || payload.compounding_frequency || 'quarterly';
        const isCumulative = payload.isCumulative !== undefined ? payload.isCumulative : (payload.is_cumulative !== undefined ? payload.is_cumulative : true);
        const startDate = payload.startDate || payload.start_date || new Date().toISOString().split('T')[0];
        const prematurePenaltyRate = parseFloat(payload.prematurePenaltyRate || payload.premature_penalty_rate) || 1.0;
        const fdRemarks = payload.remarks || payload.fdRemarks;
        const paymentMode = payload.paymentMode || payload.payment_mode || 'BANK_TRANSFER';
        const paymentReference = payload.paymentReference || payload.payment_reference || `TXN-NEFT-${Date.now().toString().slice(-6)}`;

        // Verify customer
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer does not exist');

        // Calculate FD math
        const calc = calculateFD({
          principal,
          annualRate,
          tenureMonths,
          tenureDays,
          compoundingFrequency,
          isCumulative,
          startDate,
          isSeniorCitizen: customer.is_senior_citizen === 1
        });

        const lastFd = db.prepare('SELECT id FROM fixed_deposits ORDER BY id DESC LIMIT 1').get();
        const nextNum = (lastFd ? lastFd.id + 1 : 1);
        const fdNumber = `FD-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

        // Create Active FD
        const fdResult = db.prepare(`
          INSERT INTO fixed_deposits (
            fd_number, customer_id, principal_amount, annual_rate, tenure_months, tenure_days,
            compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
            start_date, maturity_date, status, premature_penalty_rate, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        `).run(
          fdNumber,
          customerId,
          principal,
          calc.annualRate || annualRate,
          tenureMonths,
          tenureDays,
          compoundingFrequency,
          calc.isCumulative ? 1 : 0,
          calc.periodicPayout,
          calc.totalInterest,
          calc.maturityAmount,
          startDate,
          calc.maturityDate,
          prematurePenaltyRate,
          fdRemarks || `Approved via ${request.request_number}`
        );

        const newFdId = fdResult.lastInsertRowid;

        // Insert schedules
        const insertSched = db.prepare(`
          INSERT INTO fd_schedules (
            fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `);

        for (const s of calc.schedule) {
          insertSched.run(newFdId, s.periodNo, s.payoutDate, s.payoutAmount, s.interestAccrued, s.cumulativeInterest, s.balance);
        }

        // Insert balanced transaction in ledger
        try {
          const txNumber = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'FD_BOOKING', ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(txNumber, newFdId, customerId, principal, startDate, paymentMode, paymentReference, `FD Booking Approved (${request.request_number})`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'DEBIT', principal, 'Deposit funds received in bank');
          insertEntry.run(txInsert.lastInsertRowid, 'FD_PRINCIPAL_LIABILITY', 'CREDIT', principal, 'FD principal liability created');
        } catch(e){}

        executionResult = { fdNumber, newFdId, maturityAmount: calc.maturityAmount };
      }

      // 3.2 INTEREST PAYOUT APPROVAL
      else if (request.request_type === 'INTEREST_PAYOUT') {
        const scheduleId = payload.scheduleId || payload.schedule_id;
        const paymentReference = payload.paymentReference || payload.payment_reference || `NEFT-${Date.now().toString().slice(-6)}`;
        const schedule = db.prepare('SELECT * FROM fd_schedules WHERE id = ?').get(scheduleId);
        if (!schedule) throw new Error('Schedule not found');

        const now = new Date().toISOString().split('T')[0];
        db.prepare(`
          UPDATE fd_schedules 
          SET status = 'PAID', paid_date = ?, payment_reference = ?
          WHERE id = ?
        `).run(now, paymentReference, scheduleId);

        // Balanced ledger entry
        try {
          const txNumber = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'INTEREST_PAYOUT', ?, ?, ?, ?, 'BANK_TRANSFER', ?, ?, ?)
          `).run(txNumber, schedule.fd_id, request.customer_id, schedule.payout_amount, now, paymentReference, `Interest Payout Approved (${request.request_number})`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'INTEREST_EXPENSE', 'DEBIT', schedule.payout_amount, 'Interest expense recognized');
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'CREDIT', schedule.payout_amount, 'Disbursed via bank transfer');
        } catch(e){}

        executionResult = { scheduleId, paidAmount: schedule.payout_amount };
      }

      // 3.3 PREMATURE CLOSURE APPROVAL
      else if (request.request_type === 'PREMATURE_CLOSURE') {
        const fdId = payload.fdId || payload.fd_id;
        const closeDate = payload.closeDate || payload.close_date || new Date().toISOString().split('T')[0];
        const penaltyRate = payload.penaltyRate !== undefined ? payload.penaltyRate : payload.penalty_rate;
        const closeRemarks = payload.remarks || payload.closeRemarks;

        const fd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(fdId);
        if (!fd) throw new Error('FD not found');

        const paidInterest = db.prepare(`
          SELECT COALESCE(SUM(payout_amount), 0) as paid 
          FROM fd_schedules 
          WHERE fd_id = ? AND status = 'PAID'
        `).get(fdId).paid;

        const premCalc = calculatePrematureWithdrawal({
          principal: fd.principal_amount,
          annualRate: fd.annual_rate,
          startDate: fd.start_date,
          withdrawalDate: closeDate,
          penaltyRate: penaltyRate !== undefined ? penaltyRate : fd.premature_penalty_rate,
          alreadyPaidInterest: paidInterest
        });

        db.prepare(`
          UPDATE fixed_deposits
          SET status = 'CLOSED_PREMATURE',
              closed_date = ?,
              premature_interest_paid = ?,
              remarks = ?
          WHERE id = ?
        `).run(closeDate, premCalc.eligibleInterest, closeRemarks || `Closed prematurely via ${request.request_number}`, fdId);

        // Cancel pending schedules
        db.prepare(`
          UPDATE fd_schedules 
          SET status = 'CANCELLED' 
          WHERE fd_id = ? AND status = 'PENDING'
        `).run(fdId);

        // Balanced double-entry ledger entry for premature closure
        try {
          const txNumber = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'PREMATURE_CLOSURE', ?, ?, ?, ?, 'BANK_TRANSFER', ?, ?, ?)
          `).run(txNumber, fdId, fd.customer_id, premCalc.netPayable, closeDate, `PREM-UTR-${Date.now().toString().slice(-6)}`, `Premature Closure Approved (${request.request_number})`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'FD_PRINCIPAL_LIABILITY', 'DEBIT', fd.principal_amount, 'Discharge principal liability');
          insertEntry.run(txInsert.lastInsertRowid, 'INTEREST_EXPENSE', 'DEBIT', premCalc.eligibleInterest, 'Eligible interest expense recognized');
          const penaltyAmount = Math.max(0, (fd.principal_amount + premCalc.eligibleInterest) - premCalc.netPayable);
          if (penaltyAmount > 0) {
            insertEntry.run(txInsert.lastInsertRowid, 'PENALTY_INCOME', 'CREDIT', penaltyAmount, 'Premature penalty income assessed');
          }
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'CREDIT', premCalc.netPayable, 'Net settlement disbursed to bank');
        } catch(e){}

        executionResult = { fdId, netPayable: premCalc.netPayable };
      }

      // 3.4 MATURITY_SETTLEMENT APPROVAL
      else if (request.request_type === 'MATURITY_SETTLEMENT') {
        const fdId = payload.fdId || payload.fd_id;
        const settlementDate = payload.settlementDate || payload.settlement_date || new Date().toISOString().split('T')[0];
        const paymentReference = payload.paymentReference || payload.payment_reference || `SETTLE-NEFT-${Date.now().toString().slice(-6)}`;

        const fd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(fdId);
        if (!fd) throw new Error('FD not found');

        const now = settlementDate;
        db.prepare(`
          UPDATE fixed_deposits 
          SET status = 'MATURED', closed_date = ?, remarks = ?
          WHERE id = ?
        `).run(now, `Matured & Settled via ${request.request_number}`, fdId);

        // Mark remaining schedules as PAID
        db.prepare(`
          UPDATE fd_schedules 
          SET status = 'PAID', paid_date = ?, payment_reference = ?
          WHERE fd_id = ? AND status = 'PENDING'
        `).run(now, paymentReference, fdId);

        // Balanced double-entry transaction
        try {
          const txNumber = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'MATURITY_PAYOUT', ?, ?, ?, ?, 'BANK_TRANSFER', ?, ?, ?)
          `).run(txNumber, fdId, fd.customer_id, fd.maturity_amount, now, paymentReference, `Maturity Settlement Approved (${request.request_number})`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          const unpaidInterest = Math.max(0, fd.maturity_amount - fd.principal_amount);
          insertEntry.run(txInsert.lastInsertRowid, 'FD_PRINCIPAL_LIABILITY', 'DEBIT', fd.principal_amount, 'Discharge principal liability');
          if (unpaidInterest > 0) {
            insertEntry.run(txInsert.lastInsertRowid, 'INTEREST_EXPENSE', 'DEBIT', unpaidInterest, 'Maturity interest yield settled');
          }
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'CREDIT', fd.maturity_amount, 'Maturity payout disbursed to bank');
        } catch(e){}

        executionResult = { fdId, settlementAmount: fd.maturity_amount };
      }

      // 3.5 RENEWAL APPROVAL
      else if (request.request_type === 'RENEWAL') {
        const fdId = payload.fdId || payload.fd_id;
        const renewType = payload.renewType || payload.renew_type || 'PRINCIPAL_PLUS_INTEREST';
        const newRate = parseFloat(payload.newRate || payload.new_rate) || 8.5;
        const newTenureMonths = parseInt(payload.newTenureMonths || payload.new_tenure_months) || 12;
        const compoundingFrequency = payload.compoundingFrequency || payload.compounding_frequency || 'quarterly';

        const oldFd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(fdId);
        if (!oldFd) throw new Error('Original FD not found');

        const renewalPrincipal = (renewType === 'PRINCIPAL_PLUS_INTEREST') ? oldFd.maturity_amount : oldFd.principal_amount;
        const now = new Date().toISOString().split('T')[0];

        // Mark old FD as RENEWED
        db.prepare("UPDATE fixed_deposits SET status = 'RENEWED', closed_date = ? WHERE id = ?").run(now, fdId);

        // Calculate new FD math
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(oldFd.customer_id);
        const calc = calculateFD({
          principal: renewalPrincipal,
          annualRate: newRate,
          tenureMonths: newTenureMonths,
          compoundingFrequency,
          startDate: now,
          isSeniorCitizen: customer.is_senior_citizen === 1
        });

        const lastFd = db.prepare('SELECT id FROM fixed_deposits ORDER BY id DESC LIMIT 1').get();
        const nextNum = (lastFd ? lastFd.id + 1 : 1);
        const newFdNumber = `FD-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

        const newFdInsert = db.prepare(`
          INSERT INTO fixed_deposits (
            fd_number, customer_id, principal_amount, annual_rate, tenure_months, tenure_days,
            compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
            start_date, maturity_date, status, premature_penalty_rate, remarks
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1.0, ?)
        `).run(
          newFdNumber,
          oldFd.customer_id,
          renewalPrincipal,
          calc.annualRate || newRate,
          newTenureMonths,
          compoundingFrequency,
          calc.isCumulative ? 1 : 0,
          calc.periodicPayout,
          calc.totalInterest,
          calc.maturityAmount,
          now,
          calc.maturityDate,
          `Rolled over from ${oldFd.fd_number} via ${request.request_number}`
        );

        const newFdId = newFdInsert.lastInsertRowid;

        // Insert new schedules
        const insertSched = db.prepare(`
          INSERT INTO fd_schedules (
            fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `);

        for (const s of calc.schedule) {
          insertSched.run(newFdId, s.periodNo, s.payoutDate, s.payoutAmount, s.interestAccrued, s.cumulativeInterest, s.balance);
        }

        // Balanced ledger entries for Rollover
        try {
          const txNumber = `TXN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'RENEWAL', ?, ?, ?, ?, 'INTERNAL_TRANSFER', ?, ?, ?)
          `).run(txNumber, newFdId, oldFd.customer_id, renewalPrincipal, now, `ROLLOVER-${oldFd.fd_number}`, `FD Renewal Approved (${request.request_number})`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'FD_PRINCIPAL_LIABILITY', 'DEBIT', oldFd.principal_amount, `Discharge old liability ${oldFd.fd_number}`);
          if (renewType === 'PRINCIPAL_PLUS_INTEREST') {
            const rolledInterest = Math.max(0, renewalPrincipal - oldFd.principal_amount);
            if (rolledInterest > 0) {
              insertEntry.run(txInsert.lastInsertRowid, 'INTEREST_EXPENSE', 'DEBIT', rolledInterest, 'Reinvested interest capitalization');
            }
          }
          insertEntry.run(txInsert.lastInsertRowid, 'FD_PRINCIPAL_LIABILITY', 'CREDIT', renewalPrincipal, `Establish new liability ${newFdNumber}`);
        } catch(e){}

        executionResult = { oldFdId: fdId, newFdNumber, newFdId, renewalPrincipal };
      }

      // 3.6 CUSTOMER_KYC APPROVAL
      else if (request.request_type === 'CUSTOMER_KYC') {
        const customerId = payload.customerId || payload.customer_id;
        const remarks = payload.remarks || 'KYC Verified by Admin';

        db.prepare(`
          UPDATE customers 
          SET status = 'ACTIVE'
          WHERE id = ?
        `).run(customerId);

        executionResult = { customerId, kycStatus: 'VERIFIED' };
      }

      // 3.7 NEW RECURRING DEPOSIT (RD) APPROVAL
      else if (request.request_type === 'NEW_RD') {
        const customerId = payload.customerId || payload.customer_id;
        const monthlyInstallment = parseFloat(payload.monthlyInstallment || payload.monthly_installment) || 0;
        const annualRate = parseFloat(payload.annualRate || payload.annual_rate) || 0;
        const tenureMonths = parseInt(payload.tenureMonths || payload.tenure_months) || 12;
        const startDate = payload.startDate || payload.start_date || new Date().toISOString().split('T')[0];
        const remarks = payload.remarks || `Approved via ${request.request_number}`;

        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer does not exist');

        const { calculateRD } = require('../calculator');
        const calc = calculateRD({
          installmentAmount: monthlyInstallment,
          annualRate,
          tenureMonths,
          startDate,
          isSeniorCitizen: customer.is_senior_citizen === 1
        });

        const lastRd = db.prepare('SELECT id FROM recurring_deposits ORDER BY id DESC LIMIT 1').get();
        const nextRdNum = (lastRd ? lastRd.id + 1 : 1);
        const rdNumber = `RD-${new Date().getFullYear()}-${String(nextRdNum).padStart(4, '0')}`;

        const insRd = db.prepare(`
          INSERT INTO recurring_deposits (
            rd_number, customer_id, branch_id, monthly_installment, annual_rate,
            tenure_months, start_date, maturity_date, total_principal, total_interest,
            maturity_amount, installments_paid, amount_deposited, status, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ACTIVE', ?)
        `).run(
          rdNumber, customerId, customer.branch_id || null, monthlyInstallment,
          calc.annualRate, tenureMonths, calc.startDate, calc.maturityDate,
          calc.totalPrincipal, calc.totalInterest, calc.maturityAmount, remarks
        );

        const rdId = insRd.lastInsertRowid;
        const instInsert = db.prepare(`
          INSERT INTO rd_installments (
            rd_id, installment_no, due_date, installment_amount, status
          ) VALUES (?, ?, ?, ?, 'PENDING')
        `);

        calc.schedule.forEach(s => {
          instInsert.run(rdId, s.installmentNo, s.dueDate, s.installmentAmount);
        });

        executionResult = { rdId, rdNumber, maturityAmount: calc.maturityAmount };
      }

      // 3.8 RD INSTALLMENT COLLECTION APPROVAL
      else if (request.request_type === 'RD_INSTALLMENT') {
        const rdId = payload.rdId || payload.rd_id;
        const installmentId = payload.installmentId || payload.installment_id;
        const paymentMode = payload.paymentMode || 'CASH';
        const transactionRef = payload.transactionRef || `COLL-RD-${Date.now().toString().slice(-6)}`;
        const lateFee = parseFloat(payload.lateFee || 0);

        const inst = db.prepare('SELECT * FROM rd_installments WHERE id = ? AND rd_id = ?').get(installmentId, rdId);
        if (!inst) throw new Error('Installment not found');

        const totalAmount = inst.installment_amount + lateFee;
        const today = new Date().toISOString().split('T')[0];
        const effectivePaidDate = payload.paid_date || payload.collection_date || today;

        db.prepare(`
          UPDATE rd_installments
          SET status = 'COLLECTED', paid_date = ?, late_fee = ?, total_collected = ?,
              payment_mode = ?, transaction_ref = ?, collector_user_id = ?
          WHERE id = ?
        `).run(effectivePaidDate, lateFee, totalAmount, paymentMode, transactionRef, req.user.id, installmentId);

        db.prepare(`
          UPDATE recurring_deposits
          SET installments_paid = installments_paid + 1,
              amount_deposited = amount_deposited + ?,
              total_late_fees = total_late_fees + ?
          WHERE id = ?
        `).run(inst.installment_amount, lateFee, rdId);

        // Double-entry balanced ledger
        try {
          const txNumber = `TXN-RD-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'RD_COLLECTION', NULL, (SELECT customer_id FROM recurring_deposits WHERE id = ?), ?, ?, ?, ?, 'RD Installment Collected', ?)
          `).run(txNumber, rdId, totalAmount, today, paymentMode, transactionRef, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, paymentMode === 'CASH' ? 'CASH_VAULT' : 'BANK_ACCOUNT', 'DEBIT', totalAmount, 'RD installment collected');
          insertEntry.run(txInsert.lastInsertRowid, 'RD_PRINCIPAL_LIABILITY', 'CREDIT', inst.installment_amount, 'RD principal deposited');
          if (lateFee > 0) {
            insertEntry.run(txInsert.lastInsertRowid, 'RD_LATE_FEE_INCOME', 'CREDIT', lateFee, 'Late fine collected');
          }
        } catch(e){}

        executionResult = { rdId, installmentId, totalCollected: totalAmount };
      }

      // 3.9 NEW MONTHLY INCOME SCHEME (MIS) APPROVAL
      else if (request.request_type === 'NEW_MIS') {
        const customerId = payload.customerId || payload.customer_id;
        const depositAmount = parseFloat(payload.depositAmount || payload.deposit_amount) || 0;
        const annualRate = parseFloat(payload.annualRate || payload.annual_rate) || 0;
        const tenureMonths = parseInt(payload.tenureMonths || payload.tenure_months) || 60;
        const startDate = payload.startDate || payload.start_date || new Date().toISOString().split('T')[0];
        const payoutAccountNo = payload.payoutAccountNo || payload.payout_account_no;
        const payoutBankIfsc = payload.payoutBankIfsc || payload.payout_bank_ifsc;
        const remarks = payload.remarks || `Approved via ${request.request_number}`;

        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer does not exist');

        const { calculateMIS } = require('../calculator');
        const calc = calculateMIS({
          depositAmount,
          annualRate,
          tenureMonths,
          startDate,
          isSeniorCitizen: customer.is_senior_citizen === 1
        });

        const lastMis = db.prepare('SELECT id FROM mis_accounts ORDER BY id DESC LIMIT 1').get();
        const nextMisNum = (lastMis ? lastMis.id + 1 : 1);
        const misNumber = `MIS-${new Date().getFullYear()}-${String(nextMisNum).padStart(4, '0')}`;

        const insMis = db.prepare(`
          INSERT INTO mis_accounts (
            mis_number, customer_id, branch_id, deposit_amount, annual_rate,
            tenure_months, monthly_payout, total_payout_amount, start_date,
            maturity_date, payout_account_no, payout_bank_ifsc, status, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        `).run(
          misNumber, customerId, customer.branch_id || null, depositAmount,
          calc.annualRate, tenureMonths, calc.monthlyPayout, calc.totalPayoutAmount,
          calc.startDate, calc.maturityDate, payoutAccountNo || customer.account_no,
          payoutBankIfsc || customer.ifsc_code, remarks
        );

        const misId = insMis.lastInsertRowid;
        const schedInsert = db.prepare(`
          INSERT INTO mis_payout_schedules (
            mis_id, month_no, payout_date, payout_amount, tds_deducted,
            net_payable, status
          ) VALUES (?, ?, ?, ?, 0, ?, 'PENDING')
        `);

        calc.schedule.forEach(s => {
          schedInsert.run(misId, s.monthNo, s.payoutDate, s.payoutAmount, s.netPayable);
        });

        // Balanced ledger
        try {
          const txNumber = `TXN-MIS-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'MIS_BOOKING', NULL, ?, ?, ?, 'BANK_TRANSFER', ?, 'MIS Capital Inflow', ?)
          `).run(txNumber, customerId, depositAmount, startDate, `DEP-MIS-${misNumber}`, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'DEBIT', depositAmount, 'MIS deposit received in bank');
          insertEntry.run(txInsert.lastInsertRowid, 'MIS_PRINCIPAL_LIABILITY', 'CREDIT', depositAmount, 'MIS principal liability created');
        } catch(e){}

        executionResult = { misId, misNumber, monthlyPayout: calc.monthlyPayout };
      }

      // 3.10 MIS MONTHLY PAYOUT APPROVAL
      else if (request.request_type === 'MIS_PAYOUT') {
        const misId = payload.misId || payload.mis_id;
        const scheduleId = payload.scheduleId || payload.schedule_id;
        const paymentReference = payload.paymentReference || `NEFT-MIS-${Date.now().toString().slice(-6)}`;

        const sched = db.prepare('SELECT * FROM mis_payout_schedules WHERE id = ? AND mis_id = ?').get(scheduleId, misId);
        if (!sched) throw new Error('MIS schedule not found');

        const today = payload.paidDate || payload.paid_date || new Date().toISOString().split('T')[0];
        db.prepare(`
          UPDATE mis_payout_schedules
          SET status = 'PAID', paid_date = ?, payment_reference = ?
          WHERE id = ?
        `).run(today, paymentReference, scheduleId);

        // Balanced ledger
        try {
          const txNumber = `TXN-MISPAY-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'MIS_PAYOUT', NULL, (SELECT customer_id FROM mis_accounts WHERE id = ?), ?, ?, 'BANK_TRANSFER', ?, 'MIS Monthly Payout', ?)
          `).run(txNumber, misId, sched.net_payable, today, paymentReference, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'MIS_INTEREST_EXPENSE', 'DEBIT', sched.net_payable, 'MIS interest expense recognized');
          insertEntry.run(txInsert.lastInsertRowid, 'BANK_ACCOUNT', 'CREDIT', sched.net_payable, 'Monthly interest payout disbursed via bank');
        } catch(e){}

        executionResult = { misId, scheduleId, amountPaid: sched.net_payable };
      }

      // 3.11 NEW SAVINGS ACCOUNT APPROVAL
      else if (request.request_type === 'NEW_SAVINGS_ACCOUNT') {
        const customerId = payload.customerId || payload.customer_id;
        const openingBalance = parseFloat(payload.openingBalance || 1000);
        const minimumBalance = parseFloat(payload.minimumBalance || 1000);
        const annualInterestRate = parseFloat(payload.annualInterestRate || 4.0);
        const nomineeName = payload.nomineeName;
        const nomineeRelation = payload.nomineeRelation;

        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) throw new Error('Customer does not exist');

        const lastSb = db.prepare('SELECT id FROM savings_accounts ORDER BY id DESC LIMIT 1').get();
        const nextSbNum = (lastSb ? lastSb.id + 1 : 1);
        const accountNumber = `SB-${new Date().getFullYear()}-${String(1000 + nextSbNum)}`;
        const today = new Date().toISOString().split('T')[0];

        const insAccount = db.prepare(`
          INSERT INTO savings_accounts (
            account_number, customer_id, branch_id, current_balance,
            minimum_balance, annual_interest_rate, status, opened_date,
            nominee_name, nominee_relation
          ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
        `).run(
          accountNumber, customerId, customer.branch_id || null, openingBalance,
          minimumBalance, annualInterestRate, today,
          nomineeName || customer.nominee_name, nomineeRelation || customer.nominee_relation
        );

        const accountId = insAccount.lastInsertRowid;

        if (openingBalance > 0) {
          const txnNumber = `TXN-SB-${Date.now().toString().slice(-6)}`;
          db.prepare(`
            INSERT INTO savings_transactions (
              account_id, transaction_number, transaction_type, amount,
              balance_after, payment_mode, reference_number, narration, performed_by_user_id
            ) VALUES (?, ?, 'DEPOSIT', ?, ?, 'CASH', 'OPENING-DEP', 'Initial Account Opening Deposit', ?)
          `).run(accountId, txnNumber, openingBalance, openingBalance, req.user.id);

          // Balanced Ledger
          try {
            const txNumber = `TXN-SB-LEDG-${Date.now().toString().slice(-6)}`;
            const txInsert = db.prepare(`
              INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
              VALUES (?, 'SAVINGS_OPENING_DEPOSIT', NULL, ?, ?, ?, 'CASH', ?, 'Savings Opening Deposit', ?)
            `).run(txNumber, customerId, openingBalance, today, txnNumber, req.user.id);

            const insertEntry = db.prepare(`
              INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
              VALUES (?, ?, ?, ?, ?)
            `);
            insertEntry.run(txInsert.lastInsertRowid, 'CASH_VAULT', 'DEBIT', openingBalance, 'Cash received for savings opening');
            insertEntry.run(txInsert.lastInsertRowid, 'SAVINGS_DEPOSIT_LIABILITY', 'CREDIT', openingBalance, 'Customer savings balance liability');
          } catch(e){}
        }

        executionResult = { accountId, accountNumber, openingBalance };
      }

      // 3.12 SAVINGS DEPOSIT APPROVAL
      else if (request.request_type === 'SAVINGS_DEPOSIT') {
        const accountId = payload.accountId || payload.account_id;
        const amount = parseFloat(payload.amount);
        const paymentMode = payload.paymentMode || 'CASH';
        const referenceNumber = payload.referenceNumber || `DEP-${Date.now().toString().slice(-6)}`;
        const narration = payload.narration || 'Deposit';

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(accountId);
        if (!account) throw new Error('Savings account not found');

        const newBalance = account.current_balance + amount;
        const txnNumber = `TXN-DEP-${Date.now().toString().slice(-6)}`;

        db.prepare('UPDATE savings_accounts SET current_balance = ? WHERE id = ?').run(newBalance, accountId);

        db.prepare(`
          INSERT INTO savings_transactions (
            account_id, transaction_number, transaction_type, amount,
            balance_after, payment_mode, reference_number, narration, performed_by_user_id
          ) VALUES (?, ?, 'DEPOSIT', ?, ?, ?, ?, ?, ?)
        `).run(accountId, txnNumber, amount, newBalance, paymentMode, referenceNumber, narration, req.user.id);

        // Balanced ledger
        try {
          const txNumber = `TXN-SBLDG-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'SAVINGS_DEPOSIT', NULL, ?, ?, ?, ?, ?, 'Savings Deposit Approved', ?)
          `).run(txNumber, account.customer_id, amount, new Date().toISOString().split('T')[0], paymentMode, referenceNumber, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, paymentMode === 'CASH' ? 'CASH_VAULT' : 'BANK_ACCOUNT', 'DEBIT', amount, 'Deposit funds received');
          insertEntry.run(txInsert.lastInsertRowid, 'SAVINGS_DEPOSIT_LIABILITY', 'CREDIT', amount, 'Customer savings liability increased');
        } catch(e){}

        executionResult = { accountId, newBalance, amountDeposited: amount };
      }

      // 3.13 SAVINGS WITHDRAWAL APPROVAL
      else if (request.request_type === 'SAVINGS_WITHDRAWAL') {
        const accountId = payload.accountId || payload.account_id;
        const amount = parseFloat(payload.amount);
        const paymentMode = payload.paymentMode || 'CASH';
        const referenceNumber = payload.referenceNumber || `WDR-${Date.now().toString().slice(-6)}`;
        const narration = payload.narration || 'Withdrawal';

        const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(accountId);
        if (!account) throw new Error('Savings account not found');

        if ((account.current_balance - amount) < account.minimum_balance) {
          throw new Error(`Insufficient funds. Minimum balance of ₹${account.minimum_balance} required.`);
        }

        const newBalance = account.current_balance - amount;
        const txnNumber = `TXN-WDR-${Date.now().toString().slice(-6)}`;

        db.prepare('UPDATE savings_accounts SET current_balance = ? WHERE id = ?').run(newBalance, accountId);

        db.prepare(`
          INSERT INTO savings_transactions (
            account_id, transaction_number, transaction_type, amount,
            balance_after, payment_mode, reference_number, narration, performed_by_user_id
          ) VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?, ?)
        `).run(accountId, txnNumber, amount, newBalance, paymentMode, referenceNumber, narration, req.user.id);

        // Balanced ledger
        try {
          const txNumber = `TXN-SBLDG-${Date.now().toString().slice(-6)}`;
          const txInsert = db.prepare(`
            INSERT INTO transactions (transaction_number, transaction_type, fd_id, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
            VALUES (?, 'SAVINGS_WITHDRAWAL', NULL, ?, ?, ?, ?, ?, 'Savings Withdrawal Approved', ?)
          `).run(txNumber, account.customer_id, amount, new Date().toISOString().split('T')[0], paymentMode, referenceNumber, req.user.id);

          const insertEntry = db.prepare(`
            INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
            VALUES (?, ?, ?, ?, ?)
          `);
          insertEntry.run(txInsert.lastInsertRowid, 'SAVINGS_DEPOSIT_LIABILITY', 'DEBIT', amount, 'Customer savings liability discharged');
          insertEntry.run(txInsert.lastInsertRowid, paymentMode === 'CASH' ? 'CASH_VAULT' : 'BANK_ACCOUNT', 'CREDIT', amount, 'Funds disbursed to customer');
        } catch(e){}

        executionResult = { accountId, newBalance, amountWithdrawn: amount };
      }

      // 3.X PROFILE / NAME CORRECTION APPROVAL (Requested from Mobile App or Maker)
      if (request.request_type === 'PROFILE_CORRECTION') {
        const customerId = request.customer_id || payload.customer_id;
        const field = payload.field;
        const newValue = payload.new_value;
        const validFields = [
          'full_name', 'phone', 'father_name', 'nominee_name', 
          'nominee_relation', 'address', 'email', 'pan_card', 
          'bank_name', 'account_no', 'ifsc_code'
        ];

        if (!validFields.includes(field)) {
          throw new Error(`Invalid correction field: ${field}`);
        }

        db.prepare(`UPDATE customers SET ${field} = ? WHERE id = ?`).run(newValue, customerId);

        // Keep users table in sync if phone or full_name changed
        if (field === 'phone') {
          try {
            db.prepare(`UPDATE users SET phone = ? WHERE customer_id = ?`).run(newValue, customerId);
          } catch(e) {}
        }
        if (field === 'full_name') {
          try {
            db.prepare(`UPDATE users SET full_name = ? WHERE customer_id = ?`).run(newValue, customerId);
          } catch(e) {}
        }

        executionResult = {
          customerId,
          field,
          newValue,
          message: `Customer ${payload.field_label || field} updated to "${newValue}" successfully`
        };
      }

      // 3.Y CUSTOMER_EDIT APPROVAL (Staff Maker Profile Updates)
      if (request.request_type === 'CUSTOMER_EDIT') {
        const customerId = payload.customerId || request.customer_id;
        const updates = payload.proposedValues || {};

        const stmt = db.prepare(`
          UPDATE customers SET
            full_name = COALESCE(?, full_name),
            father_name = COALESCE(?, father_name),
            branch = COALESCE(?, branch),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            pan_card = COALESCE(?, pan_card),
            aadhaar_no = COALESCE(?, aadhaar_no),
            address = COALESCE(?, address),
            bank_name = COALESCE(?, bank_name),
            account_no = COALESCE(?, account_no),
            ifsc_code = COALESCE(?, ifsc_code),
            nominee_name = COALESCE(?, nominee_name),
            nominee_relation = COALESCE(?, nominee_relation),
            is_senior_citizen = COALESCE(?, is_senior_citizen),
            status = COALESCE(?, status)
          WHERE id = ?
        `);

        stmt.run(
          updates.full_name, updates.father_name, updates.branch, updates.phone, updates.email,
          updates.pan_card ? updates.pan_card.toUpperCase() : null,
          updates.aadhaar_no, updates.address, updates.bank_name, updates.account_no,
          updates.ifsc_code ? updates.ifsc_code.toUpperCase() : null,
          updates.nominee_name, updates.nominee_relation,
          updates.is_senior_citizen !== undefined ? (updates.is_senior_citizen ? 1 : 0) : null,
          updates.status || null,
          customerId
        );

        if (updates.phone) {
          try { db.prepare(`UPDATE users SET phone = ? WHERE customer_id = ?`).run(updates.phone, customerId); } catch(e){}
        }
        if (updates.full_name) {
          try { db.prepare(`UPDATE users SET full_name = ? WHERE customer_id = ?`).run(updates.full_name, customerId); } catch(e){}
        }

        executionResult = {
          customerId,
          message: `Customer profile updated successfully upon Super Admin approval.`
        };
      }

      // Mark Request as APPROVED
      db.prepare(`
        UPDATE approval_requests 
        SET status = 'APPROVED',
            checker_id = ?,
            decision_remarks = ?,
            decision_notes = ?,
            decision_date = CURRENT_TIMESTAMP,
            decided_at = CURRENT_TIMESTAMP,
            actioned_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.id, decision_remarks || 'Approved by Administrator', decision_remarks || 'Approved by Administrator', reqId);

      // Audit Log for Approval
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'APPROVE_REQUEST', 'APPROVAL_REQUEST', ?, ?)
        `).run(req.user.id, request.request_number, `Checker approved ${request.request_type} for proposed amount ₹${request.proposed_amount || 0}. Remarks: ${decision_remarks || 'Approved'}`);
      } catch(e){}
    });

    executeApproval();

    res.json({
      success: true,
      message: `Approval Request ${request.request_number} has been APPROVED and executed.`,
      result: executionResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/approvals/:id/reject - Checker / Admin rejection
router.post('/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  const reqId = req.params.id;
  const { reason } = req.body;

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
  }

  try {
    const request = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(reqId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Approval request not found.' });
    }

    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ 
        success: false, 
        message: `Request is already in status '${request.status}' and cannot be rejected.` 
      });
    }

    db.prepare(`
      UPDATE approval_requests 
      SET status = 'REJECTED',
          checker_id = ?,
          decision_remarks = ?,
          decision_notes = ?,
          decision_date = CURRENT_TIMESTAMP,
          decided_at = CURRENT_TIMESTAMP,
          actioned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, reason, reason, reqId);

    // Audit Log for Rejection
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'REJECT_REQUEST', 'APPROVAL_REQUEST', ?, ?)
      `).run(req.user.id, request.request_number, `Checker rejected ${request.request_type}. Reason: ${reason}`);
    } catch(e){}

    res.json({
      success: true,
      message: `Approval Request ${request.request_number} has been REJECTED with note.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
