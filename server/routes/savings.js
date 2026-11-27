const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// GET /api/savings - List Savings Accounts
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, search, customer_id } = req.query;
    let query = `
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone, c.customer_code
      FROM savings_accounts s
      JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND s.status = ?`;
      params.push(status);
    }
    if (customer_id) {
      query += ` AND s.customer_id = ?`;
      params.push(customer_id);
    }
    if (search) {
      query += ` AND (s.account_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY s.id DESC`;
    const accounts = db.prepare(query).all(...params);
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/savings/:id - Details of single savings account with passbook statement
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const account = db.prepare(`
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             c.pan_card as customer_pan, c.customer_code, c.address as customer_address,
             c.bank_name, c.account_no, c.ifsc_code
      FROM savings_accounts s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Savings account not found' });
    }

    const transactions = db.prepare(`
      SELECT * FROM savings_transactions
      WHERE account_id = ?
      ORDER BY id DESC
    `).all(req.params.id);

    res.json({
      success: true,
      account,
      transactions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/savings - Open New Savings Account (requires savings_creation)
router.post('/', authenticateToken, requirePermission('savings_creation'), (req, res) => {
  try {
    const {
      customer_id,
      opening_balance = 1000.00,
      minimum_balance = 1000.00,
      annual_interest_rate = 4.00,
      nominee_name,
      nominee_relation,
      remarks
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required' });
    }

    const minBal = parseFloat(minimum_balance) || 1000.00;
    const openBal = parseFloat(opening_balance);
    if (openBal < minBal) {
      return res.status(400).json({ success: false, message: `Opening balance (₹${openBal}) cannot be less than minimum balance requirement of ₹${minBal}` });
    }
    if (openBal < 0 || minBal < 0) {
      return res.status(400).json({ success: false, message: 'Balance amounts must be non-negative' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const isEmployee = req.user.role === 'employee';

    if (isEmployee) {
      const reqNumber = `REQ-SB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'NEW_SAVINGS_ACCOUNT', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        customer_id,
        parseFloat(opening_balance),
        JSON.stringify({
          customerId: customer_id,
          openingBalance: parseFloat(opening_balance),
          minimumBalance: parseFloat(minimum_balance),
          annualInterestRate: parseFloat(annual_interest_rate),
          nomineeName: nominee_name || customer.nominee_name,
          nomineeRelation: nominee_relation || customer.nominee_relation,
          remarks: remarks || 'Savings Account opening proposed by staff'
        }),
        remarks || 'New Savings Account awaiting Checker authorization'
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'Savings Account opening proposed. Pending Admin authorization.'
      });
    }

    // Direct Admin Execution (atomic transaction)
    const createSbTx = db.transaction(() => {
      const nextSeq = (db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM savings_accounts').get()?.nextId) || 1;
      const accountNumber = `SB-${new Date().getFullYear()}-${String(1000 + nextSeq)}`;
      const today = new Date().toISOString().split('T')[0];

      const insAccount = db.prepare(`
        INSERT INTO savings_accounts (
          account_number, customer_id, branch_id, current_balance,
          minimum_balance, annual_interest_rate, status, opened_date,
          nominee_name, nominee_relation
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
      `).run(
        accountNumber, customer_id, customer.branch_id || null, openBal,
        minBal, parseFloat(annual_interest_rate) || 4.0, today,
        nominee_name || customer.nominee_name, nominee_relation || customer.nominee_relation
      );

      const accountId = insAccount.lastInsertRowid;

      if (openBal > 0) {
        const txnNumber = `TXN-SB-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}-${accountId}`;
        db.prepare(`
          INSERT INTO savings_transactions (
            account_id, transaction_number, transaction_type, amount,
            balance_after, payment_mode, reference_number, narration, performed_by_user_id
          ) VALUES (?, ?, 'DEPOSIT', ?, ?, 'CASH', 'INIT-DEP', 'Initial Account Opening Deposit', ?)
        `).run(accountId, txnNumber, openBal, openBal, req.user.id);
      }

      return { accountId, accountNumber };
    });

    const { accountId, accountNumber } = createSbTx();

    res.status(201).json({
      success: true,
      accountId,
      accountNumber,
      message: 'Savings account opened successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/savings/:id/deposit - Deposit Cash or Transfer into Savings Account (requires savings_deposit)
router.post('/:id/deposit', authenticateToken, requirePermission('savings_deposit'), (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode = 'CASH', reference_number, narration } = req.body;

    const depAmount = parseFloat(amount);
    if (!depAmount || depAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Account is not active' });
    }

    const isEmployee = req.user.role === 'employee';

    if (isEmployee) {
      const reqNumber = `REQ-SBDEP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'SAVINGS_DEPOSIT', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        account.customer_id,
        depAmount,
        JSON.stringify({
          accountId: parseInt(id),
          accountNumber: account.account_number,
          amount: depAmount,
          paymentMode: payment_mode,
          referenceNumber: reference_number || `DEP-${Date.now()}`,
          narration: narration || 'Cash/Transfer Deposit'
        }),
        `Savings Deposit of ₹${depAmount} proposed for A/c ${account.account_number}`
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'Savings deposit voucher submitted for Admin approval.'
      });
    }

    // Direct Admin Execution (atomic)
    const newBalance = db.transaction(() => {
      const nextBal = account.current_balance + depAmount;
      const txnNumber = `TXN-DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      db.prepare('UPDATE savings_accounts SET current_balance = ? WHERE id = ?').run(nextBal, id);

      db.prepare(`
        INSERT INTO savings_transactions (
          account_id, transaction_number, transaction_type, amount,
          balance_after, payment_mode, reference_number, narration, performed_by_user_id
        ) VALUES (?, ?, 'DEPOSIT', ?, ?, ?, ?, ?, ?)
      `).run(id, txnNumber, depAmount, nextBal, payment_mode, reference_number || 'DEP-CASH', narration || 'Deposit', req.user.id);

      return nextBal;
    })();

    res.json({
      success: true,
      message: 'Deposit executed successfully',
      newBalance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/savings/:id/withdraw - Withdraw from Savings Account (requires savings_withdrawal)
router.post('/:id/withdraw', authenticateToken, requirePermission('savings_withdrawal'), (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode = 'CASH', reference_number, narration } = req.body;

    const withAmount = parseFloat(amount);
    if (!withAmount || withAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Account is not active' });
    }

    // Check balance & overdraft protection
    if ((account.current_balance - withAmount) < account.minimum_balance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Minimum balance of ₹${account.minimum_balance} must be maintained. Current balance: ₹${account.current_balance}`
      });
    }

    const isEmployee = req.user.role === 'employee';

    if (isEmployee) {
      const reqNumber = `REQ-SBWDR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'SAVINGS_WITHDRAWAL', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        account.customer_id,
        withAmount,
        JSON.stringify({
          accountId: parseInt(id),
          accountNumber: account.account_number,
          amount: withAmount,
          paymentMode: payment_mode,
          referenceNumber: reference_number || `WDR-${Date.now()}`,
          narration: narration || 'Cash/Cheque Withdrawal'
        }),
        `Savings Withdrawal of ₹${withAmount} proposed for A/c ${account.account_number}`
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'Savings withdrawal voucher submitted for Admin approval.'
      });
    }

    // Direct Admin Execution (atomic)
    const newBalance = db.transaction(() => {
      const nextBal = account.current_balance - withAmount;
      const txnNumber = `TXN-WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      db.prepare('UPDATE savings_accounts SET current_balance = ? WHERE id = ?').run(nextBal, id);

      db.prepare(`
        INSERT INTO savings_transactions (
          account_id, transaction_number, transaction_type, amount,
          balance_after, payment_mode, reference_number, narration, performed_by_user_id
        ) VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?, ?)
      `).run(id, txnNumber, withAmount, nextBal, payment_mode, reference_number || 'WDR-CASH', narration || 'Withdrawal', req.user.id);

      return nextBal;
    })();

    res.json({
      success: true,
      message: 'Withdrawal executed successfully',
      newBalance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/savings/:id/close - Close Savings Account
router.post('/:id/close', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const account = db.prepare('SELECT * FROM savings_accounts WHERE id = ?').get(id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Only active accounts can be closed' });
    }

    const today = new Date().toISOString().split('T')[0];

    db.transaction(() => {
      if (account.current_balance > 0) {
        const txnNumber = `TXN-CLS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        db.prepare(`
          INSERT INTO savings_transactions (
            account_id, transaction_number, transaction_type, amount,
            balance_after, payment_mode, reference_number, narration, performed_by_user_id
          ) VALUES (?, ?, 'WITHDRAWAL', ?, 0, 'CASH', 'ACCOUNT-CLOSURE', 'Final closure settlement', ?)
        `).run(id, txnNumber, account.current_balance, req.user.id);
      }

      db.prepare(`
        UPDATE savings_accounts
        SET status = 'CLOSED',
            current_balance = 0,
            closed_date = ?
        WHERE id = ?
      `).run(today, id);
    })();

    res.json({ success: true, message: 'Savings account closed and settled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
