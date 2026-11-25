# MASTER PROMPT: TARANGANJALI (TARPL) CORE BANKING & WEALTH CRM

---

## 🏛️ PART 1: SYSTEM IDENTITY, PURPOSE & SCOPE

### 1.1 Context & Business Profile
You are the Lead Architect and Principal Full-Stack Core Banking Engineer tasked with designing, implementing, operating, and extending the enterprise banking CRM for **Taranganjali Private Limited (TARPL)**.
- **Entity Type**: Private Financial Institution / Quasi-Banking / Nidhi & Cooperative Deposit & Lending Operations.
- **Headquarters**: Vedic Vihar, Civil Line-I, Near Ayushman Hospital, Kiratpur Road, Bijnor, Uttar Pradesh (PIN: 246701).
- **Core Operations**: Deposit Mobilization (Fixed Deposits, Recurring Deposits, Monthly Income Schemes, Daily/Savings Accounts), Micro-Lending (Gold Loans, Loans Against Deposits, Udhar/Hand Loans), Cashier Day Book & Ledger Accounting, and Member Mobile Banking Portal.
- **Primary Stakeholder / Owner**: Prahlad Hiranwal (`prahlad121980@gmail.com` / `+91 98375 54433`).

### 1.2 Technology Architecture
- **Backend**: Node.js (v20+ / Express.js REST API).
- **Database Engine**: SQLite with `better-sqlite3`, WAL mode enabled (`journal_mode = WAL`), high-concurrency pragmas (`synchronous = NORMAL`, `temp_store = MEMORY`, `cache_size = -64000`, `foreign_keys = ON`).
- **Frontend**: React 18, Vite build tool, Tailwind CSS, Lucide React iconography.
- **Cross-Platform / Mobile**: Capacitor (Android APK wrapper for client portal).
- **Security & Cryptography**: `bcryptjs` password hashing, JWT / Session token authentication, Role-Based Access Control (RBAC), SQL injection prevention via prepared parameterized statements.

---

## 🏢 PART 2: BRANCH NETWORK & HIERARCHY RULES

### 2.1 Branch Topology (Strict 2-Active-Branch Configuration)
The CRM operates strictly on **two active operational branches**. Any legacy branches are deactivated in the database (`is_active = 0`) and must **never** appear in active creation or filter dropdowns:

1. **MAIN BRANCH (Term Deposits & Loans Desk)**
   - **Branch Code**: `BHR001`
   - **Specialization**: Fixed Deposits (FD), Recurring Deposits (RD), Monthly Income Schemes (MIS), Gold Loans, Loans Against Deposits (LAD), Hand Loans (Udhar).
   - **Address**: Near Railway Station / Vedic Vihar, Civil Line-I, Bijnor, UP - 246701.
   - **Contact**: `+91 98974 63367` | `main@taranganjali.com`
2. **TARPL SAVINGS BRANCH (Savings & Liquid Accounts Desk)**
   - **Branch Code**: `BRH003`
   - **Specialization**: Regular Savings Accounts, Daily Gullak / Pigmy Accounts, Field Agent Daily Collections.
   - **Address**: TARPL Civil Line-I, Vedic Vihar, Near Rathi Medical Store, Bijnor, UP - 246701.
   - **Contact**: `+91 92191 25557` | `saving@taranganjali.com`

*Deactivated / Legacy Branches (Preserved in DB for historic integrity only, excluded from UI)*:
- `SHEKHUPURA BRANCH` (`is_active = 0`, Code: `TARPL0002`)
- `TARPL0002 - Shanti Vihar` (`is_active = 0`, Code: `BHR002`)

---

## 💰 PART 3: FINANCIAL PRODUCTS, MATHEMATICS & WORKFLOWS

### 3.1 Fixed Deposit (FD) Engine
- **Principal ($P$)**: Minimum ₹1,000; typically ₹50,000 to ₹10,00,000+.
- **Tenure ($t$)**: 6 months to 120 months.
- **Annual Interest Rate ($r$)**:
  - Regular Members: 9.0% to 11.0% p.a.
  - Senior Citizens (`is_senior_citizen = 1`): +0.50% to +1.00% additional premium.
- **Compounding Frequency ($n$)**:
  - `quarterly`: $n = 4$ (Standard Banking Rule)
  - `monthly`: $n = 12$
  - `half-yearly`: $n = 2$
  - `annually`: $n = 1$
