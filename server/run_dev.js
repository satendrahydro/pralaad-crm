const path = require('path');
process.env.DB_FILE = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
console.log('🚀 Launching CRM Server using isolated DB:', process.env.DB_FILE);
require('./server.js');
