const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Available commercial packages
const TIERS = {
  starter: {
    id: 'starter',
    name: 'FD Silver Tier (Basic License)',
    annual_price: 12000,
    monthly_equivalent: 1000,
    features: [
      'Up to 300 Active Fixed Deposits',
      'All 9 Compounding & Payout Models',
      'Digital Certificate / Receipt Generator',
      '1-Click WhatsApp Reminders',
      'Standard Email & Ticket Support'
    ]
  },
  professional: {
    id: 'professional',
    name: 'FD Gold Pro Tier (Most Popular + Full AMC)',
    annual_price: 24000,
    monthly_equivalent: 2000,
    features: [
      'Unlimited Fixed Deposits & Clients',
      'Automated 3-Day Advance WhatsApp Reminders',
      'Daily Cloud Database Backup (Zero Data Loss)',
      'Premature Liquidation & Penalty Calculator',
      'Multi-User Staff & Role Access',
      'Full Annual Maintenance (AMC) & Updates Included',
      'Priority Phone & WhatsApp Support'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'FD Platinum Enterprise (Cloud Server + App Ready)',
    annual_price: 48000,
    monthly_equivalent: 4000,
    features: [
      'Dedicated Cloud VPS Server & Custom Domain',
      'Rest APIs for Mobile App (Android / iOS)',
      'Online Payment Gateway Webhooks (Razorpay / Cashfree)',
      'Multi-Branch Management & Hierarchy',
      'Hourly Off-Site Encrypted Backups',
      'Dedicated Account Manager & 24/7 Priority SLA',
      'Complete Source Maintenance & Custom Features'
    ]
  }
};

// GET /api/subscription - Get current plan & status
router.get('/', authenticateToken, (req, res) => {
  const sub = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();
  
  const now = new Date();
  const validUntil = sub ? new Date(sub.valid_until) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const diffDays = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));

  res.json({
    success: true,
    subscription: {
      ...(sub || {
        plan_name: 'FD Gold Pro Tier (Annual Maintenance Included)',
        monthly_price: 2000,
        status: 'ACTIVE',
        valid_until: validUntil.toISOString().split('T')[0],
        billing_cycle: 'ANNUAL'
      }),
      annual_price: (sub && sub.monthly_price === 2000) ? 24000 : 24000,
      days_left: Math.max(0, diffDays),
      is_expired: diffDays <= 0,
      is_expiring_soon: diffDays <= 30 && diffDays > 0,
      tiers: TIERS
    }
  });
});

// POST /api/subscription/renew - Renew plan
router.post('/renew', authenticateToken, (req, res) => {
  const {
    tier = 'professional',
    billing_period = 'annual', // 'annual' | 'half_yearly'
    payment_method = 'Corporate Bank Transfer / UPI',
    transaction_id = 'TXN-AMC-' + Date.now()
  } = req.body;

  const selectedTier = TIERS[tier] || TIERS.professional;
  const currentSub = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();
  
  const baseDate = (currentSub && new Date(currentSub.valid_until) > new Date()) 
    ? new Date(currentSub.valid_until) 
    : new Date();

  const monthsToAdd = (billing_period === 'half_yearly') ? 6 : 12;
  baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
  const newValidUntil = baseDate.toISOString().split('T')[0];

  const planPrice = (billing_period === 'half_yearly') ? (selectedTier.annual_price / 2) : selectedTier.annual_price;

  db.prepare(`
    INSERT INTO subscription (
      plan_name, monthly_price, status, valid_until, billing_cycle,
      last_payment_date, last_payment_ref, notes
    ) VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
  `).run(
    selectedTier.name,
    selectedTier.monthly_equivalent,
    newValidUntil,
    billing_period.toUpperCase(),
    new Date().toISOString().split('T')[0],
    transaction_id,
    `Renewed for ${monthsToAdd} month(s) - ${selectedTier.name} via ${payment_method}`
  );

  const updatedSub = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();

  res.json({
    success: true,
    message: `Subscription successfully renewed until ${newValidUntil}!`,
    subscription: updatedSub
  });
});

module.exports = router;
