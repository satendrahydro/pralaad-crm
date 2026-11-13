# Pralaad Fixed Deposit (FD) CRM & Management Portal

Ek complete, high-performance aur executive **Fixed Deposit Management System & Wealth CRM** jo NBFCs, financial advisors, aur deposit-taking firms ke internal operations ke liye design kiya gaya hai.

---

## 🌟 मुख्य फीचर्स (Features Built)

1. **यूनिवर्सल FD कैलकुलेटर (All 9 Options Included):**
   - **Cumulative Schemes (ब्याज मैच्योरिटी पर जुड़ेगा):**
     - Quarterly Compounding (Indian Standard Banking)
     - Monthly Compounding
     - Half-Yearly Compounding
     - Yearly Compounding
     - Simple Interest at Maturity
   - **Non-Cumulative Schemes (रेगुलर ब्याज पेआउट):**
     - Monthly Interest Payout (Pension Scheme)
     - Quarterly Interest Payout
     - Half-Yearly Interest Payout
     - Annual Interest Payout
   - Senior Citizen Benefit (+0.50% auto-calculated)
   - Real-time Amortization & Ledger Table
   - Direct "Book This FD Now" feature

2. **सुरक्षित लॉगिन व पासवर्ड (Authentication):**
   - JWT-based authentication system
   - Role-based permissions (Admin / Staff)
   - Default Login:
     - **Username:** `admin`
     - **Password:** `admin123`

3. **मासिक सब्सक्रिप्शन और बिलिंग (Monthly Subscription & Billing):**
   - Internal subscription license tracking
   - Monthly plan (₹1,999/mo), 3 months bundle, aur 12 months annual plan
   - Online payment simulation (UPI, Cards, Netbanking)
   - Validity remaining alert

4. **ग्राहक प्रबंधन (Client & KYC Management):**
   - Full KYC: Name, Phone, Email, PAN Card, Aadhaar, Registered Address
   - Senior citizen flag
   - Bank Account Details (Bank name, Account Number, IFSC) for automated payouts
   - Nominee Details (Name & Relation)

5. **FD पोर्टफोलियो और ऑपरेशन्स (Lifecycle Operations):**
   - **Maturity Alerts:** Next 7/30 din me mature hone wali FDs ka live alert
   - **Premature Liquidation (समय से पहले तुड़वाना):** Penalty rate deduction (1%) ke sath automatic net payable amount calculation
   - **FD Renewal (रीन्यूअल):** Principal-only ya Principal + Interest rollover
   - **Printable FD Certificate / Deposit Receipt:** Official seal, header, terms & conditions ke sath direct printable PDF/Receipt

6. **पेआउट रजिस्टर (Interest Payout Calendar):**
   - Non-cumulative accounts ke upcoming interest payouts
   - "Mark as Paid" action with Bank Transaction / NEFT / UTR reference number

7. **भविष्य के मोबाइल ऐप व ऑनलाइन पेमेंट के लिए REST APIs:**
   - Modular REST APIs (`/api/customers`, `/api/fds`, `/api/fds/calculate`, `/api/subscription`)
   - Future Flutter / React Native Mobile App ke sath direct link hone ke liye 100% ready
   - Razorpay / Cashfree / Stripe online payment webhook-ready architecture

---

## 🚀 कैसे चलाएं (How to Run Locally)

### 1. प्रोडक्शन मोड (Production Mode - Fastest & Ready):
```bash
npm start
```
Browser me open karein: **http://localhost:5000**

### 2. डेवलपमेंट मोड (Development Mode with Hot Reload):
- Terminal 1 (Backend Server):
  ```bash
  npm run server
  ```
- Terminal 2 (Frontend Vite UI):
  ```bash
  npm run client
  ```
Browser me open karein: **http://localhost:3000**

---

## 🌐 क्लाउड लाइव डिप्लॉयमेंट (Client Handover Guide)
Jab client ko handover karna ho:
1. VPS Server (DigitalOcean, AWS, Hostinger, ya Ubuntu Server) par repo copy karein.
2. `npm install` aur `npm run build` run karein.
3. `pm2 start server/server.js --name "fd-crm"` se background me start karein.
4. Nginx reverse proxy se custom domain (e.g. `crm.clientdomain.com`) map kar dein.
