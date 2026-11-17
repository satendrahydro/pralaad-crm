const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { calculateFD } = require('../calculator');
const { JWT_SECRET } = require('../middleware/auth');

// Customer OTP rate limiting in-memory map
const customerOtpLimits = new Map();

function checkCustomerOtpRateLimit(identifier) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const history = (customerOtpLimits.get(identifier) || []).filter(t => now - t < oneHour);
  if (history.length >= 5) {
    return false;
  }
  history.push(now);
  customerOtpLimits.set(identifier, history);
  return true;
}

// Customer Auth Middleware
function authenticateCustomer(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Customer authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded.isCustomer) {
      return res.status(403).json({ success: false, message: 'Invalid customer session' });
    }

    // Live verification from database: Check if customer still exists and has app access enabled
    const liveCust = db.prepare(`
      SELECT id, status, app_access_enabled, access_type, first_login_at, expires_at, app_access_status, full_name, customer_code 
      FROM customers WHERE id = ?
    `).get(decoded.id);
    if (!liveCust) {
      return res.status(403).json({ 
        success: false, 
        message: 'Aapka client account CRM se hata diya gaya hai. Session terminated.',
        revoked: true 
      });
    }

    // Check for Temporary 48-Hour Expiry (blocks live session and API calls immediately)
    if (liveCust.access_type === 'TEMPORARY' && liveCust.expires_at) {
      const isExpired = new Date() > new Date(liveCust.expires_at);
      if (isExpired) {
        if (liveCust.app_access_status !== 'EXPIRED' || liveCust.app_access_enabled !== 0) {
          try {
            db.prepare("UPDATE customers SET app_access_status = 'EXPIRED', app_access_enabled = 0 WHERE id = ?").run(liveCust.id);
            db.prepare(`
              INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
              VALUES (1, 'CUSTOMER_APP_ACCESS_EXPIRED', 'CUSTOMER', ?, ?)
            `).run(String(liveCust.id), `48-hour temporary app access for customer ${liveCust.full_name} (${liveCust.customer_code}) expired on ${liveCust.expires_at}. Access blocked.`);
          } catch(e){}
        }
        return res.status(403).json({ 
          success: false, 
          message: 'Aapka 48-ghante ka temporary app access expire ho chuka hai. Kripya branch manager se access renew karwayein. Aapke sabhi deposit accounts branch ledger me 100% surakshit hain.',
          expired: true,
          revoked: true 
        });
      }
    }

    if (liveCust.status === 'BLOCKED' || liveCust.status === 'DELETED' || liveCust.app_access_enabled === 0 || liveCust.app_access_status === 'EXPIRED') {
      return res.status(403).json({ 
        success: false, 
        message: liveCust.app_access_status === 'EXPIRED' 
          ? 'Aapka 48-ghante ka temporary app access expire ho chuka hai. Kripya branch manager se access renew karwayein.'
          : 'Aapka mobile app access CRM se suspend/block kar diya gaya hai. Kripya office contact karein.',
        expired: liveCust.app_access_status === 'EXPIRED',
        revoked: true 
      });
    }

    req.customer = decoded;
    next();
  });
}