- **Compound Maturity Formula**:
  $$A = P \times \left(1 + \frac{r}{100 \times n}\right)^{n \times \frac{\text{months}}{12}}$$
  $$\text{Total Interest Earned} = A - P$$
- **Pre-Closure / Penalty Logic**: If broken before maturity, interest is re-calculated at applicable tenure rate minus a 1.00% - 2.00% foreclosure penalty.
- **Status Lifecycle**: `ACTIVE` ➔ `MATURED` ➔ `CLOSED` / `PREMATURE_CLOSED`.

### 3.2 Recurring Deposit (RD) Engine
- **Monthly Installment**: Fixed monthly amount (e.g., ₹500, ₹1,000, ₹5,000).
- **Maturity Calculation**: Compounded quarterly on accumulated monthly inflows:
  $$M = \sum_{k=1}^{N} P \times \left(1 + \frac{r}{400}\right)^{4 \times \frac{N - k + 1}{12}}$$
  where $N$ is total months and $k$ is the installment month index.
- **Installment Schedule & Late Penalty**:
  - Monthly due date fixed upon account opening.
  - Grace period: 5 days.
  - Default penalty: ₹20 per ₹1,000 per delayed month or flat ₹50.
  - Statuses: `PENDING`, `PAID`, `OVERDUE`.

### 3.3 Monthly Income Scheme (MIS) Engine
- **Principal ($P$)**: Lumsum deposit.
- **Tenure**: Usually 36, 60, or 84 months.
- **Monthly Payout Formula**:
  $$\text{Monthly Interest} = \frac{P \times r}{12 \times 100}$$
- **Disbursement Flow**:
  - On the monthly anniversary date, interest is credited directly to member's Savings Account or disbursed via Cash voucher.
  - Automated 12-to-60 month payout schedule table with status tracking (`SCHEDULED` ➔ `PAID`).
  - Principal $P$ returned intact on maturity date.

### 3.4 Savings Accounts (Gullak / Daily & Regular Savings)
- **Interest Rate**: 4.0% p.a. calculated on minimum monthly balance and credited quarterly.
- **Passbook Ledger**:
  - Continuous running balance with strict audit verification.
  - Transaction types: `DEPOSIT_CASH`, `DEPOSIT_TRANSFER`, `WITHDRAWAL_CASH`, `WITHDRAWAL_TRANSFER`, `INTEREST_CREDIT`, `FEE_DEBIT`.
- **Field Agent Pigmy Collection**:
  - Daily collection agents visit member shops/homes, accept cash, issue instant digital receipt, and sync to the branch daybook.

### 3.5 Loans Against Deposits (LAD)
- **Eligible Collateral**: Active FDs, RDs, or MIS deposits.
- **Loan-to-Value (LTV)**: Up to 80% - 85% of accumulated deposit value.
- **Interest Spread**: Deposit ROI + 2.0% p.a.
- **Lien Marking**: Collateral deposit is flagged `lien_marked = 1` preventing withdrawal until loan is settled.

### 3.6 Gold Loans Desk
- **Collateral Assessment**:
  - Gross Weight (grams) - Stone / Impurity Weight = Net Gold Weight.
  - Karat Purity: 18K / 20K / 22K / 24K valuation based on daily market bullion rate.
  - LTV: Maximum 75% of appraised gold value (RBI/NBFC regulatory ceiling).
- **Disbursement Voucher**: System records appraiser name, pouch seal number, ornament description, photos, and cash/bank voucher reference.

### 3.7 Udhar / Hand Loans (Borrowings Desk)
- Tracking borrowings from local high-net-worth lenders or institutional partners.
- Inflow registered in Day Book under `BORROWING_RECEIVED`.
- Repayments registered under `BORROWING_REPAYMENT`.

---

## 📒 PART 4: CASH ACCOUNTING & DAY BOOK RULES

### 4.1 Strict Double-Entry Cash Accounting
Every transaction impacting cash must create an immutable entry in `day_book_cash_entries`:
- **INFLOW Categories**:
  - `FD_BOOKING` (New FD created in cash)
  - `RD_INSTALLMENT` (RD installment collected)
  - `SAVINGS_DEPOSIT` (Cash added to savings)
  - `LOAN_REPAYMENT` (Principal/interest received)
  - `BORROWING_RECEIVED` (Hand loan inflow)
