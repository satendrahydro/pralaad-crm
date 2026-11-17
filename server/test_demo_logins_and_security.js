const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}, body = null) {
  const fetch = globalThis.fetch;
  const opts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };
  if (body) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch(e) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function verifyDemoLogins() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING DEDICATED DEMO CREDENTIALS & SECURITY BOUNDARIES');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      return true;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - Details: ${details}`);
      return false;
    }
  }

  // 1. Super Admin Login
  console.log('--- 1. Super Admin Authentication & Privileges ---');
  const adminRes = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
    username: 'admin',
    password: 'Admin@Demo#2026!'
  });
  assert(adminRes.ok && adminRes.data.token && adminRes.data.user?.role === 'admin', 'Super Admin Login', `User: admin, Role: ${adminRes.data.user?.role}`);
  const adminToken = adminRes.data.token;

  const adminSub = await request(`${BASE_URL}/subscription`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminSub.ok && adminSub.data.subscription?.status === 'ACTIVE', 'Super Admin Subscription Access', `Plan: ${adminSub.data.subscription?.plan_name}`);

  // 2. Staff Maker Login
  console.log('\n--- 2. Staff Maker Authentication & RBAC Isolation ---');
  const staffRes = await request(`${BASE_URL}/auth/login`, { method: 'POST' }, {
    username: 'staff1',
    password: 'Staff@Demo#2026!'
  });
  assert(staffRes.ok && staffRes.data.token && staffRes.data.user?.role === 'employee', 'Staff Maker Login', `User: staff1, Role: ${staffRes.data.user?.role}`);
  const staffToken = staffRes.data.token;

  // Staff RBAC Enforcement
  const staffSubAttempt = await request(`${BASE_URL}/subscription`, {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  assert(staffSubAttempt.status === 403, 'RBAC: Staff blocked from Subscription Management', 'HTTP 403 Forbidden');

  const staffUserCreateAttempt = await request(`${BASE_URL}/users/staff`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  }, { username: 'unauthorized', full_name: 'Attacker', password: 'password123' });
  assert(staffUserCreateAttempt.status === 403, 'RBAC: Staff blocked from User Management Administration', 'HTTP 403 Forbidden');

  // 3. Customer Permanent Login (CUST-1001)
  console.log('\n--- 3. Customer App: Permanent Access Authentication & Portfolio ---');
  const cust1Res = await request(`${BASE_URL}/customer-portal/login`, { method: 'POST' }, {
    identifier: 'CUST-1001',
    password: 'Client@Demo#2026!'
  });
  assert(cust1Res.ok && cust1Res.data.token && cust1Res.data.customer?.customer_code === 'CUST-1001', 'Customer Permanent Login (CUST-1001)', `Name: ${cust1Res.data.customer?.full_name}`);
  const cust1Token = cust1Res.data.token;

  const cust1Port = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { Authorization: `Bearer ${cust1Token}` }
  });
  assert(cust1Port.ok && cust1Port.data.customer?.customer_code === 'CUST-1001', 'Customer 1 Portfolio Access', `Active FDs: ${cust1Port.data.portfolio?.fds?.length || 0}`);

  // 4. Customer Temporary 48-Hour Login (CUST-1042)
  console.log('\n--- 4. Customer App: Temporary 48-Hour Access Authentication ---');
  const custTempRes = await request(`${BASE_URL}/customer-portal/login`, { method: 'POST' }, {
    identifier: 'CUST-1042',
    password: 'Temp@Demo#2026!'
  });
  assert(custTempRes.ok && custTempRes.data.token && custTempRes.data.customer?.customer_code === 'CUST-1042', 'Customer Temporary Login (CUST-1042)', `Access: ${custTempRes.data.customer?.access_type}, Expires: ${custTempRes.data.customer?.expires_at}`);
  const custTempToken = custTempRes.data.token;

  const custTempPort = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { Authorization: `Bearer ${custTempToken}` }
  });
  assert(custTempPort.ok && custTempPort.data.customer?.customer_code === 'CUST-1042', 'Customer Temporary Portfolio Access', `Status: ${custTempPort.data.customer?.app_access_status}`);

  // 5. Customer Multi-Product Senior Citizen Login (CUST-1043)
  console.log('\n--- 5. Customer App: Senior Citizen Multi-Product Access ---');
  const custSeniorRes = await request(`${BASE_URL}/customer-portal/login`, { method: 'POST' }, {
    identifier: 'CUST-1043',
    password: 'Senior@Demo#2026!'
  });
  assert(custSeniorRes.ok && custSeniorRes.data.token && custSeniorRes.data.customer?.customer_code === 'CUST-1043', 'Customer Senior Login (CUST-1043)', `Name: ${custSeniorRes.data.customer?.full_name}`);
  const custSeniorToken = custSeniorRes.data.token;

  const custSeniorPort = await request(`${BASE_URL}/customer-portal/portfolio`, {
    headers: { Authorization: `Bearer ${custSeniorToken}` }
  });
  assert(custSeniorPort.ok && custSeniorPort.data.customer?.is_senior_citizen === 1, 'Customer Senior Portfolio Access', `Senior Citizen: true, Products: FD, RD, MIS, Savings`);

  // 6. Data Isolation & IDOR Protection Check
  console.log('\n--- 6. Customer Data Isolation & Cross-Account IDOR Protection ---');
  const idorAttempt = await request(`${BASE_URL}/customer-portal/portfolio?customerId=42`, {
    headers: { Authorization: `Bearer ${cust1Token}` }
  });
  assert(idorAttempt.ok && idorAttempt.data.customer?.id === 1, 'Data Isolation: Customer 1 cannot access Customer 42 data', `Returned Customer ID: ${idorAttempt.data.customer?.id}`);

  // Summary
  console.log('\n========================================================================');
  console.log(`📊 DEMO CREDENTIALS & SECURITY VERIFICATION: ${passed} / ${total} PASSED (${((passed/total)*100).toFixed(1)}%)`);
  console.log('========================================================================');

  if (passed === total) {
    console.log('🎉 ALL DEMO LOGINS & SECURITY BOUNDARIES FULLY VERIFIED!');
    process.exit(0);
  } else {
    console.error('❌ SOME VERIFICATIONS FAILED');
    process.exit(1);
  }
}

verifyDemoLogins().catch(err => {
  console.error('Fatal error during demo login verification:', err);
  process.exit(1);
});
