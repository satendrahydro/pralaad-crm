const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/loans/against-deposit - List LAD loans
router.get('/against-deposit', authenticateToken, (req, res) => {
  try {
    const { status, search } = req.query;
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
      tenure_months = 36
    } = req.body;

    if (!customer_id || !collateral_fd_number || !sanctioned_amount) {
      return res.status(400).json({ success: false, message: 'Customer, Collateral FD, and Loan Amount are required' });
    }

    const customer = db.prepare('SELECT full_name, phone FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Loan-to-Value (LTV) max 85% validation
    const maxAllowed = fd_deposit_amount * 0.85;
    if (sanctioned_amount > maxAllowed) {
      return res.status(400).json({ 
        success: false, 
        message: `Sanction amount exceeds maximum allowable 85% LTV limit (Max: ₹${maxAllowed.toLocaleString('en-IN')})` 
      });
    }

    const count = db.prepare('SELECT count(*) as count FROM loans_against_deposit').get().count;
    const loan_number = `LAD-2026-${String(count + 1).padStart(3, '0')}`;

    // Standard reducing balance monthly EMI calculation
    const monthlyRate = (interest_rate / 12) / 100;
    const emi = (sanctioned_amount * monthlyRate * Math.pow(1 + monthlyRate, tenure_months)) / (Math.pow(1 + monthlyRate, tenure_months) - 1);

    const today = new Date().toISOString().split('T')[0];
    const matDate = new Date();
    matDate.setMonth(matDate.getMonth() + parseInt(tenure_months));
    const maturity_date = matDate.toISOString().split('T')[0];

    const info = db.prepare(`
      INSERT INTO loans_against_deposit (
        loan_number, customer_id, customer_name, customer_phone, collateral_type,
        collateral_fd_number, fd_deposit_amount, sanctioned_amount, disbursed_amount,
        interest_rate, tenure_months, emi_amount, disbursal_date, maturity_date,
        outstanding_principal, total_recovered, status
      ) VALUES (?, ?, ?, ?, 'FD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE')
    `).run(
      loan_number,
      customer_id,
      customer.full_name,
      customer.phone,
      collateral_fd_number,
      parseFloat(fd_deposit_amount),
      parseFloat(sanctioned_amount),
      parseFloat(sanctioned_amount),
      parseFloat(interest_rate),
      parseInt(tenure_months),
      Math.round(emi),
      today,
      maturity_date,
      parseFloat(sanctioned_amount)
    );

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

module.exports = router;
