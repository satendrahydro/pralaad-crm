const db = require('../db');

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// Find all reminders due in X days (default 3 days)
function getDueReminders(daysAhead = 3) {
  const settings = getSettings();
  const targetDays = parseInt(daysAhead) || parseInt(settings.whatsapp_reminder_days) || 3;

  const dueList = [];

  // 1. Next Interest Payouts / Installments due in exactly targetDays (or between today and targetDays)
  const pendingPayouts = db.prepare(`
    SELECT 
      s.id as schedule_id,
      s.payout_date as due_date,
      s.payout_amount as amount,
      s.period_no,
      fd.id as fd_id,
      fd.fd_number,
      c.id as customer_id,
      c.full_name as customer_name,
      c.phone as customer_phone,
      c.bank_name,
      c.account_no
    FROM fd_schedules s
    JOIN fixed_deposits fd ON s.fd_id = fd.id
    JOIN customers c ON fd.customer_id = c.id
    WHERE s.status = 'PENDING'
      AND fd.status = 'ACTIVE'
      AND s.payout_date <= date('now', '+' || ? || ' days')
      AND s.payout_date >= date('now')
    ORDER BY s.payout_date ASC
  `).all(targetDays);

  const payoutTemplate = settings.whatsapp_payout_template || 
    'नमस्ते {CUSTOMER_NAME} जी! 🙏\n\nआपके Fixed Deposit ({FD_NUMBER}) का अगला ब्याज पेआउट / किस्त ₹{AMOUNT} दिनांक {DUE_DATE} को आपके बैंक खाते में जमा होना निर्धारित है।\n\nसंपर्क: {COMPANY_PHONE}\n{COMPANY_NAME}';

  pendingPayouts.forEach(item => {
    // Check if already sent today
    const alreadySent = db.prepare(`
      SELECT id FROM whatsapp_logs 
      WHERE schedule_id = ? AND date(sent_at) = date('now')
    `).get(item.schedule_id);

    const message = payoutTemplate
      .replace(/{CUSTOMER_NAME}/g, item.customer_name)
      .replace(/{FD_NUMBER}/g, item.fd_number)
      .replace(/{AMOUNT}/g, formatCurrency(item.amount))
      .replace(/{DUE_DATE}/g, formatDate(item.due_date))
      .replace(/{BANK_NAME}/g, item.bank_name || 'Bank')
      .replace(/{ACCOUNT_NO}/g, item.account_no || 'N/A')
      .replace(/{COMPANY_PHONE}/g, settings.phone || '')
      .replace(/{COMPANY_NAME}/g, settings.company_name || 'Pralaad Wealth');

    const cleanPhone = cleanPhoneNumber(item.customer_phone);
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    dueList.push({
      type: 'PAYOUT_INSTALLMENT',
      title: 'Upcoming Interest Payout / Installment',
      schedule_id: item.schedule_id,
      fd_id: item.fd_id,
      fd_number: item.fd_number,
      customer_id: item.customer_id,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      clean_phone: cleanPhone,
      due_date: item.due_date,
      amount: item.amount,
      message,
      wa_link: waLink,
      already_sent: !!alreadySent
    });
  });

  // 2. Upcoming FD Maturities in targetDays
  const maturingFDs = db.prepare(`
    SELECT 
      fd.id as fd_id,
      fd.fd_number,
      fd.maturity_date as due_date,
      fd.maturity_amount as amount,
      c.id as customer_id,
      c.full_name as customer_name,
      c.phone as customer_phone,
      c.bank_name,
      c.account_no
    FROM fixed_deposits fd
    JOIN customers c ON fd.customer_id = c.id
    WHERE fd.status = 'ACTIVE'
      AND fd.maturity_date <= date('now', '+' || ? || ' days')
      AND fd.maturity_date >= date('now')
    ORDER BY fd.maturity_date ASC
  `).all(targetDays);

  const maturityTemplate = settings.whatsapp_maturity_template || 
    'नमस्ते {CUSTOMER_NAME} जी! 🙏\n\nसूचित किया जाता है कि आपका Fixed Deposit ({FD_NUMBER}) राशि ₹{AMOUNT} दिनांक {DUE_DATE} को परिपक्व (Mature) होने जा रहा है।\n\nसंपर्क: {COMPANY_PHONE}\n{COMPANY_NAME}';

  maturingFDs.forEach(item => {
    const alreadySent = db.prepare(`
      SELECT id FROM whatsapp_logs 
      WHERE fd_id = ? AND reminder_type = 'MATURITY_DUE' AND date(sent_at) = date('now')
    `).get(item.fd_id);

    const message = maturityTemplate
      .replace(/{CUSTOMER_NAME}/g, item.customer_name)
      .replace(/{FD_NUMBER}/g, item.fd_number)
      .replace(/{AMOUNT}/g, formatCurrency(item.amount))
      .replace(/{DUE_DATE}/g, formatDate(item.due_date))
      .replace(/{BANK_NAME}/g, item.bank_name || 'Bank')
      .replace(/{ACCOUNT_NO}/g, item.account_no || 'N/A')
      .replace(/{COMPANY_PHONE}/g, settings.phone || '')
      .replace(/{COMPANY_NAME}/g, settings.company_name || 'Pralaad Wealth');

    const cleanPhone = cleanPhoneNumber(item.customer_phone);
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    dueList.push({
      type: 'MATURITY_DUE',
      title: 'Upcoming FD Maturity (परिपक्वता)',
      fd_id: item.fd_id,
      fd_number: item.fd_number,
      customer_id: item.customer_id,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      clean_phone: cleanPhone,
      due_date: item.due_date,
      amount: item.amount,
      message,
      wa_link: waLink,
      already_sent: !!alreadySent
    });
  });

  return dueList;
}

// Log WhatsApp dispatch
function logWhatsAppMessage({
  customer_id,
  fd_id,
  schedule_id,
  recipient_phone,
  customer_name,
  reminder_type,
  due_date,
  days_before = 3,
  message_text,
  status = 'SENT',
  error_msg = null
}) {
  const stmt = db.prepare(`
    INSERT INTO whatsapp_logs (
      customer_id, fd_id, schedule_id, recipient_phone, customer_name,
      reminder_type, due_date, days_before, message_text, status, error_msg
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    customer_id || null,
    fd_id || null,
    schedule_id || null,
    recipient_phone,
    customer_name,
    reminder_type,
    due_date,
    days_before,
    message_text,
    status,
    error_msg
  );
}

// Automated API Sender (UltraMsg / Meta API / Webhook)
async function sendViaAPI(toPhone, message) {
  const settings = getSettings();
  const provider = settings.whatsapp_provider || 'whatsapp_web';

  if (provider === 'ultramsg' && settings.whatsapp_instance_id && settings.whatsapp_api_token) {
    const url = `https://api.ultramsg.com/${settings.whatsapp_instance_id}/messages/chat`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token: settings.whatsapp_api_token,
        to: toPhone,
        body: message
      })
    });
    return await res.json();
  }

  // Meta Cloud API
  if (provider === 'meta_api' && settings.whatsapp_instance_id && settings.whatsapp_api_token) {
    const url = `https://graph.facebook.com/v19.0/${settings.whatsapp_instance_id}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.whatsapp_api_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: message }
      })
    });
    return await res.json();
  }

  // Default return manual ready
  return { success: true, mode: 'manual_ready' };
}

module.exports = {
  getDueReminders,
  logWhatsAppMessage,
  sendViaAPI,
  cleanPhoneNumber,
  getSettings
};
