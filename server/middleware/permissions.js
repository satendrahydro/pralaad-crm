const db = require('../db');

// The 16 Granular Function Controls across 3 Categories
const PERMISSIONS_CATALOG = {
  // 1. CUSTOMER MANAGEMENT
  cust_registration: {
    key: 'cust_registration',
    label: 'Customer Registration',
    category: 'CUSTOMER MANAGEMENT',
    description: 'Allows staff to register new customer profiles in the CRM'
  },
  cust_edit: {
    key: 'cust_edit',
    label: 'Customer Profile Editing',
    category: 'CUSTOMER MANAGEMENT',
    description: 'Allows staff to update customer contact, address, and profile details'
  },
  cust_kyc: {
    key: 'cust_kyc',
    label: 'KYC Management',
    category: 'CUSTOMER MANAGEMENT',
    description: 'Allows staff to verify and update KYC documentation status'
  },
  cust_doc_upload: {
    key: 'cust_doc_upload',
    label: 'Document Upload',
    category: 'CUSTOMER MANAGEMENT',
    description: 'Allows staff to upload Aadhaar, PAN, and identity proofs'
  },
  cust_search: {
    key: 'cust_search',
    label: 'Customer Search',
    category: 'CUSTOMER MANAGEMENT',
    description: 'Allows staff to execute customer searches and query depositor directories'
  },

  // 2. FINANCIAL PRODUCTS
  fd_creation: {
    key: 'fd_creation',
    label: 'FD Creation',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit new Fixed Deposit proposals'
  },
  rd_creation: {
    key: 'rd_creation',
    label: 'RD Creation',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit new Recurring Deposit contract proposals'
  },
  mis_creation: {
    key: 'mis_creation',
    label: 'MIS Creation',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit Monthly Income Scheme proposals'
  },
  savings_creation: {
    key: 'savings_creation',
    label: 'Savings Account Creation',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit new Savings Account opening proposals'
  },
  savings_deposit: {
    key: 'savings_deposit',
    label: 'Deposit Entry',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to enter cash/bank deposit transactions into Savings'
  },
  savings_withdrawal: {
    key: 'savings_withdrawal',
    label: 'Withdrawal Request',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit cash/cheque withdrawal transactions'
  },
  fd_closure_request: {
    key: 'fd_closure_request',
    label: 'Maturity / Closure Request',
    category: 'FINANCIAL PRODUCTS',
    description: 'Allows staff to submit premature liquidation or maturity settlement requests'
  },

  // 3. OPERATIONS
  reports_view: {
    key: 'reports_view',
    label: 'Reports Viewing',
    category: 'OPERATIONS',
    description: 'Allows staff to view consolidated portfolio and analytics reports'
  },
  csv_export: {
    key: 'csv_export',
    label: 'CSV Export',
    category: 'OPERATIONS',
    description: 'Allows staff to export tables and customer reports to CSV'
  },
  receipt_print: {
    key: 'receipt_print',
    label: 'Receipt Printing',
    category: 'OPERATIONS',
    description: 'Allows staff to view and print official deposit payment receipts'
  },
  cert_print: {
    key: 'cert_print',
    label: 'Certificate Printing',
    category: 'OPERATIONS',
    description: 'Allows staff to generate and print digital FD certificates'
  }
};

// Default permissions for staff (all 16 functions enabled by default)
const DEFAULT_STAFF_PERMISSIONS = {
  cust_registration: true,
  cust_edit: true,
  cust_kyc: true,
  cust_doc_upload: true,
  cust_search: true,
  fd_creation: true,
  rd_creation: true,
  mis_creation: true,
  savings_creation: true,
  savings_deposit: true,
  savings_withdrawal: true,
  fd_closure_request: true,
  reports_view: true,
  csv_export: true,
  receipt_print: true,
  cert_print: true
};

/**
 * Helper to fetch live active permissions for a user from SQLite database.
 * If user is Super Admin, all permissions are unconditionally true.
 * If user is Staff, merges configured JSON with defaults.
 */
function getUserPermissions(userId) {
  const user = db.prepare('SELECT id, role, permissions, is_active FROM users WHERE id = ?').get(userId);
  if (!user) return null;

  // Super Admin always has 100% permissions
  if (user.role === 'admin') {
    const adminPerms = {};
    for (const key of Object.keys(PERMISSIONS_CATALOG)) {
      adminPerms[key] = true;
    }
    return adminPerms;
  }

  // Parse permissions from DB column
  let userPerms = {};
  if (user.permissions) {
    try {
      userPerms = JSON.parse(user.permissions);
    } catch (e) {
      userPerms = {};
    }
  }

  // Merge with defaults so every key is strictly boolean
  const resolved = {};
  for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
    resolved[key] = (userPerms[key] !== undefined) ? Boolean(userPerms[key]) : DEFAULT_STAFF_PERMISSIONS[key];
  }
  return resolved;
}

/**
 * Express Middleware: Enforces that the requesting user has the specified permission.
 * Reads live permissions from database synchronously on every request.
 * Changes by Super Admin take effect INSTANTLY without logout.
 */
function requirePermission(permKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required. No session user found.' });
    }

    // Super Admin retains full control over all functions
    if (req.user.role === 'admin') {
      return next();
    }

    // Live permission check directly from database
    const permissions = getUserPermissions(req.user.id);
    if (!permissions) {
      return res.status(403).json({ success: false, message: 'User account not found or deactivated.' });
    }

    if (permissions[permKey] === false) {
      const meta = PERMISSIONS_CATALOG[permKey] || { label: permKey };
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        permission: permKey,
        permissionLabel: meta.label,
        message: `Access denied. Super Admin has disabled the '${meta.label}' function for your staff account.`
      });
    }

    next();
  };
}

module.exports = {
  PERMISSIONS_CATALOG,
  DEFAULT_STAFF_PERMISSIONS,
  getUserPermissions,
  requirePermission
};
