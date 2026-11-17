const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Rate-limiting map for OTP requests in-memory (identifier -> array of timestamps)
const otpRateLimits = new Map();

// Helper to check rate limiting: Max 5 OTP requests per hour
function checkOtpRateLimit(identifier) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const history = (otpRateLimits.get(identifier) || []).filter(t => now - t < oneHour);
  if (history.length >= 5) {
    return false;
  }
  history.push(now);
  otpRateLimits.set(identifier, history);
  return true;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUser);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  // Check if account is disabled by Super Admin
  if (user.is_active === 0) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account disabled. This staff account has been deactivated by Super Admin.' 
    });
  }

  // Rate-limiting on consecutive failed password attempts (max 5)
  if (user.failed_attempts >= 5) {
    return res.status(429).json({
      success: false,
      message: 'Account temporarily locked due to 5 consecutive failed login attempts. Please reset password via OTP or contact Super Admin.'
    });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?').run(user.id);
    const attemptsLeft = Math.max(0, 5 - (user.failed_attempts + 1));
    return res.status(401).json({ 
      success: false, 
      message: `Invalid username or password. (${attemptsLeft} attempt(s) remaining)` 
    });
  }

  // Reset failed attempts on successful login & update last_login_at
  db.prepare("UPDATE users SET failed_attempts = 0, last_login_at = datetime('now') WHERE id = ?").run(user.id);

  // Get active subscription info
  const sub = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone
    },
    subscription: sub
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role, phone, is_active, created_at FROM users WHERE id = ?').get(req.user.id);
  const sub = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();
  res.json({ success: true, user, subscription: sub });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const match = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);

  res.json({ success: true, message: 'Password updated successfully' });
});

// POST /api/auth/forgot-password - Step 1: Send OTP to Staff Phone
router.post('/forgot-password', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Username or registered mobile number required.' });
  }

  const clean = identifier.trim().toLowerCase();
  const user = db.prepare('SELECT id, username, full_name, phone, is_active FROM users WHERE LOWER(username) = ? OR phone = ?').get(clean, clean);

  if (!user) {
    return res.status(404).json({ success: false, message: 'No staff account found with this username or mobile.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact Super Admin.' });
  }

  if (!checkOtpRateLimit(user.username)) {
    return res.status(429).json({ success: false, message: 'Hourly OTP limit reached (Max 5 requests/hour). Please try again later.' });
  }

  // Generate 6-digit cryptographic OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();

  // Invalidate any past unused OTPs for this user
  db.prepare("DELETE FROM password_reset_otps WHERE identifier = ? AND account_type = 'STAFF'").run(user.username);

  // Store new OTP with 5 minute expiration
  db.prepare(`
    INSERT INTO password_reset_otps (identifier, account_type, otp_code, expires_at)
    VALUES (?, 'STAFF', ?, datetime('now', '+5 minutes'))
  `).run(user.username, otpCode);

  const maskedPhone = user.phone ? '******' + user.phone.slice(-4) : '******' + user.username.slice(-3);

  // NOTE: External SMS Provider is unconfigured, so we clearly label DEMO ONLY
  res.json({
    success: true,
    message: `6-Digit OTP sent to registered mobile (${maskedPhone}). Valid for 5 minutes.`,
    identifier: user.username,
    masked_phone: maskedPhone,
    expires_in_seconds: 300,
    provider_status: 'DEMO_MODE (Simulated SMS Gateway)',
    demo_otp_hint: process.env.NODE_ENV !== 'production' ? otpCode : undefined
  });
});

// POST /api/auth/verify-otp - Step 2: Verify OTP and issue Reset Token
router.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ success: false, message: 'Username and 6-digit OTP code required.' });
  }

  const clean = identifier.trim().toLowerCase();
  const record = db.prepare(`
    SELECT * FROM password_reset_otps
    WHERE identifier = ? AND account_type = 'STAFF' AND is_verified = 0 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(clean);

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

  // Issue temporary Reset Token (10 minute validity)
  const resetToken = crypto.randomBytes(24).toString('hex');
  db.prepare(`
    UPDATE password_reset_otps
    SET is_verified = 1, reset_token = ?
    WHERE id = ?
  `).run(resetToken, record.id);

  res.json({
    success: true,
    message: 'OTP verified successfully. You may now set your new password.',
    reset_token: resetToken
  });
});

// POST /api/auth/reset-password - Step 3: Set New Password via Reset Token
router.post('/reset-password', (req, res) => {
  const { identifier, reset_token, new_password } = req.body;
  if (!identifier || !reset_token || !new_password) {
    return res.status(400).json({ success: false, message: 'Identifier, reset token, and new password required.' });
  }

  if (new_password.trim().length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const clean = identifier.trim().toLowerCase();
  const record = db.prepare(`
    SELECT * FROM password_reset_otps
    WHERE identifier = ? AND account_type = 'STAFF' AND reset_token = ? AND is_verified = 1 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(clean, reset_token);

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset session. Please start over.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(new_password.trim(), salt);

  db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0 WHERE LOWER(username) = ?').run(password_hash, clean);

  // Invalidate OTP record immediately
  db.prepare('DELETE FROM password_reset_otps WHERE id = ?').run(record.id);

  // Audit log
  try {
    const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(clean);
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, 'OTP_PASSWORD_RESET', 'USER', ?, 'Staff password reset completed via verified mobile OTP')
    `).run(user ? user.id : 0, clean);
  } catch(e){}

  res.json({
    success: true,
    message: 'Password has been reset successfully. You can now login with your new credentials.'
  });
});

module.exports = router;