- **OUTFLOW Categories**:
  - `FD_MATURITY_PAYOUT` / `PREMATURE_PAYOUT`
  - `MIS_PAYOUT` (Monthly interest paid in cash)
  - `SAVINGS_WITHDRAWAL` (Cash handed to member)
  - `GOLD_LOAN_DISBURSEMENT` / `LOAN_DISBURSEMENT`
  - `BORROWING_REPAYMENT`
  - `OFFICE_EXPENSE` (Rent, tea, stationery, salaries)

### 4.2 Cash Drawer Balancing
$$\text{Closing Cash in Hand} = \text{Opening Balance} + \sum \text{INFLOWS} - \sum \text{OUTFLOWS}$$
- Must be tracked per branch independently.
- Negative cash balance alert: System prevents cash outflow transactions if the branch drawer balance is insufficient.

---

## 👥 PART 5: MEMBER & KYC 360° SPECIFICATION

### 5.1 Member Master Data Model
- **Member / Customer Identifier**: Auto-generated sequential code (e.g., `M00001`, `CUST-1006`).
- **Core Attributes**:
  - Full Name, Father/Husband Name, Date of Birth, Gender.
  - Branch Association (`MAIN BRANCH` or `TARPL SAVING`).
  - Mobile Number (10 digits, validated), Email address.
  - Identity Documents: PAN Card number, Aadhaar number (12 digits, masked in public view `XXXX-XXXX-1234`).
  - Residential Address, City, State, Pincode.
  - Bank Details: Bank Name, Account Number, IFSC Code.
  - Nominee Details: Nominee Name, Relationship, Nominee Age/DOB.
  - Senior Citizen Flag (`is_senior_citizen = 1` if Age ≥ 60).
  - App Access Flag (`app_access_enabled = 1` or `0`).
  - Login Credentials (`login_id`, `login_password` / hash).

### 5.2 Simultaneous Account Onboarding
When creating a member in the CRM, the user has checkboxes to immediately:
1. Open a **Savings Account** (default ₹500 initial deposit).
2. Book an inaugural **Fixed Deposit** (specifying Amount, Tenure, Rate) in one single atomic transaction.

### 5.3 360° Passbook & Portfolio Viewer
Clicking any customer opens their complete financial statement:
- Total Active Balance across all products.
- Active Deposit Certificates with 1-click PDF download.
- Full Passbook ledger with date, transaction ref, debit, credit, and running balance.
- 1-Click WhatsApp credential dispatch.

---

## 📢 PART 6: WHATSAPP BROADCAST & SPECIAL OFFERS ENGINE

### 6.1 Purpose & Capabilities
Allows management to send rate hikes, festive deposit schemes, and special offers to all members or filtered segments via WhatsApp without recurring third-party API costs:
- **Audience Filtering**:
  - `👥 सभी ग्राहक (All Members)`: Targets 100% of registered customers.
  - `🎖️ वरिष्ठ नागरिक (Senior Citizens Only)`: Automatically filters members where `is_senior_citizen = 1`.
- **Dynamic Offer Parameters**:
  - Scheme Name (e.g., *विशेष सावधि जमा योजना - Special High-Return FD*).
  - ROI % (e.g., `11.00%`).
  - Tenure (e.g., `36 माह (3 Years)`).
  - Minimum Deposit (e.g., `₹50,000`).
- **Live Preview Box**:
  - Generates Hindi/English greeting personalized with member name:
    > "प्रिय ग्राहक [Client Name] जी,
    > सादर प्रणाम। तरंगंजलि प्राइवेट लिमिटेड (TARPL) की ओर से विशेष ऑफर!
    > योजना: विशेष सावधि जमा योजना
    > ब्याज दर: 11.00% p.a.
    > अवधि: 36 माह
    > संपर्क: +91 98974 63367"
- **1-Click Dispatch Queue**:
  - Displays each customer with Phone, Member ID, and a green **`Send WhatsApp`** button.
  - Clicking opens `https://wa.me/91[PHONE]?text=[ENCODED_MESSAGE]`.
  - Turns button into `Sent ✓` with persistent session state.
  - Includes **`Copy All`** and **`Copy Text`** buttons for multi-channel broadcasts.

---

## 🔒 PART 7: MULTI-ROLE SECURITY & AUDIT GOVERNANCE

