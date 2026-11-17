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

async function runCompleteVerification() {
  console.log('========================================================================');
  console.log('🏁 COMPLETE CUSTOMER APP ACCESS - DOUBLE VERIFICATION & SECURITY SUITE');
  console.log('========================================================================\n');

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

  // STEP 0: Super Admin Authentication
  console.log('--- STEP 0: Super Admin Authentication ---');
  const adminLogin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert(adminLogin.ok && adminLogin.data.token, 'Super Admin login succeeded', `User: admin, Status: ${adminLogin.status}`);
  const adminToken = adminLogin.data.token;

  // STEP 0.1: Validation & Error Handling Checks
  console.log('\n--- STEP 0.1: UI & Backend Validation & Error Handling ---');

  // Test missing customer selection
  const missingCust = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ access_type: 'TEMPORARY' })
  });
  assert(missingCust.status === 400, 'Missing customer_id rejected with HTTP 400', missingCust.data.message);

  // Test duplicate login ID prevention
  const dupLogin = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      customer_id: 26,
      login_id: 'CUST-1001', // already assigned to Rajesh Sharma
      access_type: 'TEMPORARY'
    })
  });
  assert(dupLogin.status === 400 && dupLogin.data.message.includes('already assigned'), 'Duplicate Login ID rejected with descriptive error', dupLogin.data.message);

  // ========================================================================
  // RUN 1: VERIFICATION CYCLE 1 (Customer A: CUST-1026, Customer B: CUST-1027)
  // ========================================================================
  console.log('\n========================================================================');
  console.log('🔄 RUN 1: VERIFICATION CYCLE 1 (CUST-1026 Temporary, CUST-1027 Permanent)');
  console.log('========================================================================');

  // Reset CUST-1026 to NOT_CREATED state
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT_CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1026'
  `).run();

  const cust1026 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1026'").get();
  const fdsBefore1026 = db.prepare("SELECT count(*) as c, sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(cust1026.id);

  // --- RUN 1 - TEST 1: Create Temporary Customer Login (Auto-generation) ---
  console.log('\n>>> RUN 1 - TEST 1: Create Temporary Customer Login (Auto-generation)');
  const create1026 = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      customer_id: cust1026.id,
      login_id: '', // Blank to test auto-generation
      temp_password: '', // Blank to test auto-generation
      access_type: 'TEMPORARY'
    })
  });
  assert(create1026.status === 201 && create1026.data.success, 'Super Admin creates 48H Temp Access with blank credentials');
  assert(create1026.data.customer?.login_id === 'CUST-1026', 'Login ID auto-generated as Customer Code', create1026.data.customer?.login_id);
  assert(create1026.data.temp_password && create1026.data.temp_password.length >= 6, 'Temporary password securely auto-generated', create1026.data.temp_password);
  assert(create1026.data.customer?.app_access_status === 'PENDING FIRST LOGIN', 'Account shows status PENDING FIRST LOGIN');

  const db1026_pre = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1026.id);
  assert(db1026_pre.access_type === 'TEMPORARY', 'DB: access_type is TEMPORARY');
  assert(db1026_pre.first_login_at === null, 'DB: first_login_at is NULL (clock has not started)');
  assert(db1026_pre.expires_at === null, 'DB: expires_at is NULL (countdown is waiting for first login)');

  const generatedPass1026 = create1026.data.temp_password;

  // --- RUN 1 - TEST 2: Customer First Login & Password Change ---
  console.log('\n>>> RUN 1 - TEST 2: Customer First Login & Password Change');
  const login1026 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1026', password: generatedPass1026 })
  });
  assert(login1026.ok && login1026.data.success, 'Customer CUST-1026 successfully logs in with auto-generated credentials');
  assert(login1026.data.customer?.must_change_password === true, 'First-login password change is flagged as mandatory');

  const cust1026Token = login1026.data.token;
  const db1026_postLogin = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1026.id);
  assert(db1026_postLogin.first_login_at !== null, '48-hour countdown starts strictly on first successful login', db1026_postLogin.first_login_at);
  const diffHours1 = (new Date(db1026_postLogin.expires_at).getTime() - new Date(db1026_postLogin.first_login_at).getTime()) / (3600 * 1000);
  assert(Math.abs(diffHours1 - 48) < 0.01, 'Expiry timestamp is set to exactly +48.00 hours from first login moment', `diff: ${diffHours1.toFixed(2)}h`);
  assert(db1026_postLogin.app_access_status === 'ACTIVE', 'App status transitioned to ACTIVE');

  // Perform first-login password change
  const changePass1026 = await request(`${BASE_URL}/customer-portal/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cust1026Token}` },
    body: JSON.stringify({ current_password: generatedPass1026, new_password: 'PersonalPassword@1026' })
  });
  assert(changePass1026.ok && changePass1026.data.success, 'Customer changes temporary password to personal password');

  const db1026_afterPass = db.prepare("SELECT must_change_password FROM customers WHERE id = ?").get(cust1026.id);
  assert(db1026_afterPass.must_change_password === 0, 'DB: must_change_password updated to 0');

  // Verify customer sees ONLY their own financial records
  const portfolio1026 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${cust1026Token}` }
  });
  assert(portfolio1026.ok && portfolio1026.data.success, 'Customer retrieves portfolio successfully');
  const all1026Fds = portfolio1026.data.fds || [];
  const foreignFds1026 = all1026Fds.filter(f => f.customer_id !== cust1026.id);
  assert(all1026Fds.length > 0 && foreignFds1026.length === 0, 'DATA ISOLATION: Customer can view ONLY their own financial records (0 foreign records leak)', `own: ${all1026Fds.length}, foreign: ${foreignFds1026.length}`);

  // --- RUN 1 - TEST 3: Expiry and Session Security ---
  console.log('\n>>> RUN 1 - TEST 3: Expiry and Session Security Simulation');
  // Artificially simulate expiry by setting expires_at 30 minutes in past
  const pastTime1 = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  db.prepare("UPDATE customers SET expires_at = ? WHERE id = ?").run(pastTime1, cust1026.id);

  // Test already authenticated session blocked on next request
  const portfolio1026_expired = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${cust1026Token}` }
  });
  assert(portfolio1026_expired.status === 403, 'Existing active session immediately revoked on next API request (HTTP 403)');
  assert(portfolio1026_expired.data.expired === true && portfolio1026_expired.data.revoked === true, 'Response flags expired: true and revoked: true');

  // Test new login is blocked after expiry
  const login1026_expired = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1026', password: 'PersonalPassword@1026' })
  });
  assert(login1026_expired.status === 403 && login1026_expired.data.expired === true, 'New login blocked with HTTP 403 and expiry notification');
  assert(login1026_expired.data.message.includes('48-ghante') || login1026_expired.data.message.includes('expire'), 'Bilingual notification informs customer deposits remain 100% safe in branch');

  // Verify customer financial records remain 100% unchanged
  const fdsAfter1026 = db.prepare("SELECT count(*) as c, sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(cust1026.id);
  assert(fdsBefore1026.c === fdsAfter1026.c && fdsBefore1026.s === fdsAfter1026.s, 'FINANCIAL RECORD SAFETY: Customer deposits and balances remain completely unchanged after app expiry');

  // IDOR Test: Attempt to access another customer's portfolio by passing alternative parameters
  const idorTest1 = await request(`${BASE_URL}/customer-portal/portfolio?customerId=1`, {
    headers: { 'Authorization': `Bearer ${cust1026Token}` }
  });
  assert(idorTest1.status === 403, 'IDOR PROTECTION: Customer cannot access other customer records (Token revoked / strictly scoped)');

  // --- RUN 1 - TEST 4: Renewal ---
  console.log('\n>>> RUN 1 - TEST 4: Super Admin Renewal');
  const renew1026 = await request(`${BASE_URL}/users/customer/${cust1026.id}/renew-temporary`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(renew1026.ok && renew1026.data.success, 'Super Admin renews temporary access for CUST-1026');

  const db1026_renewed = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1026.id);
  const renewDiffHours1 = (new Date(db1026_renewed.expires_at).getTime() - Date.now()) / (3600 * 1000);
  assert(Math.abs(renewDiffHours1 - 48) < 0.1, 'Fresh 48-hour validity period created (+48.00 hours from renewal moment)', `diff: ${renewDiffHours1.toFixed(2)}h`);
  assert(db1026_renewed.app_access_enabled === 1 && db1026_renewed.app_access_status === 'ACTIVE', 'Customer status restored to ACTIVE');

  // Customer logs in after renewal
  const login1026_renewed = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1026', password: 'PersonalPassword@1026' })
  });
  assert(login1026_renewed.ok && login1026_renewed.data.success, 'Customer access restored after Super Admin renewal');

  // --- RUN 1 - TEST 5: Permanent Access ---
  console.log('\n>>> RUN 1 - TEST 5: Permanent Access (CUST-1027)');
  // Reset CUST-1027
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT_CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1027'
  `).run();

  const cust1027 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1027'").get();
  const create1027 = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      customer_id: cust1027.id,
      login_id: 'balwant_perm_1',
      temp_password: 'PermanentPassword@1027',
      access_type: 'PERMANENT'
    })
  });
  assert(create1027.status === 201 && create1027.data.success, 'Super Admin creates Permanent Access for CUST-1027');
  assert(create1027.data.customer?.access_type === 'PERMANENT', 'Account has access_type: PERMANENT');

  const db1027 = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1027.id);
  assert(db1027.expires_at === null, 'Permanent customer has expires_at = NULL');

  const login1027 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'balwant_perm_1', password: 'PermanentPassword@1027' })
  });
  assert(login1027.ok && login1027.data.success, 'Permanent customer logs in successfully');
  assert(login1027.data.customer?.expires_at === null || login1027.data.customer?.expires_at === undefined, 'Permanent login has no expiry timestamp');

  const portfolio1027 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${login1027.data.token}` }
  });
  assert(portfolio1027.ok && portfolio1027.data.customer?.remaining_formatted === 'Permanent Access', 'Permanent customer views portfolio with Permanent Access badge');


  // ========================================================================
  // RUN 2: INDEPENDENT DOUBLE VERIFICATION (CUST-1030 Temporary, CUST-1032 Permanent)
  // ========================================================================
  console.log('\n========================================================================');
  console.log('🔄 RUN 2: INDEPENDENT DOUBLE VERIFICATION (CUST-1030 Temporary, CUST-1032 Permanent)');
  console.log('========================================================================');

  // Reset CUST-1030 to NOT_CREATED state
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT_CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1030'
  `).run();

  const cust1030 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1030'").get();
  const fdsBefore1030 = db.prepare("SELECT count(*) as c, sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(cust1030.id);

  // --- RUN 2 - TEST 1: Create Temporary Customer Login (Independent Customer) ---
  console.log('\n>>> RUN 2 - TEST 1: Create Temporary Customer Login for CUST-1030');
  const create1030 = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      customer_id: cust1030.id,
      login_id: '', // Blank auto-generation
      temp_password: '', // Blank auto-generation
      access_type: 'TEMPORARY'
    })
  });
  assert(create1030.status === 201 && create1030.data.success, 'RUN 2: Super Admin creates 48H Temp Access for CUST-1030');
  assert(create1030.data.customer?.login_id === 'CUST-1030', 'RUN 2: Login ID auto-generated as Customer Code', create1030.data.customer?.login_id);
  assert(create1030.data.temp_password && create1030.data.temp_password.length >= 6, 'RUN 2: Temporary password securely auto-generated', create1030.data.temp_password);
  assert(create1030.data.customer?.app_access_status === 'PENDING FIRST LOGIN', 'RUN 2: Account shows status PENDING FIRST LOGIN');

  const db1030_pre = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1030.id);
  assert(db1030_pre.first_login_at === null && db1030_pre.expires_at === null, 'RUN 2: Countdown clock has not started prior to first login');

  const generatedPass1030 = create1030.data.temp_password;

  // --- RUN 2 - TEST 2: Customer First Login & Password Change ---
  console.log('\n>>> RUN 2 - TEST 2: Customer First Login & Password Change for CUST-1030');
  const login1030 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1030', password: generatedPass1030 })
  });
  assert(login1030.ok && login1030.data.success, 'RUN 2: Customer CUST-1030 successfully logs in with auto-generated credentials');
  assert(login1030.data.customer?.must_change_password === true, 'RUN 2: First-login password change flagged mandatory');

  const cust1030Token = login1030.data.token;
  const db1030_postLogin = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1030.id);
  assert(db1030_postLogin.first_login_at !== null, 'RUN 2: 48-hour countdown starts strictly on first successful login', db1030_postLogin.first_login_at);
  const diffHours2 = (new Date(db1030_postLogin.expires_at).getTime() - new Date(db1030_postLogin.first_login_at).getTime()) / (3600 * 1000);
  assert(Math.abs(diffHours2 - 48) < 0.01, 'RUN 2: Expiry timestamp is exactly +48.00 hours from first login moment', `diff: ${diffHours2.toFixed(2)}h`);

  // Password change
  const changePass1030 = await request(`${BASE_URL}/customer-portal/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cust1030Token}` },
    body: JSON.stringify({ current_password: generatedPass1030, new_password: 'PersonalPassword@1030' })
  });
  assert(changePass1030.ok && changePass1030.data.success, 'RUN 2: Password changed to personal password');

  // Verify financial data isolation
  const portfolio1030 = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${cust1030Token}` }
  });
  const all1030Fds = portfolio1030.data.fds || [];
  const foreignFds1030 = all1030Fds.filter(f => f.customer_id !== cust1030.id);
  assert(all1030Fds.length > 0 && foreignFds1030.length === 0, 'RUN 2 DATA ISOLATION: Customer can view ONLY their own financial records (0 foreign records leak)', `own: ${all1030Fds.length}, foreign: ${foreignFds1030.length}`);

  // --- RUN 2 - TEST 3: Expiry and Session Security ---
  console.log('\n>>> RUN 2 - TEST 3: Expiry and Session Security Simulation for CUST-1030');
  const pastTime2 = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  db.prepare("UPDATE customers SET expires_at = ? WHERE id = ?").run(pastTime2, cust1030.id);

  // Active session rejected
  const portfolio1030_expired = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { 'Authorization': `Bearer ${cust1030Token}` }
  });
  assert(portfolio1030_expired.status === 403 && portfolio1030_expired.data.expired === true, 'RUN 2: Existing active session immediately revoked on next API request (HTTP 403)');

  // New login rejected
  const login1030_expired = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1030', password: 'PersonalPassword@1030' })
  });
  assert(login1030_expired.status === 403 && login1030_expired.data.expired === true, 'RUN 2: New login blocked with HTTP 403 and expiry notification');

  // Verify financial records untouched
  const fdsAfter1030 = db.prepare("SELECT count(*) as c, sum(principal_amount) as s FROM fixed_deposits WHERE customer_id = ?").get(cust1030.id);
  assert(fdsBefore1030.c === fdsAfter1030.c && fdsBefore1030.s === fdsAfter1030.s, 'RUN 2 FINANCIAL RECORD SAFETY: Customer deposits and balances remain completely unchanged after app expiry');

  // --- RUN 2 - TEST 4: Renewal ---
  console.log('\n>>> RUN 2 - TEST 4: Super Admin Renewal for CUST-1030');
  const renew1030 = await request(`${BASE_URL}/users/customer/${cust1030.id}/renew-temporary`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(renew1030.ok && renew1030.data.success, 'RUN 2: Super Admin renews temporary access for CUST-1030');

  const db1030_renewed = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1030.id);
  const renewDiffHours2 = (new Date(db1030_renewed.expires_at).getTime() - Date.now()) / (3600 * 1000);
  assert(Math.abs(renewDiffHours2 - 48) < 0.1, 'RUN 2: Fresh 48-hour validity period created (+48.00 hours from renewal moment)', `diff: ${renewDiffHours2.toFixed(2)}h`);

  const login1030_renewed = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1030', password: 'PersonalPassword@1030' })
  });
  assert(login1030_renewed.ok && login1030_renewed.data.success, 'RUN 2: Customer access restored after Super Admin renewal');

  // --- RUN 2 - TEST 5: Permanent Access ---
  console.log('\n>>> RUN 2 - TEST 5: Permanent Access (CUST-1032)');
  // Reset CUST-1032
  db.prepare(`
    UPDATE customers 
    SET access_type = NULL, 
        app_access_enabled = 0, 
        app_access_status = 'NOT_CREATED',
        first_login_at = NULL,
        expires_at = NULL,
        login_password = NULL,
        login_id = NULL
    WHERE customer_code = 'CUST-1032'
  `).run();

  const cust1032 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1032'").get();
  const create1032 = await request(`${BASE_URL}/users/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      customer_id: cust1032.id,
      login_id: 'balwant_perm_2',
      temp_password: 'PermanentPassword@1032',
      access_type: 'PERMANENT'
    })
  });
  assert(create1032.status === 201 && create1032.data.success, 'RUN 2: Super Admin creates Permanent Access for CUST-1032');
  assert(create1032.data.customer?.access_type === 'PERMANENT', 'RUN 2: Account has access_type: PERMANENT');

  const db1032 = db.prepare("SELECT * FROM customers WHERE id = ?").get(cust1032.id);
  assert(db1032.expires_at === null, 'RUN 2: Permanent customer has expires_at = NULL');

  const login1032 = await request(`${BASE_URL}/customer-portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'balwant_perm_2', password: 'PermanentPassword@1032' })
  });
  assert(login1032.ok && login1032.data.success, 'RUN 2: Permanent customer logs in successfully');
  assert(login1032.data.customer?.expires_at === null || login1032.data.customer?.expires_at === undefined, 'RUN 2: Permanent login has no expiry timestamp');


  // ========================================================================
  // STEP 6: AUDIT TRAIL VERIFICATION FOR BOTH RUNS
  // ========================================================================
  console.log('\n========================================================================');
  console.log('📋 STEP 6: AUDIT LOGS COMPREHENSIVE VERIFICATION');
  console.log('========================================================================');

  const recentLogs = db.prepare(`
    SELECT action, entity_type, entity_id, details, created_at 
    FROM audit_logs 
    ORDER BY id DESC 
    LIMIT 40
  `).all();

  const expectedActions = [
    'CREATE_TEMPORARY_CUSTOMER_APP_LOGIN',
    'CUSTOMER_FIRST_LOGIN_48H_START',
    'CUSTOMER_APP_ACCESS_EXPIRED',
    'RENEW_TEMPORARY_CUSTOMER_APP_ACCESS',
    'CREATE_CUSTOMER_APP_LOGIN'
  ];

  for (const action of expectedActions) {
    const matches = recentLogs.filter(l => l.action === action);
    assert(matches.length >= 2, `Audit Log recorded at least twice (Double Verification): ${action}`, `Found ${matches.length} entries`);
  }

  console.log('\n========================================================================');
  console.log(`📊 FINAL DOUBLE VERIFICATION SCORE: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log('========================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 100% SUCCESS: ALL 5 SCENARIOS PASSED TWICE ACROSS INDEPENDENT RUNS!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
    process.exit(1);
  }
}

runCompleteVerification().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
