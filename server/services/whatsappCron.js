const { getDueReminders, sendViaAPI, logWhatsAppMessage, getSettings } = require('./whatsapp');

async function checkAndSendAutoReminders() {
  try {
    const settings = getSettings();
    const isAutoSend = settings.whatsapp_auto_send === '1';
    const provider = settings.whatsapp_provider || 'whatsapp_web';

    // If auto-send is not enabled or set to manual whatsapp_web, skip automatic headless dispatch
    if (!isAutoSend || provider === 'whatsapp_web') {
      return { skipped: true, reason: 'Auto send disabled or in manual WhatsApp Web mode' };
    }

    const days = parseInt(settings.whatsapp_reminder_days) || 3;
    const dueReminders = getDueReminders(days);

    const unsentReminders = dueReminders.filter(r => !r.already_sent);
    console.log(`[AUTO-WHATSAPP-CRON] Found ${unsentReminders.length} reminders due for 3-day automatic dispatch`);

    let sentCount = 0;
    for (const item of unsentReminders) {
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
          days_before: days,
          message_text: item.message,
          status: 'AUTO_SENT'
        });
        sentCount++;
        console.log(`[AUTO-WHATSAPP-CRON] Successfully sent reminder to ${item.customer_name} (${item.clean_phone})`);
      } catch (sendErr) {
        logWhatsAppMessage({
          customer_id: item.customer_id,
          fd_id: item.fd_id,
          schedule_id: item.schedule_id,
          recipient_phone: item.customer_phone,
          customer_name: item.customer_name,
          reminder_type: item.type,
          due_date: item.due_date,
          days_before: days,
          message_text: item.message,
          status: 'FAILED',
          error_msg: sendErr.message
        });
        console.error(`[AUTO-WHATSAPP-CRON] Failed to send to ${item.customer_phone}:`, sendErr.message);
      }
    }

    return { success: true, sentCount };
  } catch (err) {
    console.error('[AUTO-WHATSAPP-CRON] Error running automated check:', err.message);
  }
}

function startReminderScheduler() {
  console.log('⏰ Automated WhatsApp 3-Day Reminder Scheduler initiated');
  
  // Run 10 seconds after server start
  setTimeout(() => {
    checkAndSendAutoReminders();
  }, 10000);

  // Run automatically every 1 hour in background
  setInterval(() => {
    checkAndSendAutoReminders();
  }, 60 * 60 * 1000);
}

module.exports = {
  checkAndSendAutoReminders,
  startReminderScheduler
};
