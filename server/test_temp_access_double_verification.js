const path = require('path');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));

const DB_PATH = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
const db = new Database(DB_PATH);
const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const fetch = globalThis.fetch;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch(e) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('🏁 48-HOUR TEMPORARY CUSTOMER APP ACCESS - DOUBLE VERIFICATION');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      return true;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - Details: ${details}`);
      return false;
    }
  }

  // 0. Super Admin Login
  console.log('--- STEP 0: Super Admin Authentication ---');
  const adminLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert(adminLogin.ok && adminLogin.data.token, 'Super Admin login succeeded', `User: admin, Status: ${adminLogin.status}`);
  const adminToken = adminLogin.data.token;

  // SCENARIO 1: Customer A (Priya Patel, CUST-1002)
  console.log('\n--- SCENARIO 1: Temporary Access Lifecycle for Customer A (CUST-1002) ---');
  
  // Clean prior state for CUST-1002
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1002'
  `).run();

  // 1.1 Super Admin creates Temporary Access (48 Hours)
  const custA = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();
  const createA = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      customer_id: custA.id,
      login_id: 'priya_temp',
      temporary_password: 'tempPass123',
      access_type: 'TEMPORARY',
      require_password_change: false
    })
  });
  assert(createA.ok && createA.data.success, 'Super Admin creates 48-Hour Temporary Access for Customer A');
  assert(createA.data.customer?.access_type === 'TEMPORARY', 'Customer A access_type is TEMPORARY');
  assert(createA.data.customer?.app_access_status === 'PENDING FIRST LOGIN', 'Customer A initial status is PENDING FIRST LOGIN');

  // Verify DB state before first login
  const dbA1 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();
  assert(dbA1.access_type === 'TEMPORARY', 'DB: access_type is TEMPORARY');
  assert(dbA1.app_access_status === 'PENDING FIRST LOGIN', 'DB: app_access_status is PENDING FIRST LOGIN');
  assert(dbA1.first_login_at === null, 'DB: first_login_at is NULL before login');
  assert(dbA1.expires_at === null, 'DB: expires_at is NULL before login (clock has not started)');

  // 1.2 Customer A performs first login
  const loginA1 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya_temp', password: 'tempPass123' })
  });
  console.log('DEBUG loginA1:', loginA1);
  assert(loginA1.ok && loginA1.data.success, 'Customer A first login succeeded');
  assert(loginA1.data.customer?.access_type === 'TEMPORARY', 'Login response confirms TEMPORARY access');
  assert(loginA1.data.customer?.first_login_at !== null, 'Login response has first_login_at populated');
  assert(loginA1.data.customer?.expires_at !== null, 'Login response has expires_at calculated (+48 hours)');

  const custAToken = loginA1.data.token;
  const dbA2 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();
  const firstLoginTime = new Date(dbA2.first_login_at).getTime();
  const expiryTime = new Date(dbA2.expires_at).getTime();
  const diffHours = (expiryTime - firstLoginTime) / (3600 * 1000);
  assert(Math.abs(diffHours - 48) < 0.01, '48-Hour validity countdown accurately set (+48.00 hours from first login)', `diffHours: ${diffHours.toFixed(2)}`);
  assert(dbA2.app_access_status === 'ACTIVE', 'DB: Status transitioned to ACTIVE upon first login');

  // 1.3 Active customer calls authenticated API
  const portfolioA1 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${custAToken}` }
  });
  assert(portfolioA1.ok && portfolioA1.data.success, 'Customer A active session successfully views portfolio');
  assert(portfolioA1.data.customer?.remaining_formatted.includes('remaining'), 'Customer A receives dynamic remaining validity badge');

  // 1.4 Financial Isolation Check - Count deposit records before simulation
  const fdsBeforeA = db.prepare("SELECT count(*) as c FROM fixed_deposits WHERE customer_id = ?").get(custA.id).c;
  const balanceBeforeA = db.prepare("SELECT sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(custA.id).s;

  // 1.5 Simulate Expiry: Artificially set expires_at 2 hours in the past
  console.log('\n--- Simulating 48-Hour Expiry for Customer A ---');
  const pastExpiry = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  db.prepare("UPDATE customers SET expires_at = ? WHERE customer_code = 'CUST-1002'").run(pastExpiry);

  // 1.6 Customer A attempts API call with ALREADY ACTIVE token (Live Token Revocation Test)
  const portfolioA2 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${custAToken}` }
  });
  assert(portfolioA2.status === 403, 'Active session immediately REVOKED upon expiry (HTTP 403)', `Status: ${portfolioA2.status}`);
  assert(portfolioA2.data.expired === true && portfolioA2.data.revoked === true, 'Response flags expired: true and revoked: true');
  assert(portfolioA2.data.message.includes('expire') || portfolioA2.data.message.includes('48-ghante'), 'Clear Hindi/English expiry message returned explaining deposit safety');

  // 1.7 Verify Financial Records completely untouched
  const dbA3 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();
  assert(dbA3.app_access_status === 'EXPIRED', 'DB: Customer app_access_status marked EXPIRED');
  assert(dbA3.app_access_enabled === 0, 'DB: Customer app_access_enabled turned off (0)');
  assert(dbA3.status === 'ACTIVE', 'DB: Core customer status remains ACTIVE (financial status untouched)');

  const fdsAfterA = db.prepare("SELECT count(*) as c FROM fixed_deposits WHERE customer_id = ?").get(custA.id).c;
  const balanceAfterA = db.prepare("SELECT sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(custA.id).s;
  assert(fdsBeforeA === fdsAfterA && balanceBeforeA === balanceAfterA, 'FINANCIAL ISOLATION VERIFIED: Customer FDs and balances completely unchanged after app expiry');

  // 1.8 Customer A attempts new login while expired
  const loginA2 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya_temp', password: 'tempPass123' })
  });
  assert(loginA2.status === 403 && loginA2.data.expired === true, 'New login attempts BLOCKED for expired account');

  // 1.9 Super Admin renews temporary access for another 48 hours
  console.log('\n--- Super Admin Renews Temporary Access for Customer A ---');
  const renewA = await request(`${BASE_URL}/users/customer/${custA.id}/renew-temporary`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(renewA.ok && renewA.data.success, 'Super Admin 1-Click Renewal endpoint succeeded');
  assert(renewA.data.app_access_status === 'ACTIVE', 'Renew response indicates ACTIVE status');

  const dbA4 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();
  const renewedExpiryTime = new Date(dbA4.expires_at).getTime();
  const renewDiff = (renewedExpiryTime - Date.now()) / (3600 * 1000);
  assert(Math.abs(renewDiff - 48) < 0.1, 'Expiry renewed to exactly +48 hours from renewal moment', `renewDiff: ${renewDiff.toFixed(2)}h`);
  assert(dbA4.app_access_enabled === 1, 'DB: app_access_enabled restored to 1');

  // 1.10 Customer A logs in again after renewal
  const loginA3 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya_temp', password: 'tempPass123' })
  });
  assert(loginA3.ok && loginA3.data.success, 'Customer A logs in successfully after admin renewal');
  const custATokenRenewed = loginA3.data.token;

  const portfolioA3 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${custATokenRenewed}` }
  });
  assert(portfolioA3.ok && portfolioA3.data.success, 'Customer A accesses passbook successfully after renewal');


  // SCENARIO 2: Customer B (Amit Verma, CUST-1003) - Independent Verification
  console.log('\n--- SCENARIO 2: Independent Scenario - Customer B (CUST-1003) ---');
  
  // Clean prior state for CUST-1003
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1003'
  `).run();

  const custB = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1003'").get();
  
  // 2.1 Admin creates Temporary Access
  const createB = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      customer_id: custB.id,
      login_id: 'amit_temp_48',
      temporary_password: 'amitPass456',
      access_type: 'TEMPORARY',
      require_password_change: false
    })
  });
  assert(createB.ok && createB.data.customer?.access_type === 'TEMPORARY', 'Super Admin creates 48H Temp Access for Customer B');

  // 2.2 Verify Admin user management list contains pending state
  const usersList = await request(`${BASE_URL}/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const userEntryB = usersList.data.customers.find(c => c.customer_code === 'CUST-1003');
  assert(userEntryB?.access_type === 'TEMPORARY', 'User Management list reflects Customer B access_type: TEMPORARY');
  assert(userEntryB?.app_access_status === 'PENDING FIRST LOGIN', 'User Management list reflects Customer B status: PENDING FIRST LOGIN');

  // 2.3 Customer B first login
  const loginB1 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'amit_temp_48', password: 'amitPass456' })
  });
  assert(loginB1.ok && loginB1.data.success, 'Customer B first login succeeded');
  const custBToken = loginB1.data.token;

  // 2.4 Toggle suspension
  console.log('\n--- Testing Administrative Suspension & Reactivation on Temporary Account ---');
  const toggleSuspend = await request(`${BASE_URL}/users/customer/${custB.id}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(toggleSuspend.ok && toggleSuspend.data.app_access_enabled === 0, 'Admin successfully suspends Customer B temporary access');

  const portfolioBBlocked = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${custBToken}` }
  });
  assert(portfolioBBlocked.status === 403, 'Suspended temporary account blocked from API access (HTTP 403)');

  const toggleReactivate = await request(`${BASE_URL}/users/customer/${custB.id}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(toggleReactivate.ok && toggleReactivate.data.app_access_enabled === 1, 'Admin reactivates Customer B temporary access');

  const portfolioBActive = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${custBToken}` }
  });
  assert(portfolioBActive.ok && portfolioBActive.data.success, 'Customer B can view portfolio again after reactivation');


  // SCENARIO 3: Permanent Customer Access Isolation (Rajesh Sharma, CUST-1001)
  console.log('\n--- SCENARIO 3: Permanent Customer Login Isolation Test (CUST-1001) ---');
  
  // Ensure CUST-1001 is set to PERMANENT
  db.prepare(`
    UPDATE customers 
    SET access_type = 'PERMANENT',
        app_access_enabled = 1,
        app_access_status = 'ACTIVE',
        login_id = 'CUST-1001'
    WHERE customer_code = 'CUST-1001'
  `).run();

  const loginPerm = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1001', password: 'client123' })
  });
  assert(loginPerm.ok && loginPerm.data.success, 'Permanent Customer CUST-1001 login succeeded');
  assert(loginPerm.data.customer?.access_type === 'PERMANENT', 'Permanent customer access_type is PERMANENT');
  assert(loginPerm.data.customer?.expires_at === null || loginPerm.data.customer?.expires_at === undefined, 'Permanent customer has no expires_at timestamp');

  const portfolioPerm = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${loginPerm.data.token}` }
  });
  assert(portfolioPerm.ok && portfolioPerm.data.success, 'Permanent Customer CUST-1001 views portfolio without expiration limits');


  // SCENARIO 4: Audit Logs Verification
  console.log('\n--- SCENARIO 4: Audit Logs Verification ---');
  const auditLogs = db.prepare(`
    SELECT action, entity_type, details, created_at 
    FROM audit_logs 
    ORDER BY id DESC 
    LIMIT 30
  `).all();

  const requiredActions = [
    'CREATE_TEMPORARY_CUSTOMER_APP_LOGIN',
    'CUSTOMER_FIRST_LOGIN_48H_START',
    'CUSTOMER_APP_ACCESS_EXPIRED',
    'RENEW_TEMPORARY_CUSTOMER_APP_ACCESS',
    'SUSPEND_CUSTOMER_APP_ACCESS',
    'REACTIVATE_CUSTOMER_APP_ACCESS'
  ];

  for (const action of requiredActions) {
    const found = auditLogs.find(l => l.action === action);
    assert(Boolean(found), `Audit Log recorded: ${action}`, found ? `Details: ${found.details?.slice(0, 70)}...` : 'MISSING');
  }

  console.log('\n===============================================================');
  console.log(`📊 FINAL VERIFICATION SCORE: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL DOUBLE VERIFICATION REQUIREMENTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
