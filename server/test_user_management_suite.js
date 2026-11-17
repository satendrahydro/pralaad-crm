const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('🧪 COMPREHENSIVE USER MANAGEMENT & ACCESS AUTOMATED TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Super Admin Login
    console.log('\n--- 1. AUTHENTICATION & TOKENS ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Super Admin logs in successfully', JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // Employee Login
    const empLogin = await request('POST', '/api/auth/login', {
      username: 'employee',
      password: 'employee123'
    });
    assert(empLogin.status === 200 && empLogin.data.token, 'Staff (Employee) logs in successfully', JSON.stringify(empLogin.data));
    const empToken = empLogin.data.token;
    const empHeaders = { 'Authorization': `Bearer ${empToken}` };

    // 2. Super Admin User Management Stats
    console.log('\n--- 2. SUPER ADMIN USER STATS & DIRECTORY ---');
    const statsRes = await request('GET', '/api/users/stats', null, adminHeaders);
    assert(statsRes.status === 200 && statsRes.data.stats, 'Super Admin fetches User Management statistics', JSON.stringify(statsRes.data));
    assert(typeof statsRes.data.stats.totalStaff === 'number' && typeof statsRes.data.stats.totalCustomers === 'number', 'Stats contain valid staff and customer counts');

    // List Users
    const listRes = await request('GET', '/api/users', null, adminHeaders);
    assert(listRes.status === 200 && Array.isArray(listRes.data.staff) && Array.isArray(listRes.data.customers), 'Super Admin lists staff and customer app accounts');

    // Non-Admin cannot access /api/users
    const empUsersForbidden = await request('GET', '/api/users', null, empHeaders);
    assert(empUsersForbidden.status === 403, 'Staff is strictly FORBIDDEN from accessing /api/users (HTTP 403)');

    // 3. Staff Account Lifecycle (Create, Disable, Reset, Enable)
    console.log('\n--- 3. STAFF ACCOUNT LIFECYCLE ---');
    const testStaffUser = `staff_test_${Date.now()}`;
    const createStaffRes = await request('POST', '/api/users/staff', {
      username: testStaffUser,
      full_name: 'Audit Test Staff',
      phone: '9899123456',
      password: 'TempPassword@123',
      role: 'employee'
    }, adminHeaders);
    assert(createStaffRes.status === 201 && createStaffRes.data.user, `Super Admin creates staff account: ${testStaffUser}`);
    const newStaffId = createStaffRes.data.user.id;

    // Verify created staff can log in
    const newStaffLogin = await request('POST', '/api/auth/login', {
      username: testStaffUser,
      password: 'TempPassword@123'
    });
    assert(newStaffLogin.status === 200 && newStaffLogin.data.token, 'Newly created staff logs in successfully');

    // Admin toggles staff to DISABLED
    const toggleStaffDisable = await request('PATCH', `/api/users/staff/${newStaffId}/toggle`, {}, adminHeaders);
    assert(toggleStaffDisable.status === 200 && toggleStaffDisable.data.is_active === 0, 'Super Admin disables staff account');

    // Disabled staff login must be BLOCKED
    const disabledStaffLogin = await request('POST', '/api/auth/login', {
      username: testStaffUser,
      password: 'TempPassword@123'
    });
    assert(disabledStaffLogin.status === 401 || disabledStaffLogin.status === 403, 'Disabled staff login is REJECTED (HTTP 401/403)');

    // Admin resets staff password
    const resetStaffPass = await request('POST', `/api/users/staff/${newStaffId}/reset-password`, {
      new_password: 'PermanentPassword@456'
    }, adminHeaders);
    assert(resetStaffPass.status === 200, 'Super Admin resets staff password');

    // Admin re-enables staff
    const toggleStaffEnable = await request('PATCH', `/api/users/staff/${newStaffId}/toggle`, {}, adminHeaders);
    assert(toggleStaffEnable.status === 200 && toggleStaffEnable.data.is_active === 1, 'Super Admin re-enables staff account');

    // Staff logs in with NEW password
    const reenabledStaffLogin = await request('POST', '/api/auth/login', {
      username: testStaffUser,
      password: 'PermanentPassword@456'
    });
    assert(reenabledStaffLogin.status === 200 && reenabledStaffLogin.data.token, 'Staff successfully logs in with new reset password');

    // 4. Customer App Access: Direct Super Admin Creation & Temporary Password
    console.log('\n--- 4. CUSTOMER APP ACCESS: DIRECT ADMIN PROVISIONING ---');
    // Pick an existing customer
    const existingCust = listRes.data.customers[0];
    assert(existingCust && existingCust.id, `Selected existing customer: ${existingCust.full_name} (ID: ${existingCust.id})`);

    const custLoginId = `APP-CUST-${existingCust.id}`;
    const directCustRes = await request('POST', '/api/users/customer', {
      customer_id: existingCust.id,
      login_id: custLoginId,
      temp_password: 'TempClient@2026'
    }, adminHeaders);
    assert(directCustRes.status === 201 && directCustRes.data.temp_password, 'Super Admin provisions Customer App Login with temporary password');

    // Customer logs in with temporary password
    const custTempLogin = await request('POST', '/api/customer-portal/login', {
      identifier: custLoginId,
      pin: 'TempClient@2026'
    });
    assert(custTempLogin.status === 200 && custTempLogin.data.customer.must_change_password === true, 
      'Customer logs in with temp password and must_change_password flag is TRUE');
    const custToken = custTempLogin.data.token;
    const custHeaders = { 'Authorization': `Bearer ${custToken}` };

    // Customer changes temporary password to permanent
    console.log('\n--- 5. CUSTOMER FIRST-TIME PASSWORD CHANGE ---');
    const changePassRes = await request('POST', '/api/customer-portal/change-password', {
      current_password: 'TempClient@2026',
      new_password: 'PermanentClient@999'
    }, custHeaders);
    assert(changePassRes.status === 200 && changePassRes.data.success, 'Customer successfully changes temporary password to permanent');

    // Verify old temp password NO LONGER works
    const oldLoginFail = await request('POST', '/api/customer-portal/login', {
      identifier: custLoginId,
      pin: 'TempClient@2026'
    });
    assert(oldLoginFail.status === 401 || !oldLoginFail.data.success, 'Old temporary password is now INVALID');

    // Verify new permanent password logs in cleanly and must_change_password is FALSE
    const newCustLogin = await request('POST', '/api/customer-portal/login', {
      identifier: custLoginId,
      pin: 'PermanentClient@999'
    });
    assert(newCustLogin.status === 200 && newCustLogin.data.customer.must_change_password === false, 
      'Customer logs in with new permanent password and must_change_password is FALSE');

    // 6. Maker-Checker Customer App Access Workflow (Staff request -> Super Admin approval)
    console.log('\n--- 6. MAKER-CHECKER CUSTOMER APP ACCESS WORKFLOW ---');
    // Pick another customer who doesn't have active app access yet (or ensure access is reset for test)
    let targetCustomer = listRes.data.customers.find(c => c.id !== existingCust.id && c.app_access_status !== 'ACTIVE');
    if (!targetCustomer) {
      targetCustomer = listRes.data.customers.find(c => c.id !== existingCust.id) || listRes.data.customers[1];
      // Reset app access status on test customer to allow submission
      await request('PATCH', `/api/users/customer/${targetCustomer.id}/toggle`, {}, adminHeaders);
    }
    assert(targetCustomer && targetCustomer.id, `Selected maker target customer: ${targetCustomer.full_name} (ID: ${targetCustomer.id})`);

    // Staff submits request
    const staffSubmitRequest = await request('POST', '/api/approvals', {
      request_type: 'CUSTOMER_APP_ACCESS',
      customer_id: targetCustomer.id,
      request_data: {
        customer_id: targetCustomer.id,
        customer_code: targetCustomer.customer_code,
        notes: 'Customer requested mobile app digital passbook access at Delhi branch counter'
      },
      remarks: 'Customer requested mobile app digital passbook access at Delhi branch counter'
    }, empHeaders);
    assert(staffSubmitRequest.status === 200 && staffSubmitRequest.data.requestId, 'Staff submits CUSTOMER_APP_ACCESS request to Approvals Queue', JSON.stringify(staffSubmitRequest.data));
    const requestId = staffSubmitRequest.data.requestId;

    // Staff CANNOT approve own request
    const staffApproveFail = await request('POST', `/api/approvals/${requestId}/approve`, {}, empHeaders);
    assert(staffApproveFail.status === 403, 'Staff is FORBIDDEN from approving own request (Dual Custody Enforced)');

    // Super Admin approves request
    const adminApproveRequest = await request('POST', `/api/approvals/${requestId}/approve`, {
      notes: 'Approved by Branch Super Admin after KYC verification'
    }, adminHeaders);
    assert(adminApproveRequest.status === 200 && adminApproveRequest.data.success, 'Super Admin approves CUSTOMER_APP_ACCESS request');
    const targetTempPass = adminApproveRequest.data.result?.temp_password;
    assert(Boolean(targetTempPass), 'Approval result includes auto-generated temporary password');

    // Verify target customer now has active app credentials
    const targetCustCode = targetCustomer.customer_code;
    const targetCustCheck = await request('POST', '/api/customer-portal/login', {
      identifier: targetCustCode,
      pin: targetTempPass
    });
    assert(targetCustCheck.status === 200 && targetCustCheck.data.token, 
      'Target customer logs into App with Checker-activated credentials');

    // 7. Customer Suspension & Reactivation
    console.log('\n--- 7. CUSTOMER SUSPENSION & REACTIVATION ---');
    const suspendCust = await request('PATCH', `/api/users/customer/${existingCust.id}/toggle`, {}, adminHeaders);
    assert(suspendCust.status === 200 && suspendCust.data.app_access_status === 'SUSPENDED', 'Super Admin suspends customer app access');

    // Suspended customer login is REJECTED
    const suspendedLogin = await request('POST', '/api/customer-portal/login', {
      identifier: custLoginId,
      pin: 'PermanentClient@999'
    });
    assert(suspendedLogin.status === 403, 'Suspended customer login is REJECTED with HTTP 403');

    // Super Admin reactivates customer
    const reactivateCust = await request('PATCH', `/api/users/customer/${existingCust.id}/toggle`, {}, adminHeaders);
    assert(reactivateCust.status === 200 && reactivateCust.data.app_access_status === 'ACTIVE', 'Super Admin reactivates customer app access');

    // 8. Customer Forgot Password / Mobile OTP Flow
    console.log('\n--- 8. CUSTOMER FORGOT PASSWORD WITH VERIFIED OTP ---');
    const forgotStep1 = await request('POST', '/api/customer-portal/forgot-password', {
      identifier: custLoginId
    });
    assert(forgotStep1.status === 200 && forgotStep1.data.demo_otp_hint, 'Step 1: OTP sent to customer registered mobile');
    const otpCode = forgotStep1.data.demo_otp_hint;

    const forgotStep2 = await request('POST', '/api/customer-portal/verify-otp', {
      identifier: custLoginId,
      otp: otpCode
    });
    assert(forgotStep2.status === 200 && forgotStep2.data.reset_token, 'Step 2: Customer OTP verified successfully');
    const resetToken = forgotStep2.data.reset_token;

    const forgotStep3 = await request('POST', '/api/customer-portal/reset-password', {
      identifier: custLoginId,
      reset_token: resetToken,
      new_password: 'OtpResetPass@2026'
    });
    assert(forgotStep3.status === 200 && forgotStep3.data.success, 'Step 3: Customer sets new password after verified OTP');

    // Log in with OTP reset password
    const otpLogin = await request('POST', '/api/customer-portal/login', {
      identifier: custLoginId,
      pin: 'OtpResetPass@2026'
    });
    assert(otpLogin.status === 200 && otpLogin.data.token, 'Customer logs in with new OTP-reset password');

    // 9. Customer Data Isolation
    console.log('\n--- 9. CUSTOMER PORTFOLIO DATA ISOLATION ---');
    const activeCustHeaders = { 'Authorization': `Bearer ${otpLogin.data.token}` };
    const portfolioRes = await request('GET', '/api/customer-portal/portfolio', null, activeCustHeaders);
    assert(portfolioRes.status === 200 && portfolioRes.data.customer, 'Customer accesses digital passbook portfolio');
    assert(portfolioRes.data.customer.id === existingCust.id, `Portfolio matches authenticated customer ID (${existingCust.id})`);
    
    // Ensure customer has NO access to staff or admin endpoints
    const customerAdminProbe = await request('GET', '/api/approvals', null, activeCustHeaders);
    assert(customerAdminProbe.status === 401 || customerAdminProbe.status === 403, 
      'Customer token is strictly FORBIDDEN from accessing internal staff/admin approvals (HTTP 401/403)');

    // 10. Strict Production DB Check
    console.log('\n--- 10. PRODUCTION DATABASE INTEGRITY CHECK ---');
    const prodDbPath = path.join(__dirname, 'fd_crm.sqlite');
    const prodStats = fs.statSync(prodDbPath);
    console.log(`  Production DB Path: ${prodDbPath}`);
    console.log(`  Production DB Size: ${prodStats.size} bytes`);
    assert(prodStats.size === 57344, 'Production database fd_crm.sqlite is UNTOUCHED (57,344 bytes)');

    console.log('\n================================================================');
    console.log(`📊 FINAL SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}

runSuite();