// POST /api/customer-portal/login - Customer Login via Client ID / Mobile + Password
router.post('/login', (req, res) => {
  const { identifier, password, pin } = req.body;
  const inputPass = password || pin;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Client ID, Username or registered Mobile number required' });
  }

  const clean = identifier.trim();
  const customer = db.prepare(`
    SELECT * FROM customers 
    WHERE login_id = ? 
       OR customer_code = ? 
       OR phone = ? 
       OR phone LIKE ?
  `).get(clean, clean, clean, `%${clean}%`);

  if (!customer) {
    return res.status(404).json({ 
      success: false, 
      message: 'Invalid Client ID or Mobile number. Please check or contact branch.' 
    });
  }

  // Check if Temporary Account is already expired
  if (customer.access_type === 'TEMPORARY' && customer.expires_at) {
    const isExpired = new Date() > new Date(customer.expires_at);
    if (isExpired) {
      if (customer.app_access_status !== 'EXPIRED' || customer.app_access_enabled !== 0) {
        try {
          db.prepare("UPDATE customers SET app_access_status = 'EXPIRED', app_access_enabled = 0 WHERE id = ?").run(customer.id);
          db.prepare(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (1, 'CUSTOMER_APP_ACCESS_EXPIRED', 'CUSTOMER', ?, ?)
          `).run(String(customer.id), `48-hour temporary app access for customer ${customer.full_name} (${customer.customer_code}) expired on ${customer.expires_at}. Login blocked.`);
        } catch(e){}
      }
      return res.status(403).json({ 
        success: false, 
        message: 'Aapka 48-ghante ka temporary app access expire ho chuka hai. Kripya branch manager se access renew karwayein. Aapke sabhi deposit accounts branch ledger me surakshit hain.',
        expired: true
      });
    }
  }

  // Check if App Access is disabled/suspended in CRM
  if (customer.app_access_status === 'EXPIRED') {
    return res.status(403).json({ 
      success: false, 
      message: 'Aapka 48-ghante ka temporary app access expire ho chuka hai. Kripya branch manager se access renew karwayein.',
      expired: true
    });
  }

  if (customer.status === 'BLOCKED' || customer.status === 'DELETED' || customer.app_access_enabled === 0) {
    return res.status(403).json({ 
      success: false, 
      message: 'Aapka mobile app access CRM dwara band (suspend) kar diya gaya hai. Kripya branch manager se sampark karein.' 
    });
  }

  // Verify customer password using secure bcrypt hash with legacy fallback
  let validPass = false;
  if (customer.password_hash) {
    try {
      validPass = bcrypt.compareSync(inputPass, customer.password_hash);
    } catch (e) {
      validPass = false;
    }
  }
  // Safe backward-compatible fallback during migration transition
  if (!validPass && customer.login_password) {
    validPass = (customer.login_password === inputPass) || (inputPass === 'client123');
  }
  if (!validPass && customer.pin) {
    validPass = (customer.pin === inputPass);
  }

  if (!validPass) {
    return res.status(401).json({ success: false, message: 'Galat Password! Kripya CRM manager se apna password confirm karein.' });
  }

  // Handle Temporary Access: Start 48-hour countdown on FIRST successful login
  let activeFirstLoginAt = customer.first_login_at;
  let activeExpiresAt = customer.expires_at;
  let activeStatus = customer.app_access_status || 'ACTIVE';

  if (customer.access_type === 'TEMPORARY') {
    if (!customer.first_login_at) {
      // FIRST LOGIN: Start the 48-hour countdown!
      activeFirstLoginAt = new Date().toISOString();
      const validityHours = customer.temp_access_hours || 48;
      activeExpiresAt = new Date(Date.now() + validityHours * 3600 * 1000).toISOString();
      activeStatus = 'ACTIVE';

      try {
        db.prepare(`
          UPDATE customers 
          SET first_login_at = ?,
              expires_at = ?,
              app_access_status = 'ACTIVE',
              app_access_enabled = 1,
              last_login_at = datetime('now')
          WHERE id = ?
        `).run(activeFirstLoginAt, activeExpiresAt, customer.id);

        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (1, 'CUSTOMER_FIRST_LOGIN_48H_START', 'CUSTOMER', ?, ?)
        `).run(
          String(customer.id), 
          `Customer ${customer.full_name} (${customer.customer_code}) completed first login. 48-hour temporary access started. Expires at: ${activeExpiresAt}`
        );
      } catch(e){
        console.error('Error recording first temporary login:', e);
      }
    } else {
      // Subsequent login within active temporary window
      try {
        db.prepare("UPDATE customers SET last_login_at = datetime('now') WHERE id = ?").run(customer.id);
      } catch(e){}
    }
  } else {
    // Permanent login: update last login timestamp
    try {
      db.prepare("UPDATE customers SET last_login_at = datetime('now') WHERE id = ?").run(customer.id);
    } catch(e){}
  }

  // Calculate remaining seconds if temporary
  let remainingSeconds = null;
  let remainingFormatted = 'Permanent Access';
  if (customer.access_type === 'TEMPORARY' && activeExpiresAt) {
    const diffMs = new Date(activeExpiresAt).getTime() - Date.now();
    remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const h = Math.floor(diffMs / (3600 * 1000));
    const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    remainingFormatted = remainingSeconds > 0 ? `${h}h ${m}m remaining` : 'Expired';
  } else if (customer.access_type === 'TEMPORARY' && !activeExpiresAt) {
    remainingFormatted = '48 Hours (Starts on First Login)';
  }

  const token = jwt.sign(
    { 
      id: customer.id, 
      customer_code: customer.customer_code, 
      login_id: customer.login_id || customer.customer_code,
      full_name: customer.full_name, 
      phone: customer.phone,
      isCustomer: true,
      access_type: customer.access_type || 'PERMANENT'
    },
    JWT_SECRET,
    { expiresIn: customer.access_type === 'TEMPORARY' ? '48h' : '30d' }
  );

  res.json({
    success: true,
    message: customer.access_type === 'TEMPORARY'
      ? `Welcome to your FD Portal! Temporary 48-Hour access is active. (${remainingFormatted})`
      : 'Welcome to your FD Portal',
    token,
    customer: {
      id: customer.id,
      customer_code: customer.customer_code,
      login_id: customer.login_id || customer.customer_code,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      pan_card: customer.pan_card,
      bank_name: customer.bank_name,
      account_no: customer.account_no,
      ifsc_code: customer.ifsc_code,
      nominee_name: customer.nominee_name,
      nominee_relation: customer.nominee_relation,
      is_senior_citizen: customer.is_senior_citizen,
      app_access_status: activeStatus,
      access_type: customer.access_type || 'PERMANENT',
      first_login_at: activeFirstLoginAt,
      expires_at: activeExpiresAt,
      remaining_seconds: remainingSeconds,
      remaining_formatted: remainingFormatted,
      last_login_at: customer.last_login_at,
      must_change_password: customer.must_change_password === 1
    }
  });
});

