const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/loans/against-deposit - List LAD loans
router.get('/against-deposit', authenticateToken, (req, res) => {
  try {
    const { status, search, collateral_type } = req.query;
    let query = `
      SELECT 
        l.*,
        c.full_name as customer_name,
        c.phone as customer_phone,
        c.customer_code
      FROM loans_against_deposit l
      JOIN customers c ON l.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (collateral_type && collateral_type !== 'ALL') {
      if (collateral_type === 'MORTGAGE' || collateral_type === 'PROPERTY') {
        query += ` AND l.collateral_type IN ('MORTGAGE', 'PROPERTY')`;
      } else if (collateral_type === 'DEPOSIT' || collateral_type === 'FD') {
        query += ` AND (l.collateral_type = 'FD' OR l.collateral_type = 'DEPOSIT' OR l.collateral_type IS NULL)`;
      } else {
        query += ` AND l.collateral_type = ?`;
        params.push(collateral_type);
      }
    }

    if (status && status !== 'ALL') {
      query += ` AND l.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (l.loan_number LIKE ? OR c.full_name LIKE ? OR l.collateral_fd_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY l.id ASC`;

    const loans = db.prepare(query).all(...params);
    const totalSanctioned = loans.reduce((acc, l) => acc + (l.sanctioned_amount || 0), 0);
    const totalOutstanding = loans.reduce((acc, l) => acc + (l.outstanding_principal || 0), 0);
    const totalRecovered = loans.reduce((acc, l) => acc + (l.total_recovered || 0), 0);

    res.json({
      success: true,
      loans,
      total_loans: loans.length,
      total_sanctioned: totalSanctioned,
      total_outstanding: totalOutstanding,
      total_recovered: totalRecovered
    });
  } catch (err) {
    console.error('Error fetching LAD loans:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch loans', error: err.message });
  }
});

// POST /api/loans/against-deposit - Sanction new LAD loan
router.post('/against-deposit', authenticateToken, (req, res) => {
  try {
    const {
      customer_id,
      collateral_fd_number,
      fd_deposit_amount,
      sanctioned_amount,
      interest_rate = 14.0,
      tenure_months = 36,
      collateral_type = 'FD'
    } = req.body;

    if (!customer_id || !collateral_fd_number || !sanctioned_amount) {
      return res.status(400).json({ success: false, message: 'Customer, Collateral details, and Loan Amount are required' });
    }

    const customer = db.prepare('SELECT full_name, phone FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Loan-to-Value (LTV) validation based on collateral type
    const ltvRatio = (collateral_type === 'MORTGAGE' || collateral_type === 'PROPERTY') ? 0.70 
      : collateral_type === 'BUSINESS' ? 0.60 
      : 0.85;
    const maxAllowed = Math.round(fd_deposit_amount * ltvRatio);
    if (sanctioned_amount > maxAllowed) {
      return res.status(400).json({ 
        success: false, 
        message: `Sanction amount exceeds maximum allowable ${(ltvRatio * 100).toFixed(0)}% LTV limit (Max: ₹${maxAllowed.toLocaleString('en-IN')})` 
      });
    }

    const count = db.prepare('SELECT count(*) as count FROM loans_against_deposit').get().count;
    const prefix = (collateral_type === 'MORTGAGE' || collateral_type === 'PROPERTY') ? 'LAP'
      : collateral_type === 'BUSINESS' ? 'BL'
      : 'LAD';
    const loan_number = `${prefix}-2026-${String(count + 1).padStart(3, '0')}`;

    // Standard reducing balance monthly EMI calculation
    const monthlyRate = (interest_rate / 12) / 100;
    const emi = (sanctioned_amount * monthlyRate * Math.pow(1 + monthlyRate, tenure_months)) / (Math.pow(1 + monthlyRate, tenure_months) - 1);

    const today = new Date().toISOString().split('T')[0];
    const effectiveDisbursalDate = req.body.disbursal_date || today;
    const matDate = new Date(effectiveDisbursalDate);
    matDate.setMonth(matDate.getMonth() + parseInt(tenure_months));
    const maturity_date = req.body.maturity_date || matDate.toISOString().split('T')[0];

    const info = db.prepare(`
      INSERT INTO loans_against_deposit (
        loan_number, customer_id, customer_name, customer_phone, collateral_type,
        collateral_fd_number, fd_deposit_amount, sanctioned_amount, disbursed_amount,
        interest_rate, tenure_months, emi_amount, disbursal_date, maturity_date,
        outstanding_principal, total_recovered, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE')
    `).run(
      loan_number,
      customer_id,
      customer.full_name,
      customer.phone,
      collateral_type,
      collateral_fd_number,
      parseFloat(fd_deposit_amount),
      parseFloat(sanctioned_amount),
      parseFloat(sanctioned_amount),
      parseFloat(interest_rate),
      parseInt(tenure_months),
      Math.round(emi),
      effectiveDisbursalDate,
      maturity_date,
      parseFloat(sanctioned_amount)
    );

    // Auto-record OUTFLOW (जावक) in Day Book for loan disbursement
    try {
      const dateCompact = effectiveDisbursalDate.replace(/-/g, '');
      const countOut = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = 'OUTFLOW'").get(effectiveDisbursalDate)?.count || 0;
      const voucher_no = `OUT-${dateCompact}-${String(countOut + 1).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'OUTFLOW', ?, 'LOAN_DISBURSEMENT', 'Loan Disbursed', ?, ?, ?, ?, ?, 1)
      `).run(
        voucher_no,
        effectiveDisbursalDate,
        parseFloat(sanctioned_amount),
        req.body.payment_mode || 'CASH',
        `${customer.full_name} (${loan_number})`,
        loan_number,
        `${collateral_type || 'LAD'} loan disbursed against ${collateral_fd_number}`
      );
    } catch (e) {
      console.error('Day Book sync error on LAD loan disbursement:', e.message);
    }

    res.json({
      success: true,
      message: `Loan Against Deposit '${loan_number}' sanctioned successfully against ${collateral_fd_number}`,
      loanId: info.lastInsertRowid,
      loan_number,
      emi_amount: Math.round(emi)
    });
  } catch (err) {
    console.error('Error sanctioning LAD loan:', err);
    res.status(500).json({ success: false, message: 'Failed to sanction loan', error: err.message });
  }
});

// POST /api/loans/against-deposit/repay - Record Repayment for LAD / Property / Business Loan
router.post('/against-deposit/repay', authenticateToken, (req, res) => {
  try {
    const { loan_id, amount, payment_mode = 'CASH', payment_date, reference_no, narration } = req.body;
    if (!loan_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid loan ID and repayment amount are required.' });
    }

    const loan = db.prepare('SELECT * FROM loans_against_deposit WHERE id = ?').get(loan_id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const numAmount = parseFloat(amount);
    const newRecovered = (loan.total_recovered || 0) + numAmount;
    const newOutstanding = Math.max(0, (loan.outstanding_principal || 0) - numAmount);
    const newStatus = newOutstanding <= 0 ? 'REPAID_CLOSED' : 'ACTIVE';

    db.prepare(`
      UPDATE loans_against_deposit
      SET total_recovered = ?, outstanding_principal = ?, status = ?
      WHERE id = ?
    `).run(newRecovered, newOutstanding, newStatus, loan_id);

    // Auto-record INFLOW (आवक) in Day Book
    const today = new Date().toISOString().split('T')[0];
    const effectiveDate = payment_date || today;
    const dateCompact = effectiveDate.replace(/-/g, '');
    try {
      const countIn = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = 'INFLOW'").get(effectiveDate)?.count || 0;
      const voucher_no = `IN-${dateCompact}-${String(countIn + 1).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'INFLOW', ?, 'LOAN_RECOVERY', 'Loan EMI / Principal Recovery', ?, ?, ?, ?, ?, 1)
      `).run(
        voucher_no,
        effectiveDate,
        numAmount,
        payment_mode,
        `${loan.customer_name} (${loan.loan_number})`,
        reference_no || loan.loan_number,
        narration || `Loan repayment received for ${loan.loan_number}`
      );
    } catch(e) {
      console.error('Day Book sync error on loan recovery:', e.message);
    }

    res.json({
      success: true,
      message: `₹${numAmount.toLocaleString('en-IN')} recovered successfully against Loan ${loan.loan_number}. Outstanding: ₹${newOutstanding.toLocaleString('en-IN')}`,
      loan_number: loan.loan_number,
      outstanding_principal: newOutstanding,
      status: newStatus
    });
  } catch (err) {
    console.error('Error processing loan repayment:', err);
    res.status(500).json({ success: false, message: 'Failed to process repayment', error: err.message });
  }
});

// ========================================================
// 3. GOLD LOANS (गोल्ड लोन - स्वर्ण आभूषण सुरक्षित ऋण)
// ========================================================

// GET /api/loans/gold-loans - List all Gold Loans
router.get('/gold-loans', authenticateToken, (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `SELECT * FROM gold_loans WHERE 1=1`;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (loan_number LIKE ? OR customer_name LIKE ? OR pouch_number LIKE ? OR locker_location LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY id DESC`;
    const loans = db.prepare(query).all(...params);

    const totalSanctioned = loans.reduce((acc, l) => acc + (l.sanctioned_amount || 0), 0);
    const totalOutstanding = loans.reduce((acc, l) => acc + (l.outstanding_principal || 0), 0);
    const totalRecovered = loans.reduce((acc, l) => acc + (l.total_recovered || 0), 0);
    const totalGoldWeight = loans.reduce((acc, l) => acc + (l.net_weight_grams || 0), 0);
    const totalValuation = loans.reduce((acc, l) => acc + (l.total_gold_valuation || 0), 0);

    res.json({
      success: true,
      loans,
      kpis: {
        total_loans: loans.length,
        total_sanctioned: totalSanctioned,
        total_outstanding: totalOutstanding,
        total_recovered: totalRecovered,
        total_gold_weight_grams: totalGoldWeight,
        total_valuation: totalValuation
      }
    });
  } catch (err) {
    console.error('Error fetching gold loans:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch gold loans', error: err.message });
  }
});

// POST /api/loans/gold-loans - Sanction new Gold Loan
router.post('/gold-loans', authenticateToken, (req, res) => {
  try {
    const {
      customer_id,
      gold_items_detail,
      gross_weight_grams,
      net_weight_grams,
      purity_karat = 22,
      valuation_rate_per_gram = 6800.0,
      sanctioned_amount,
      interest_rate = 15.0,
      tenure_months = 12,
      locker_location = 'Vault Locker A-1',
      pouch_number,
      disbursement_mode = 'CASH' // 'CASH' or 'BANK_ONLINE'
    } = req.body;

    if (!customer_id || !gold_items_detail || !sanctioned_amount || !net_weight_grams) {
      return res.status(400).json({ success: false, message: 'Customer, Gold details, Net Weight and Loan Amount are required' });
    }

    const customer = db.prepare('SELECT full_name, phone FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const netWeight = parseFloat(net_weight_grams);
    const ratePerGram = parseFloat(valuation_rate_per_gram);
    const totalValuation = netWeight * ratePerGram;
    const maxSanctionAllowed = totalValuation * 0.75; // RBI standard 75% max LTV
    const numSanction = parseFloat(sanctioned_amount);

    if (numSanction > maxSanctionAllowed) {
      return res.status(400).json({ 
        success: false, 
        message: `Sanction exceeds 75% LTV limit of ₹${maxSanctionAllowed.toLocaleString('en-IN', { maximumFractionDigits: 0 })} based on gold valuation ₹${totalValuation.toLocaleString('en-IN')}` 
      });
    }

    const count = db.prepare('SELECT count(*) as count FROM gold_loans').get().count;
    const loan_number = `GL-2026-${String(count + 1).padStart(3, '0')}`;
    const pouch = pouch_number || `POUCH-${loan_number}`;

    const monthlyInterest = (numSanction * (parseFloat(interest_rate) / 100)) / 12;

    const today = new Date().toISOString().split('T')[0];
    const effectiveDisbursalDate = req.body.disbursal_date || today;
    const matDate = new Date(effectiveDisbursalDate);
    matDate.setMonth(matDate.getMonth() + parseInt(tenure_months));
    const maturity_date = req.body.maturity_date || matDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO gold_loans (
        loan_number, customer_id, customer_name, customer_phone, gold_items_detail,
        pouch_number, locker_location, gross_weight_grams, net_weight_grams, purity_karat,
        valuation_rate_per_gram, total_gold_valuation, ltv_percentage, sanctioned_amount,
        disbursed_amount, interest_rate, tenure_months, monthly_interest, outstanding_principal,
        total_recovered, status, disbursal_date, maturity_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?)
    `);

    const result = stmt.run(
      loan_number,
      customer_id,
      customer.full_name,
      customer.phone,
      gold_items_detail,
      pouch,
      locker_location,
      parseFloat(gross_weight_grams || net_weight_grams),
      netWeight,
      parseInt(purity_karat),
      ratePerGram,
      totalValuation,
      75.0,
      numSanction,
      numSanction,
      parseFloat(interest_rate),
      parseInt(tenure_months),
      monthlyInterest,
      numSanction,
      effectiveDisbursalDate,
      maturity_date
    );

    // Auto-record OUTFLOW (जावक) in Day Book for loan cash disbursement
    try {
      const dateCompact = effectiveDisbursalDate.replace(/-/g, '');
      const countOut = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = 'OUTFLOW'").get(effectiveDisbursalDate)?.count || 0;
      const voucher_no = `OUT-${dateCompact}-${String(countOut + 1).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'OUTFLOW', ?, 'GOLD_LOAN_DISBURSEMENT', 'Gold Loan Cash Disbursement', ?, ?, ?, ?, ?, 1)
      `).run(
        voucher_no,
        effectiveDisbursalDate,
        numSanction,
        disbursement_mode,
        `${customer.full_name} (${loan_number})`,
        loan_number,
        `Gold loan disbursed against ${netWeight}g 22K gold ornament collateral`
      );
    } catch(e) {
      console.error('Day Book sync error on gold loan disbursement:', e.message);
    }

    res.json({
      success: true,
      message: `Gold Loan '${loan_number}' sanctioned successfully against ${netWeight}g gold ornaments. Disbursed via ${disbursement_mode}.`,
      loanId: result.lastInsertRowid,
      loan_number,
      sanctioned_amount: numSanction,
      pouch_number: pouch,
      total_valuation: totalValuation
    });
  } catch (err) {
    console.error('Error sanctioning gold loan:', err);
    res.status(500).json({ success: false, message: 'Failed to sanction gold loan', error: err.message });
  }
});

// POST /api/loans/gold-loans/repay - Record Gold Loan Repayment / Recovery
router.post('/gold-loans/repay', authenticateToken, (req, res) => {
  try {
    const { loan_id, amount, payment_mode = 'CASH', payment_date, reference_no, narration } = req.body;
    if (!loan_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid loan ID and repayment amount are required.' });
    }

    const loan = db.prepare('SELECT * FROM gold_loans WHERE id = ?').get(loan_id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Gold loan not found.' });
    }

    const numAmount = parseFloat(amount);
    const newRecovered = (loan.total_recovered || 0) + numAmount;
    const newOutstanding = Math.max(0, (loan.outstanding_principal || 0) - numAmount);
    const newStatus = newOutstanding <= 0 ? 'REPAID_RELEASED' : 'ACTIVE';

    db.prepare(`
      UPDATE gold_loans 
      SET total_recovered = ?, outstanding_principal = ?, status = ?
      WHERE id = ?
    `).run(newRecovered, newOutstanding, newStatus, loan_id);

    // Auto-record INFLOW (आवक) in Day Book for loan recovery
    const today = new Date().toISOString().split('T')[0];
    const effectiveDate = payment_date || today;
    const dateCompact = effectiveDate.replace(/-/g, '');
    try {
      const countIn = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = 'INFLOW'").get(effectiveDate)?.count || 0;
      const voucher_no = `IN-${dateCompact}-${String(countIn + 1).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'INFLOW', ?, 'GOLD_LOAN_RECOVERY', 'Gold Loan EMI / Principal Recovery', ?, ?, ?, ?, ?, 1)
      `).run(
        voucher_no,
        effectiveDate,
        numAmount,
        payment_mode,
        `${loan.customer_name} (${loan.loan_number})`,
        reference_no || loan.loan_number,
        narration || `Gold loan recovery received from borrower ${loan.customer_name}`
      );
    } catch(e) {
      console.error('Day Book sync error on gold loan recovery:', e.message);
    }

    res.json({
      success: true,
      message: `₹${numAmount.toLocaleString('en-IN')} recovered successfully against Gold Loan ${loan.loan_number}. Remaining balance: ₹${newOutstanding.toLocaleString('en-IN')}`,
      loan_number: loan.loan_number,
      outstanding_principal: newOutstanding,
      status: newStatus
    });
  } catch (err) {
    console.error('Error recovering gold loan:', err);
    res.status(500).json({ success: false, message: 'Failed to process repayment', error: err.message });
  }
});

// ========================================================
// 4. UDHAR & BORROWINGS (उधार खाता - हाथ उधारी व लेन-देन)
// ========================================================

// GET /api/loans/udhar - List all Borrowings / Udhar
router.get('/udhar', authenticateToken, (req, res) => {
  try {
    const udhars = db.prepare('SELECT * FROM borrowings_udhar ORDER BY id DESC').all();
    const totalBorrowed = udhars.reduce((acc, u) => acc + (u.amount || 0), 0);
    const totalRepaid = udhars.reduce((acc, u) => acc + (u.amount_repaid || 0), 0);
    const totalOutstanding = udhars.reduce((acc, u) => acc + (u.outstanding_balance || 0), 0);

    res.json({
      success: true,
      udhars,
      kpis: {
        total_borrowed: totalBorrowed,
        total_repaid: totalRepaid,
        total_outstanding: totalOutstanding,
        active_lenders: udhars.filter(u => u.status === 'ACTIVE').length
      }
    });
  } catch (err) {
    console.error('Error fetching udhar borrowings:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch borrowings', error: err.message });
  }
});

// POST /api/loans/udhar - Add new Borrowing (उधार लिया - Input/Inflow)
router.post('/udhar', authenticateToken, (req, res) => {
  try {
    const { lender_name, phone = '', amount, interest_rate = 0, payment_mode = 'CASH', due_date, narration } = req.body;
    if (!lender_name || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Lender name and valid amount are required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const numAmount = parseFloat(amount);
    const count = db.prepare('SELECT count(*) as count FROM borrowings_udhar').get().count;
    const voucher_no = `UDHAR-2026-${String(count + 1).padStart(3, '0')}`;

    db.prepare(`
      INSERT INTO borrowings_udhar (
        voucher_no, lender_name, phone, borrowing_date, amount, interest_rate,
        payment_mode, due_date, amount_repaid, outstanding_balance, status, narration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE', ?)
    `).run(
      voucher_no,
      lender_name,
      phone,
      today,
      numAmount,
      parseFloat(interest_rate || 0),
      payment_mode,
      due_date || null,
      numAmount,
      narration || `Hand loan / cash borrowed from ${lender_name}`
    );

    // Auto-record INFLOW (आवक) in Day Book for borrowed money!
    try {
      const dateCompact = today.replace(/-/g, '');
      const countIn = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = 'INFLOW'").get(today)?.count || 0;
      const dayVoucher = `IN-${dateCompact}-${String(countIn + 1).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'INFLOW', ?, 'BORROWING_INFLOW', 'उधार लिया (Money Borrowed / Udhar Inflow)', ?, ?, ?, ?, ?, 1)
      `).run(
        dayVoucher,
        today,
        numAmount,
        payment_mode,
        lender_name,
        voucher_no,
        narration || `Hand loan / cash borrowed from ${lender_name}`
      );
    } catch(e) {
      console.error('Day Book sync error on udhar inflow:', e.message);
    }

    res.json({
      success: true,
      message: `उधार वाउचर '${voucher_no}' सफलतापूर्वक दर्ज किया गया (₹${numAmount.toLocaleString('en-IN')} ${payment_mode === 'CASH' ? 'गल्ले में जमा' : 'बैंक में जमा'})।`,
      voucher_no,
      amount: numAmount
    });
  } catch (err) {
    console.error('Error adding udhar borrowing:', err);
    res.status(500).json({ success: false, message: 'Failed to record borrowing', error: err.message });
  }
});

// POST /api/loans/udhar/repay - Record Repayment for Borrowing (उधार लौटाया - Output/Outflow)
router.post('/udhar/repay', authenticateToken, (req, res) => {
  try {
    const { udhar_id, amount, payment_mode = 'CASH', payment_date, reference_no, narration } = req.body;
    if (!udhar_id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid borrowing ID and repayment amount are required.' });
    }

    const row = db.prepare('SELECT * FROM borrowings_udhar WHERE id = ?').get(udhar_id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Borrowing record not found.' });
    }

    const numAmt = parseFloat(amount);
    const newRepaid = (row.amount_repaid || 0) + numAmt;
    const newOutstanding = Math.max(0, (row.outstanding_balance || 0) - numAmt);
    const newStatus = newOutstanding <= 0 ? 'FULLY_REPAID' : 'PARTIALLY_REPAID';

    db.prepare(`
      UPDATE borrowings_udhar
      SET amount_repaid = ?, outstanding_balance = ?, status = ?
      WHERE id = ?
    `).run(newRepaid, newOutstanding, newStatus, udhar_id);

    const today = new Date().toISOString().split('T')[0];
    const effectiveDate = payment_date || today;
    try {
      const voucherNo = `OUT-${effectiveDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name,
          amount, payment_mode, party_name, reference_no, narration, branch_code, created_by_user_id
        ) VALUES (?, 'OUTFLOW', ?, 'BORROWING_REPAYMENT', 'उधार लौटाया (Borrowing Repaid / Outflow)', ?, ?, ?, ?, ?, 'BHR001', 1)
      `).run(
        voucherNo,
        effectiveDate,
        numAmt,
        payment_mode,
        `${row.lender_name} (${row.voucher_no})`,
        reference_no || row.voucher_no,
        narration || `Repayment against borrowing ${row.voucher_no}`
      );
    } catch (e) {}

    res.json({
      success: true,
      message: `₹${numAmt.toLocaleString('en-IN')} उधार वापसी दर्ज की गई (${row.voucher_no})। शेष देय: ₹${newOutstanding.toLocaleString('en-IN')}`,
      outstanding_balance: newOutstanding,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
