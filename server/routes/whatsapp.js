const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { getDueReminders, logWhatsAppMessage, sendViaAPI, getSettings } = require('../services/whatsapp');

// GET /api/whatsapp/due - List of reminders due in X days (default 3 days)
router.get('/due', authenticateToken, (req, res) => {
  const { days = 3 } = req.query;
  const reminders = getDueReminders(parseInt(days));
  const settings = getSettings();

  res.json({
    success: true,
    reminder_days: parseInt(days),
    provider: settings.whatsapp_provider || 'whatsapp_web',
    auto_send: settings.whatsapp_auto_send === '1',
    count: reminders.length,
    reminders
  });
});

// POST /api/whatsapp/log-dispatch - Mark message sent (e.g. from 1-click button or automated)
router.post('/log-dispatch', authenticateToken, (req, res) => {
  const {
    customer_id,
    fd_id,
    schedule_id,
    recipient_phone,
    customer_name,
    reminder_type,
    due_date,
    days_before = 3,
    message_text,
    status = 'SENT'
  } = req.body;

  logWhatsAppMessage({
    customer_id,
    fd_id,
    schedule_id,
    recipient_phone,
    customer_name,
    reminder_type,
    due_date,
    days_before,
    message_text,
    status
  });

  res.json({ success: true, message: 'WhatsApp reminder delivery logged successfully' });
});

// POST /api/whatsapp/send-automated - Bulk automated trigger or single trigger via API
router.post('/send-automated', authenticateToken, async (req, res) => {
  const { reminders = [] } = req.body;
  const results = [];

  for (const item of reminders) {
    try {
      const apiRes = await sendViaAPI(item.clean_phone, item.message);
      logWhatsAppMessage({
        customer_id: item.customer_id,
        fd_id: item.fd_id,
        schedule_id: item.schedule_id,
        recipient_phone: item.customer_phone,
        customer_name: item.customer_name,
        reminder_type: item.type,
        due_date: item.due_date,
        message_text: item.message,
        status: apiRes.sent || apiRes.messages ? 'SENT' : 'DISPATCHED_WEB'
      });
      results.push({ phone: item.clean_phone, status: 'SUCCESS' });
    } catch (err) {
      logWhatsAppMessage({
        customer_id: item.customer_id,
        fd_id: item.fd_id,
        schedule_id: item.schedule_id,
        recipient_phone: item.customer_phone,
        customer_name: item.customer_name,
        reminder_type: item.type,
        due_date: item.due_date,
        message_text: item.message,
        status: 'FAILED',
        error_msg: err.message
      });
      results.push({ phone: item.clean_phone, status: 'FAILED', error: err.message });
    }
  }

  res.json({ success: true, results });
});

// GET /api/whatsapp/logs - Delivery history
router.get('/logs', authenticateToken, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM whatsapp_logs 
    ORDER BY id DESC 
    LIMIT 50
  `).all();

  res.json({ success: true, logs });
});

// POST /api/whatsapp/settings - Save templates and settings
router.post('/settings', authenticateToken, (req, res) => {
  const {
    whatsapp_reminder_days,
    whatsapp_auto_send,
    whatsapp_provider,
    whatsapp_api_token,
    whatsapp_instance_id,
    whatsapp_payout_template,
    whatsapp_maturity_template
  } = req.body;

  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const updates = [
    ['whatsapp_reminder_days', String(whatsapp_reminder_days || 3)],
    ['whatsapp_auto_send', String(whatsapp_auto_send ? 1 : 0)],
    ['whatsapp_provider', String(whatsapp_provider || 'whatsapp_web')],
    ['whatsapp_api_token', String(whatsapp_api_token || '')],
    ['whatsapp_instance_id', String(whatsapp_instance_id || '')],
    ['whatsapp_payout_template', String(whatsapp_payout_template || '')],
    ['whatsapp_maturity_template', String(whatsapp_maturity_template || '')]
  ];

  const runAll = db.transaction((rows) => {
    rows.forEach(([k, v]) => upsert.run(k, v));
  });

  runAll(updates);

  res.json({ success: true, message: 'WhatsApp reminder settings updated successfully' });
});

module.exports = router;
