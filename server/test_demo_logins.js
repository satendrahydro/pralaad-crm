async function testLogins() {
  const adminRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  }).then(r => r.json());
  console.log('Admin Login:', adminRes.success, adminRes.user?.role, adminRes.user?.full_name);

  const staffRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'employee', password: 'staff123' })
  }).then(r => r.json());
  console.log('Employee Login:', staffRes.success, staffRes.user?.role, staffRes.user?.full_name);

  const staff1Res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff1', password: 'staff123' })
  }).then(r => r.json());
  console.log('Staff1 Login:', staff1Res.success, staff1Res.user?.role, staff1Res.user?.full_name);

  const custRes = await fetch('http://localhost:5000/api/customer-portal/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'CUST-1001', password: 'client123' })
  }).then(r => r.json());
  console.log('Customer Login (CUST-1001):', custRes.success, custRes.customer?.full_name);

  const custPhoneRes = await fetch('http://localhost:5000/api/customer-portal/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '9822233445', password: 'client123' })
  }).then(r => r.json());
  console.log('Customer Login (9822233445):', custPhoneRes.success, custPhoneRes.customer?.full_name);
}

testLogins().catch(console.error);
