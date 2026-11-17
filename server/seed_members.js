const db = require('./db');

try {
  // Update existing 4 with branch & father_name & KYC
  db.prepare('UPDATE customers SET father_name = ?, branch = ?, kyc_status = ? WHERE id = 1').run('Shri O.P. Sharma', 'MAIN BRANCH', 'FULL_KYC');
  db.prepare('UPDATE customers SET father_name = ?, branch = ?, kyc_status = ? WHERE id = 2').run('Late C.L. Patel', 'TARPL SAVING', 'FULL_KYC');
  db.prepare('UPDATE customers SET father_name = ?, branch = ?, kyc_status = ? WHERE id = 3').run('Mr. Anand Verma', 'TARPL0002', 'FULL_KYC');
  db.prepare('UPDATE customers SET father_name = ?, branch = ?, kyc_status = ? WHERE id = 4').run('Shri Ram Kumar', 'MAIN BRANCH', 'FULL_KYC');

  // Add 3 realistic Taranganjali style members if they don't already exist
  const check5 = db.prepare('SELECT id FROM customers WHERE phone = ?').get('9548059939');
  if (!check5) {
    db.prepare(`
      INSERT INTO customers (
        customer_code, login_id, login_password, app_access_enabled, status,
        full_name, father_name, branch, kyc_status, phone, email, pan_card, aadhaar_no,
        address, bank_name, account_no, ifsc_code, nominee_name, nominee_relation, is_senior_citizen
      ) VALUES (
        'M01704', 'M01704', 'client123', 1, 'ACTIVE',
        'Meera Near BSA Office', 'Rajkumar', 'TARPL SAVING', 'FULL_KYC', '9548059939', 'meera@tarpl.in', 'GQYPM0286A', '569612345696',
        'Near BSA Office, Bijnor', 'State Bank of India', '33829104812', 'SBIN0000621', 'Rajkumar', 'Husband', 0
      )
    `).run();
  }

  const check6 = db.prepare('SELECT id FROM customers WHERE phone = ?').get('9410846042');
  if (!check6) {
    db.prepare(`
      INSERT INTO customers (
        customer_code, login_id, login_password, app_access_enabled, status,
        full_name, father_name, branch, kyc_status, phone, email, pan_card, aadhaar_no,
        address, bank_name, account_no, ifsc_code, nominee_name, nominee_relation, is_senior_citizen
      ) VALUES (
        'M01703', 'M01703', 'client123', 1, 'ACTIVE',
        'Sheetal Devi Kotdwar', 'Mr. Munshiram', 'MAIN BRANCH', 'FULL_KYC', '9410846042', 'sheetal@tarpl.in', 'AGDPO1765B', '263799882637',
        'Kotdwar Road, Bijnor', 'Punjab National Bank', '019283746501', 'PUNB0019200', 'Mr. Munshiram', 'Husband', 0
      )
    `).run();
  }

  const check7 = db.prepare('SELECT id FROM customers WHERE phone = ?').get('9058605808');
  if (!check7) {
    db.prepare(`
      INSERT INTO customers (
        customer_code, login_id, login_password, app_access_enabled, status,
        full_name, father_name, branch, kyc_status, phone, email, pan_card, aadhaar_no,
        address, bank_name, account_no, ifsc_code, nominee_name, nominee_relation, is_senior_citizen
      ) VALUES (
        'M01702', 'M01702', 'client123', 1, 'ACTIVE',
        'Vikas Kumar Bharat Vihar', 'Khushiram Singh', 'SHEKHUPURA BRANCH', 'FULL_KYC', '9058605808', 'vikas@tarpl.in', 'AYFPC4729D', '784511227845',
        'Bharat Vihar, Shekhupura', 'HDFC Bank', '501002938471', 'HDFC0001290', 'Pooja Rani', 'Spouse', 0
      )
    `).run();
  }

  console.log('Sample members added and updated successfully!');
} catch (err) {
  console.error('Seed error:', err);
}