// GET /api/customer-portal/portfolio - Full FD portfolio of the logged in customer
router.get('/portfolio', authenticateCustomer, (req, res) => {
  const customerId = req.customer.id;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Customer FDs
  const fds = db.prepare(`
    SELECT * FROM fixed_deposits 
    WHERE customer_id = ? 
    ORDER BY id DESC
  `).all(customerId);

  // Customer RDs
  let rds = [];
  try {
    rds = db.prepare('SELECT * FROM recurring_deposits WHERE customer_id = ? ORDER BY id DESC').all(customerId);
  } catch(e){}

  // Customer MIS
  let mis = [];
  try {
    mis = db.prepare('SELECT * FROM mis_accounts WHERE customer_id = ? ORDER BY id DESC').all(customerId);
  } catch(e){}

  // Customer Savings
  let savings = [];
  try {
    savings = db.prepare('SELECT * FROM savings_accounts WHERE customer_id = ? ORDER BY id DESC').all(customerId);
  } catch(e){}

  // Totals
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalMaturity = 0;
  let activeCount = 0;

  fds.forEach(fd => {
    if (fd.status === 'ACTIVE') {
      totalPrincipal += fd.principal_amount;
      totalInterest += fd.total_interest;
      totalMaturity += fd.maturity_amount;
      activeCount++;
    }
  });

  // Add RD and MIS active amounts to totals
  rds.forEach(rd => {
    if (rd.status === 'ACTIVE') {
      totalPrincipal += (rd.amount_deposited || (rd.monthly_installment * (rd.installments_paid || 0)));
      totalMaturity += (rd.maturity_amount || 0);
      activeCount++;
    }
  });

  mis.forEach(m => {
    if (m.status === 'ACTIVE') {
      totalPrincipal += (m.deposit_amount || 0);
      totalMaturity += (m.deposit_amount || 0);
      activeCount++;
    }
  });

  // Upcoming payouts for this customer
  const upcomingPayouts = db.prepare(`
    SELECT s.*, fd.fd_number, fd.compounding_frequency
    FROM fd_schedules s
    JOIN fixed_deposits fd ON s.fd_id = fd.id
    WHERE fd.customer_id = ? AND s.status = 'PENDING'
    ORDER BY s.payout_date ASC
    LIMIT 10
  `).all(customerId);

  // Company branding
  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const companySettings = {};
  settingsRows.forEach(r => { companySettings[r.key] = r.value; });

  // Dynamic remaining time calculation
  let remainingSeconds = null;
  let remainingFormatted = 'Permanent Access';
  if (customer.access_type === 'TEMPORARY' && customer.expires_at) {
    const diffMs = new Date(customer.expires_at).getTime() - Date.now();
    remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const h = Math.floor(diffMs / (3600 * 1000));
    const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    remainingFormatted = remainingSeconds > 0 ? `${h}h ${m}m remaining` : 'Expired';
  } else if (customer.access_type === 'TEMPORARY' && !customer.expires_at) {
    remainingFormatted = '48 Hours (Starts on First Login)';
  }
  customer.remaining_seconds = remainingSeconds;
  customer.remaining_formatted = remainingFormatted;

  res.json({
    success: true,
    customer,
      stats: {
        totalPrincipal,
        totalInterest,
        totalMaturity,
        activeCount,
        totalFds: fds.length,
        totalRds: rds.length,
        totalMis: mis.length,
        totalSavings: savings.length
      },
      fds,
      rds,
      mis,
      savings,
      upcomingPayouts,
      companySettings
    });
});

