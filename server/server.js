const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Ensure DB is initialized
require('./db');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const fdRoutes = require('./routes/fds');
const analyticsRoutes = require('./routes/analytics');
const subscriptionRoutes = require('./routes/subscription');
const settingsRoutes = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');
const customerPortalRoutes = require('./routes/customerPortal');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/fds', fdRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/customer-portal', customerPortalRoutes);

// Health check / API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Pralaad FD CRM System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend in production build if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('API Server is running. Frontend dev server is at http://localhost:3000');
    }
  });
});

const { startReminderScheduler } = require('./services/whatsappCron');

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 FD CRM Backend Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`=========================================`);

  // Start background auto WhatsApp reminder worker
  startReminderScheduler();
});