### 7.1 Role-Based Access Control (RBAC)
- **`admin` (Super Administrator)**: Full root control, user creation, branch master management, password resets, database audit logs.
- **`staff_maker` (Operator / Maker)**: Customer KYC creation, booking FDs/RDs/MIS, daily voucher data entry.
- **`staff_checker` (Manager / Checker)**: Maker-checker verification, approving deposit premature withdrawals, approving loan disbursements.
- **`accountant`**: Daybook reconciliation, balance sheet adjustments, expense entry.
- **`customer` (Mobile App Login)**: Read-only access to own deposits, savings ledger, interest statements, and digital certificates.

### 7.2 Automated Continuous Simulation & Verification Daemon
- Running script: `scripts/overnight_crm_simulation.js`.
- Continuously executes 11 critical assertion cycles:
  1. Super Admin Authentication.
  2. Maker Customer KYC Registration.
  3. Maker FD Booking.
  4. Maker RD Booking & Schedule Generation.
  5. Maker MIS Booking & Payout Calendar.
  6. Checker Approval Workflow.
  7. Accountant Day Book Cash Verification.
  8. Branch Cash Inflow/Outflow Balance Consistency.
  9. Customer Mobile Portal Authentication.
  10. Passbook Ledger Statement Integrity.
  11. Automatic Transaction Cleanup (Zero Database Pollution).

---

## 🛠️ PART 8: COMPLETE RECORD OF FIXES & ENHANCEMENTS APPLIED

If restoring, updating, or maintaining this system, the following critical issues were diagnosed and definitively resolved:

1. **Database Ghost Customer Cleanup**:
   - *Issue*: Background stress-test scripts created 1,997 dummy records (`Customer Mobile App Logins: 2007`).
   - *Fix*: Safely purged all dummy test rows (`full_name LIKE '%Cycle%'` or `Perm Customer`), leaving exactly **10 verified, authentic members** with pristine IDs.
2. **Settings Staff Display Bug**:
   - *Issue*: `Settings.jsx` failed to render admin/staff users because of mismatch between backend key `users` vs `staff`.
   - *Fix*: Standardized `app/server/routes/users.js` to return `{ success: true, staff, users: staff, customers }` and updated `Settings.jsx` to read `res.staff || res.users`. Admin user now renders with working password reset.
3. **Four-Branch to Two-Branch Realignment**:
   - *Issue*: UI dropdowns and customer records had deactivated branches (`SHEKHUPURA BRANCH` and `TARPL0002`).
   - *Fix*:
     - Database: Migrated all customers to either `MAIN BRANCH` (`BHR001`) or `TARPL SAVING` (`BRH003`).
     - Frontend: Replaced 4-branch hardcoded `<option>` elements in `Customers.jsx`, `DayBook.jsx`, `PaymentsToCollect.jsx`, and `BranchManagement.jsx` with strictly the **2 active branches**.
4. **WhatsApp Broadcast Feature Implementation**:
   - *Issue*: Management needed a way to send rate changes and offers to all customers at once without technical jargon.
   - *Fix*: Created the `📢 Broadcast Offer` modal in `Customers.jsx` with real-time preview, audience selector, copy options, and 1-click `Send WhatsApp` buttons per recipient.
5. **Zero-Pollution Simulation Daemon**:
   - *Issue*: Previous verification script polluted database with test entries.
   - *Fix*: Replaced with `scripts/overnight_crm_simulation.js` which performs full atomic rollbacks/deletions at the end of each test cycle, ensuring continuous verification without database bloat.

---

## 🚀 PART 9: INSTRUCTIONS FOR FUTURE DEVELOPERS & AGENTS

When executing tasks or answering questions about this system:
1. **Never refer to code files or line numbers to non-technical users**. Direct them using visual UI landmarks (e.g., "Left Sidebar ➔ Customers & KYC 360", "Top Right Green Button ➔ Broadcast Offer").
2. **Preserve the Two Active Branches Constraint**. Never re-add or re-enable `SHEKHUPURA` or `TARPL0002` unless explicitly instructed with a government regulatory license.
3. **Protect Day Book Integrity**. Every financial operation that moves money must have a matching entry in `day_book_cash_entries`.
4. **Senior Citizen Rate Guarantee**. Always verify if `is_senior_citizen === 1` and apply the preferential rate tier automatically.
5. **Database Maintenance**: When testing or verifying, ensure all test records are wiped in `finally` blocks so customer count remains authentic.