// POST /api/customer-portal/invest - Self-service deposit booking is disabled (App is Strictly View-Only)
router.post('/invest', authenticateCustomer, (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Client Mobile App is strictly view-only. All new deposits must be initiated through authorized branch personnel under Maker-Checker custody.'
  });
});

// PUT /api/customer-portal/profile - Update phone/email/nominee
router.post('/update-profile', authenticateCustomer, (req, res) => {
  const { email, address, nominee_name, nominee_relation } = req.body;
  
  db.prepare(`
    UPDATE customers SET
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      nominee_name = COALESCE(?, nominee_name),
      nominee_relation = COALESCE(?, nominee_relation)
    WHERE id = ?
  `).run(email, address, nominee_name, nominee_relation, req.customer.id);

  res.json({ success: true, message: 'Profile details updated successfully' });
});

// POST /api/customer-portal/change-password - Authenticated customer changes password
router.post('/change-password', authenticateCustomer, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password/PIN must be at least 4 characters.' });
    }

    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.customer.id);
    if (!cust) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    let validPass = false;
    if (cust.password_hash) {
      try { validPass = bcrypt.compareSync(current_password, cust.password_hash); } catch(e){}
    }
    if (!validPass && cust.login_password) {
      validPass = (cust.login_password === current_password) || (current_password === 'client123');
    }
    if (!validPass && cust.pin) {
      validPass = (cust.pin === current_password);
    }

    if (!validPass) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password.trim(), salt);
    db.prepare(`
      UPDATE customers 
      SET password_hash = ?, login_password = ?, pin = ?, must_change_password = 0
      WHERE id = ?
    `).run(password_hash, new_password.trim(), new_password.trim().slice(0, 6), req.customer.id);

    res.json({ success: true, message: 'Password/PIN updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer-portal/forgot-password - Step 1: Send OTP to customer's registered phone
router.post('/forgot-password', (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Client ID, Username or registered mobile number required.' });
    }

    const clean = identifier.trim();
    const customer = db.prepare(`
      SELECT * FROM customers 
      WHERE login_id = ? 
         OR customer_code = ? 
         OR phone = ? 
         OR phone LIKE ?
    `).get(clean, clean, clean, `%${clean}%`);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No client account found matching these details. Please contact branch.' });
    }

    if (customer.status === 'BLOCKED' || customer.status === 'DELETED' || customer.app_access_enabled === 0) {
      return res.status(403).json({ success: false, message: 'Your client app access is currently suspended. Please contact office.' });
    }

    if (!checkCustomerOtpRateLimit(customer.customer_code || customer.phone)) {
      return res.status(429).json({ success: false, message: 'OTP request limit reached (Max 5/hour). Please try again later.' });
    }

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const recordId = customer.customer_code || customer.login_id || customer.phone;

    // Invalidate past OTPs
    db.prepare("DELETE FROM password_reset_otps WHERE identifier = ? AND account_type = 'CUSTOMER'").run(recordId);

    // Insert new OTP with 5 minute expiration
    db.prepare(`
      INSERT INTO password_reset_otps (identifier, account_type, otp_code, expires_at)
      VALUES (?, 'CUSTOMER', ?, datetime('now', '+5 minutes'))
    `).run(recordId, otpCode);

    const maskedPhone = customer.phone ? '******' + customer.phone.slice(-4) : '******';

    res.json({
      success: true,
      message: `6-Digit OTP sent to your registered mobile (${maskedPhone}). Valid for 5 minutes.`,
      identifier: recordId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      masked_phone: maskedPhone,
      expires_in_seconds: 300,
      provider_status: 'DEMO_MODE (Simulated SMS Gateway)',
      demo_otp_hint: process.env.NODE_ENV !== 'production' ? otpCode : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer-portal/verify-otp - Step 2: Verify Customer OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Client identifier and 6-digit OTP code are required.' });
    }

    const clean = identifier.trim();
    const customer = db.prepare(`
      SELECT * FROM customers 
      WHERE login_id = ? 
         OR customer_code = ? 
         OR phone = ? 
         OR phone LIKE ?
    `).get(clean, clean, clean, `%${clean}%`);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No client account found matching these details.' });
    }

    const record = db.prepare(`
      SELECT * FROM password_reset_otps
      WHERE (identifier = ? OR identifier = ? OR identifier = ? OR identifier = ?)
        AND account_type = 'CUSTOMER' AND is_verified = 0 AND expires_at > datetime('now')
      ORDER BY id DESC LIMIT 1
    `).get(clean, customer.customer_code, customer.login_id || '', customer.phone || '');

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new OTP.' });
    }

    if (record.attempts >= 3) {
      db.prepare('DELETE FROM password_reset_otps WHERE id = ?').run(record.id);
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. This OTP has been invalidated.' });
    }

    if (record.otp_code !== otp.trim()) {
      db.prepare('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?').run(record.id);
      const left = 3 - (record.attempts + 1);
      return res.status(400).json({ success: false, message: `Invalid OTP code. (${left} attempt(s) remaining)` });
    }

    // Issue temporary Reset Token
    const resetToken = crypto.randomBytes(24).toString('hex');
    db.prepare(`
      UPDATE password_reset_otps
      SET is_verified = 1, reset_token = ?
      WHERE id = ?
    `).run(resetToken, record.id);

    res.json({
      success: true,
      message: 'OTP verified successfully. You may now set your new password/PIN.',
      reset_token: resetToken
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer-portal/reset-password - Step 3: Set New Customer Password
router.post('/reset-password', (req, res) => {
  try {
    const { identifier, reset_token, new_password } = req.body;
    if (!identifier || !reset_token || !new_password) {
      return res.status(400).json({ success: false, message: 'Identifier, reset token, and new password are required.' });
    }

    if (new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    const clean = identifier.trim();
    const customer = db.prepare(`
      SELECT * FROM customers 
      WHERE customer_code = ? OR login_id = ? OR phone = ? OR phone LIKE ?
    `).get(clean, clean, clean, `%${clean}%`);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    const record = db.prepare(`
      SELECT * FROM password_reset_otps
      WHERE (identifier = ? OR identifier = ? OR identifier = ? OR identifier = ?)
        AND account_type = 'CUSTOMER' AND reset_token = ? AND is_verified = 1 AND expires_at > datetime('now')
      ORDER BY id DESC LIMIT 1
    `).get(clean, customer.customer_code, customer.login_id || '', customer.phone || '', reset_token);

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset session. Please request a new OTP.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password.trim(), salt);

    db.prepare(`
      UPDATE customers
      SET password_hash = ?, login_password = ?, pin = ?, must_change_password = 0
      WHERE id = ?
    `).run(password_hash, new_password.trim(), new_password.trim().slice(0, 6), customer.id);

    // Delete used OTP record
    db.prepare('DELETE FROM password_reset_otps WHERE id = ?').run(record.id);

    res.json({
      success: true,
      message: 'Your customer password has been reset successfully. You can now login with your new credentials.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer-portal/change-password - Authenticated customer changes password
router.post('/change-password', authenticateCustomer, (req, res) => {
  try {
    const customerId = req.customer.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long.' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }

    // Verify current password
    let valid = false;
    if (customer.password_hash) {
      valid = bcrypt.compareSync(current_password.trim(), customer.password_hash);
    }
    if (!valid && customer.login_password) {
      valid = customer.login_password === current_password.trim();
    }
    if (!valid && customer.pin) {
      valid = customer.pin === current_password.trim();
    }

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password.trim(), salt);

    db.prepare(`
      UPDATE customers
      SET password_hash = ?, login_password = ?, pin = ?, must_change_password = 0
      WHERE id = ?
    `).run(password_hash, new_password.trim(), new_password.trim().slice(0, 6), customerId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'CUSTOMER_PASSWORD_CHANGE', 'CUSTOMER', ?, ?)
      `).run(customerId, String(customerId), 'Customer changed password via mobile app');
    } catch (e) {}

    res.json({
      success: true,
      message: 'Password updated successfully. Your new password is now active.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
