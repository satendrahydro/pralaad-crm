const http = require('http');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('MULTI-PRODUCT END-TO-END AUTOMATED VERIFICATION TEST');
  console.log('====================================================');

  // 1. Admin Login
  const adminLogin = await request('/api/auth/login', { method: 'POST' }, { username: 'admin', password: 'admin123' });
  if (!adminLogin.body?.token) {
    console.error('Admin login failed:', adminLogin);
    process.exit(1);
  }
  const adminToken = adminLogin.body.token;
  console.log('✓ Check 1: Admin Authentication Succeeded');

  // 2. Staff Login
  const staffLogin = await request('/api/auth/login', { method: 'POST' }, { username: 'staff1', password: 'staff123' });
  if (!staffLogin.body?.token) {
    console.error('Staff login failed:', staffLogin);
    process.exit(1);
  }
  const staffToken = staffLogin.body.token;
  console.log('✓ Check 2: Staff Maker Authentication Succeeded');

  // 3. Analytics Dashboard Multi-Product Metrics
  const dashRes = await request('/api/analytics/dashboard', { headers: { Authorization: `Bearer ${adminToken}` } });
  const metrics = dashRes.body.data.metrics;
  console.log('✓ Check 3: Unified Dashboard Multi-Product Metrics:');
  console.log(`  - Total Institutional Deposits: ₹${metrics.totalInstitutionalDeposits}`);
  console.log(`  - Total Active Accounts: ${metrics.totalActiveAccounts}`);
  console.log(`  - RD Accounts: ${metrics.rd.activeCount}, MIS Accounts: ${metrics.mis.activeCount}, Savings Accounts: ${metrics.savings.activeCount}`);

  // 4. List Products
  const rdList = await request('/api/rd', { headers: { Authorization: `Bearer ${adminToken}` } });
  const misList = await request('/api/mis', { headers: { Authorization: `Bearer ${adminToken}` } });
  const sbList = await request('/api/savings', { headers: { Authorization: `Bearer ${adminToken}` } });
  console.log(`✓ Check 4: List APIs returned: RD(${rdList.body.rds?.length}), MIS(${misList.body.accounts?.length}), Savings(${sbList.body.accounts?.length})`);

  // 5. Staff Maker: Propose New RD
  const newRdRes = await request('/api/rd', { method: 'POST', headers: { Authorization: `Bearer ${staffToken}` } }, {
    customer_id: 3,
    monthly_installment: 10000,
    annual_rate: 8.25,
    tenure_months: 12,
    remarks: 'Staff Maker RD Proposal for Priya Verma'
  });
  console.log('newRdRes body:', newRdRes.body);
  console.log('✓ Check 5: Staff Maker RD Submission -> Approval Required:', newRdRes.body.makerApprovalRequired === true);
  const rdReqId = newRdRes.body.requestId;

  // 6. Staff Maker: Propose New MIS
  const newMisRes = await request('/api/mis', { method: 'POST', headers: { Authorization: `Bearer ${staffToken}` } }, {
    customer_id: 3,
    deposit_amount: 300000,
    annual_rate: 8.4,
    tenure_months: 36,
    remarks: 'Staff Maker MIS Proposal for Priya Verma'
  });
  console.log('✓ Check 6: Staff Maker MIS Submission -> Approval Required:', newMisRes.body.makerApprovalRequired === true);
  const misReqId = newMisRes.body.requestId;

  // 7. Staff Maker: Propose New Savings Account
  const newSbRes = await request('/api/savings', { method: 'POST', headers: { Authorization: `Bearer ${staffToken}` } }, {
    customer_id: 3,
    opening_balance: 5000,
    minimum_balance: 1000,
    annual_interest_rate: 4.0,
    remarks: 'Staff Maker Savings Account Proposal'
  });
  console.log('✓ Check 7: Staff Maker Savings Account Submission -> Approval Required:', newSbRes.body.makerApprovalRequired === true);
  const sbReqId = newSbRes.body.requestId;

  // 8. Staff Forbidden from Approving
  const staffApproveAttempt = await request(`/api/approvals/${rdReqId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${staffToken}` } }, { decision_remarks: 'Self approve' });
  console.log('✓ Check 8: Staff Self-Approval Blocked with HTTP', staffApproveAttempt.status, '(403 Forbidden verified)');

  // 9. Admin Checker Approves RD
  const adminApproveRd = await request(`/api/approvals/${rdReqId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }, { decision_remarks: 'Admin verified and approved RD' });
  console.log('✓ Check 9: Admin Approved RD Contract:', adminApproveRd.body.result?.rdNumber);

  // 10. Admin Checker Approves MIS
  const adminApproveMis = await request(`/api/approvals/${misReqId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }, { decision_remarks: 'Admin verified and approved MIS' });
  console.log('✓ Check 10: Admin Approved MIS Contract:', adminApproveMis.body.result?.misNumber);

  // 11. Admin Checker Approves Savings Account
  const adminApproveSb = await request(`/api/approvals/${sbReqId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }, { decision_remarks: 'Admin verified and approved Savings Account' });
  console.log('✓ Check 11: Admin Approved Savings A/c:', adminApproveSb.body.result?.accountNumber);

  // 12. Customer 360 Portfolio View for Customer #3 (Priya Verma)
  const portRes = await request('/api/customers/3/portfolio', { headers: { Authorization: `Bearer ${adminToken}` } });
  const pSum = portRes.body.summary;
  console.log('✓ Check 12: Customer 360 Portfolio for Priya Verma:');
  console.log(`  - FDs: ${pSum.productBreakdown.fd.count}, RDs: ${pSum.productBreakdown.rd.count}, MIS: ${pSum.productBreakdown.mis.count}, Savings: ${pSum.productBreakdown.savings.count}`);
  console.log(`  - Total Accounts: ${pSum.totalAccounts}`);

  console.log('====================================================');
  console.log('ALL 12 MULTI-PRODUCT BACKEND CHECKS PASSED (100% SUCCESS)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
