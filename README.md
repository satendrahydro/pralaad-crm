# Taranganjali Realtech - Core Banking & Wealth CRM

Internal banking & wealth management CRM for Fixed Deposits (FD), Recurring Deposits (RD), Monthly Income Schemes (MIS), Savings Accounts, Loans, Double-Entry Day Book & Field Collector Android App.

---

## 🌟 मुख्य फीचर्स (Features Built)

1. **यूनिवर्सल FD / RD / MIS कैलकुलेटर व स्कीम्स:**
   - Cumulative एवं Non-Cumulative FD विकल्प, RD मासिक किस्त ट्रैकिंग, और 60-महीने MIS पेआउट शेड्यूल
   - Senior Citizen Benefit (+0.50%) व कस्टम अवधि / ब्याज दर सपोर्ट
   - Printable FD Certificate / Deposit Receipt

2. **सुरक्षित लॉगिन व मेकर-चेकर कंट्रोल (Authentication):**
   - JWT-based Super Admin (Checker) व Staff / Collector (Maker) लॉगिन
   - Field Collector Android APK (`Taranganjali_Banking.apk`) केवल अधिकृत कर्मचारियों के लिए

3. **ग्राहक प्रबंधन व 360° पोर्टफोलियो (Client & KYC Management):**
   - Full KYC, बैंक विवरण, नॉमिनी व एकीकृत 360° खाता व्यू

4. **डबल-एंट्री लेखांकन (Accounting, Cash Book & Day Book):**
   - Day Book, Cash Book (102), Daily Field Collections, Payments to Collect & Trial Balance

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
