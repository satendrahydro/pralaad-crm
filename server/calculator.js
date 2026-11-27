// FD Calculation engine supporting all Indian banking & NBFC compounding/payout modes

function toValidDate(dateVal) {
  if (!dateVal) return new Date();
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toISODateString(dateObj) {
  return toValidDate(dateObj).toISOString().split('T')[0];
}

function round2(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return 0;
  return Math.round((num + Math.sign(num) * 1e-9) * 100) / 100;
}

const COMPOUNDING_ALIASES = {
  cumulative_quarterly: 'quarterly',
  cumulative_monthly: 'monthly',
  cumulative_half_yearly: 'half_yearly',
  cumulative_yearly: 'yearly',
  cumulative_annual: 'yearly',
  annual: 'yearly'
};

function normalizeCompoundingFrequency(freq) {
  const raw = String(freq || 'quarterly').trim().toLowerCase();
  return COMPOUNDING_ALIASES[raw] || raw;
}

function calculateFD({
  principal,
  annualRate,
  tenureMonths = 12,
  tenureDays = 0,
  compoundingFrequency = 'quarterly', // 'quarterly', 'monthly', 'half_yearly', 'yearly', 'simple', 'payout_monthly', 'payout_quarterly', 'payout_half_yearly', 'payout_annual'
  startDate = toISODateString(),
  isSeniorCitizen = false,
  seniorBonus = 0.5
}) {
  const P = round2(parseFloat(principal) || 0);
  const parsedBonus = parseFloat(seniorBonus);
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (Number.isFinite(parsedBonus) ? parsedBonus : 0.5);
  }
  effectiveRate = Math.round((effectiveRate + Number.EPSILON) * 10000) / 10000;

  const months = Math.max(0, parseInt(tenureMonths, 10) || 0);
  const days = Math.max(0, parseInt(tenureDays, 10) || 0);
  const tenureYears = days === 0 ? (months / 12) : ((months / 12) + (days / 365));

  const normalizedFreq = normalizeCompoundingFrequency(compoundingFrequency);

  const start = toValidDate(startDate);
  const safeStartDate = toISODateString(start);
  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + months);
  maturityDateObj.setDate(maturityDateObj.getDate() + days);
  const maturityDate = toISODateString(maturityDateObj);

  let rawMaturityAmount = P;
  let rawTotalInterest = 0;
  let periodicPayout = 0;
  let isCumulative = true;

  const r = effectiveRate / 100;

  switch (normalizedFreq) {
    case 'quarterly': // Indian Banking Standard for Cumulative FDs
      isCumulative = true;
      // Formula: A = P * (1 + r/4)^(4 * t)
      rawMaturityAmount = P * Math.pow(1 + (r / 4), 4 * tenureYears);
      rawTotalInterest = rawMaturityAmount - P;
      break;

    case 'monthly':
      isCumulative = true;
      rawMaturityAmount = P * Math.pow(1 + (r / 12), 12 * tenureYears);
      rawTotalInterest = rawMaturityAmount - P;
      break;

    case 'half_yearly':
      isCumulative = true;
      rawMaturityAmount = P * Math.pow(1 + (r / 2), 2 * tenureYears);
      rawTotalInterest = rawMaturityAmount - P;
      break;

    case 'yearly':
      isCumulative = true;
      rawMaturityAmount = P * Math.pow(1 + r, tenureYears);
      rawTotalInterest = rawMaturityAmount - P;
      break;

    case 'simple':
      isCumulative = true;
      rawTotalInterest = P * r * tenureYears;
      rawMaturityAmount = P + rawTotalInterest;
      break;

    case 'payout_monthly':
      isCumulative = false;
      periodicPayout = (P * r) / 12;
      rawTotalInterest = P * r * tenureYears;
      rawMaturityAmount = P; // Principal returned at maturity
      break;

    case 'payout_quarterly':
      isCumulative = false;
      periodicPayout = (P * r) / 4;
      rawTotalInterest = P * r * tenureYears;
      rawMaturityAmount = P;
      break;

    case 'payout_half_yearly':
      isCumulative = false;
      periodicPayout = (P * r) / 2;
      rawTotalInterest = P * r * tenureYears;
      rawMaturityAmount = P;
      break;

    case 'payout_annual':
      isCumulative = false;
      periodicPayout = P * r;
      rawTotalInterest = P * r * tenureYears;
      rawMaturityAmount = P;
      break;

    default:
      // Default to quarterly compounding
      isCumulative = true;
      rawMaturityAmount = P * Math.pow(1 + (r / 4), 4 * tenureYears);
      rawTotalInterest = rawMaturityAmount - P;
      break;
  }

  const maturityAmount = round2(rawMaturityAmount);
  const totalInterest = isCumulative
    ? Math.max(0, round2(maturityAmount - P))
    : round2(rawTotalInterest);
  const roundedPeriodicPayout = isCumulative ? 0 : round2(periodicPayout);

  // Generate Schedule Breakdown reconciled to exact maturity & interest paise
  const schedule = generateSchedule({
    principal: P,
    annualRate: effectiveRate,
    startDate: safeStartDate,
    maturityDate,
    months,
    days,
    compoundingFrequency: normalizedFreq,
    isCumulative,
    periodicPayout: roundedPeriodicPayout,
    totalInterest,
    maturityAmount
  });

  return {
    principal: P,
    annualRate: effectiveRate,
    tenureMonths: months,
    tenureDays: days,
    startDate: safeStartDate,
    maturityDate,
    compoundingFrequency: normalizedFreq,
    isCumulative,
    totalInterest,
    maturityAmount,
    periodicPayout: roundedPeriodicPayout,
    schedule
  };
}

function generateSchedule({
  principal,
  annualRate,
  startDate,
  maturityDate,
  months,
  days = 0,
  compoundingFrequency,
  isCumulative,
  periodicPayout,
  totalInterest,
  maturityAmount
}) {
  const schedule = [];
  const start = toValidDate(startDate);
  const r = annualRate / 100;

  if (!isCumulative) {
    let intervalMonths = 1;
    if (compoundingFrequency === 'payout_quarterly') intervalMonths = 3;
    if (compoundingFrequency === 'payout_half_yearly') intervalMonths = 6;
    if (compoundingFrequency === 'payout_annual') intervalMonths = 12;

    const fullPeriods = Math.floor(months / intervalMonths);
    const hasRemainder = (months % intervalMonths) !== 0 || days > 0;
    let cumulativeInterest = 0;

    for (let i = 1; i <= fullPeriods; i++) {
      const pDate = new Date(start);
      pDate.setMonth(pDate.getMonth() + (i * intervalMonths));
      const isFinalRow = !hasRemainder && (i === fullPeriods);
      // Adjust any 1-2 paise rounding drift on the final maturity payout row
      const payoutForRow = isFinalRow
        ? Math.max(0, round2(totalInterest - cumulativeInterest))
        : periodicPayout;
      cumulativeInterest = round2(cumulativeInterest + payoutForRow);

      schedule.push({
        periodNo: i,
        payoutDate: isFinalRow ? maturityDate : toISODateString(pDate),
        payoutAmount: payoutForRow,
        interestAccrued: payoutForRow,
        cumulativeInterest,
        balance: principal,
        type: isFinalRow ? 'Interest Payout + Principal Due' : 'Periodic Interest Payout'
      });
    }

    if (hasRemainder || fullPeriods === 0) {
      const stubInterest = Math.max(0, round2(totalInterest - cumulativeInterest));
      cumulativeInterest = round2(cumulativeInterest + stubInterest);
      schedule.push({
        periodNo: fullPeriods + 1,
        payoutDate: maturityDate,
        payoutAmount: stubInterest,
        interestAccrued: stubInterest,
        cumulativeInterest,
        balance: principal,
        type: 'Final Interest Payout + Principal Due'
      });
    }
  } else {
    const breakdownInterval = (compoundingFrequency === 'monthly')
      ? 1
      : (compoundingFrequency === 'half_yearly' && months >= 6)
        ? 6
        : (compoundingFrequency === 'yearly' && months >= 12)
          ? 12
          : 3;

    const fullSteps = Math.floor(months / breakdownInterval);
    const hasStub = (months % breakdownInterval) !== 0 || days > 0;
    let runningBalance = principal;

    const calcBalanceAtYears = (t) => {
      if (compoundingFrequency === 'monthly') return principal * Math.pow(1 + (r / 12), 12 * t);
      if (compoundingFrequency === 'quarterly') return principal * Math.pow(1 + (r / 4), 4 * t);
      if (compoundingFrequency === 'half_yearly') return principal * Math.pow(1 + (r / 2), 2 * t);
      if (compoundingFrequency === 'yearly') return principal * Math.pow(1 + r, t);
      if (compoundingFrequency === 'simple') return principal + (principal * r * t);
      return principal * Math.pow(1 + (r / 4), 4 * t);
    };

    for (let i = 1; i <= fullSteps; i++) {
      const pDate = new Date(start);
      pDate.setMonth(pDate.getMonth() + (i * breakdownInterval));
      const isFinalStep = !hasStub && (i === fullSteps);
      const t = (i * breakdownInterval) / 12;
      const stepBalance = isFinalStep ? maturityAmount : round2(calcBalanceAtYears(t));
      const accruedInPeriod = round2(stepBalance - runningBalance);
      const cumInterest = round2(stepBalance - principal);
      runningBalance = stepBalance;

      schedule.push({
        periodNo: i,
        payoutDate: isFinalStep ? maturityDate : toISODateString(pDate),
        payoutAmount: 0,
        interestAccrued: accruedInPeriod,
        cumulativeInterest: cumInterest,
        balance: stepBalance,
        type: isFinalStep ? 'Maturity Compounded' : 'Compounding Milestone'
      });
    }

    if (hasStub || fullSteps === 0) {
      const accruedStub = round2(maturityAmount - runningBalance);
      schedule.push({
        periodNo: fullSteps + 1,
        payoutDate: maturityDate,
        payoutAmount: 0,
        interestAccrued: accruedStub,
        cumulativeInterest: totalInterest,
        balance: maturityAmount,
        type: 'Maturity Compounded'
      });
    }
  }

  return schedule;
}

// Premature withdrawal calculator
function calculatePrematureWithdrawal({
  principal,
  annualRate,
  startDate,
  withdrawalDate = toISODateString(),
  penaltyRate = 1.0, // Typically 1% reduction in interest rate
  alreadyPaidInterest = 0
}) {
  const P = round2(parseFloat(principal) || 0);
  const origRate = parseFloat(annualRate) || 0;
  const parsedPenalty = parseFloat(penaltyRate);
  const safePenalty = Number.isFinite(parsedPenalty) ? Math.max(0, parsedPenalty) : 1.0;
  const safePaidInterest = round2(parseFloat(alreadyPaidInterest) || 0);

  const start = toValidDate(startDate);
  const end = toValidDate(withdrawalDate);
  const safeWithdrawalDate = toISODateString(end);
  const diffDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  const diffYears = diffDays / 365;

  const adjustedRate = Math.max(0, Math.round(((origRate - safePenalty) + Number.EPSILON) * 10000) / 10000);
  const eligibleInterest = round2(P * (adjustedRate / 100) * diffYears);
  const netPayable = round2(P + eligibleInterest - safePaidInterest);

  return {
    principal: P,
    originalRate: origRate,
    penaltyRate: safePenalty,
    adjustedRate,
    daysCompleted: diffDays,
    eligibleInterest,
    alreadyPaidInterest: safePaidInterest,
    netPayable,
    withdrawalDate: safeWithdrawalDate
  };
}

// -------------------------------------------------------------
// RECURRING DEPOSIT (RD) CALCULATION ENGINE
// Standard Indian Banking Quarterly Compounding Amortization
// M = P * sum( (1 + r/400)^((n - i + 1)/3) )
// -------------------------------------------------------------
function calculateRD({
  installmentAmount,
  annualRate,
  tenureMonths = 12,
  startDate = toISODateString(),
  isSeniorCitizen = false,
  seniorBonus = 0.5,
  lateFeePerHundred = 1.50
}) {
  const P = round2(parseFloat(installmentAmount) || 0);
  const parsedBonus = parseFloat(seniorBonus);
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (Number.isFinite(parsedBonus) ? parsedBonus : 0.5);
  }
  effectiveRate = Math.round((effectiveRate + Number.EPSILON) * 10000) / 10000;
  const n = Math.max(1, parseInt(tenureMonths, 10) || 12);
  const r = effectiveRate / 100;
  const start = toValidDate(startDate);
  const safeStartDate = toISODateString(start);

  let rawMaturity = 0;
  const schedule = [];

  for (let i = 1; i <= n; i++) {
    const monthsRemaining = n - i + 1;
    const quarters = monthsRemaining / 3;
    const maturityComponent = P * Math.pow(1 + (r / 4), quarters);
    rawMaturity += maturityComponent;

    const dDate = new Date(start);
    dDate.setMonth(dDate.getMonth() + (i - 1));
    const dueDate = toISODateString(dDate);

    schedule.push({
      installmentNo: i,
      dueDate,
      installmentAmount: P,
      status: 'PENDING',
      paidDate: null,
      lateFee: 0,
      totalCollected: 0
    });
  }

  const totalPrincipal = round2(P * n);
  const maturityAmount = round2(rawMaturity);
  const totalInterest = Math.max(0, round2(maturityAmount - totalPrincipal));

  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + n);
  const maturityDate = toISODateString(maturityDateObj);

  return {
    monthlyInstallment: P,
    annualRate: effectiveRate,
    tenureMonths: n,
    totalPrincipal,
    totalInterest,
    maturityAmount,
    startDate: safeStartDate,
    maturityDate,
    lateFeePerHundred,
    schedule
  };
}

function calculateRDPrematureClosure({
  monthlyInstallment,
  installmentsPaid,
  annualRate,
  startDate,
  closedDate = toISODateString(),
  penaltyRate = 1.0
}) {
  const P = round2(parseFloat(monthlyInstallment) || 0);
  const parsedPaid = parseInt(installmentsPaid, 10);
  const k = Number.isNaN(parsedPaid) ? 0 : Math.max(0, parsedPaid);
  const origRate = parseFloat(annualRate) || 0;
  const parsedPenalty = parseFloat(penaltyRate);
  const safePenalty = Number.isFinite(parsedPenalty) ? Math.max(0, parsedPenalty) : 1.0;
  const baseRate = Math.max(0, Math.round(((origRate - safePenalty) + Number.EPSILON) * 10000) / 10000);
  const r = baseRate / 100;
  const safeClosedDate = toISODateString(closedDate);

  const totalPrincipal = round2(P * k);
  let accumulated = 0;
  for (let i = 1; i <= k; i++) {
    const months = k - i + 1;
    const quarters = months / 3;
    accumulated += P * Math.pow(1 + (r / 4), quarters);
  }
  const netSettlement = round2(accumulated);
  const interestEarned = Math.max(0, round2(netSettlement - totalPrincipal));

  return {
    totalPrincipal,
    installmentsPaid: k,
    originalRate: origRate,
    adjustedRate: baseRate,
    penaltyRate: safePenalty,
    interestEarned,
    netSettlement,
    closedDate: safeClosedDate
  };
}

// -------------------------------------------------------------
// MONTHLY INCOME SCHEME (MIS) CALCULATION ENGINE
// Monthly Payout = (P * r) / 1200
// Maturity Settlement = 100% Principal Returned
// -------------------------------------------------------------
function calculateMIS({
  depositAmount,
  annualRate,
  tenureMonths = 60,
  startDate = toISODateString(),
  isSeniorCitizen = false,
  seniorBonus = 0.5
}) {
  const P = round2(parseFloat(depositAmount) || 0);
  const parsedBonus = parseFloat(seniorBonus);
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (Number.isFinite(parsedBonus) ? parsedBonus : 0.5);
  }
  effectiveRate = Math.round((effectiveRate + Number.EPSILON) * 10000) / 10000;
  const n = Math.max(1, parseInt(tenureMonths, 10) || 60);
  const r = effectiveRate / 100;
  const start = toValidDate(startDate);
  const safeStartDate = toISODateString(start);

  const monthlyPayout = round2((P * r) / 12);
  const totalPayoutAmount = round2(monthlyPayout * n);
  const maturityAmount = P;

  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + n);
  const maturityDate = toISODateString(maturityDateObj);

  const schedule = [];
  for (let m = 1; m <= n; m++) {
    const pDate = new Date(start);
    pDate.setMonth(pDate.getMonth() + m);
    schedule.push({
      monthNo: m,
      payoutDate: pDate.toISOString().split('T')[0],
      payoutAmount: monthlyPayout,
      tdsDeducted: 0,
      netPayable: monthlyPayout,
      status: 'PENDING',
      paidDate: null
    });
  }

  return {
    depositAmount: P,
    annualRate: effectiveRate,
    tenureMonths: n,
    monthlyPayout,
    totalPayoutAmount,
    maturityAmount,
    startDate: safeStartDate,
    maturityDate,
    schedule
  };
}

function calculateMISPrematureClosure({
  depositAmount,
  startDate,
  closedDate = toISODateString(),
  totalPayoutsReceived = 0
}) {
  const P = parseFloat(depositAmount) || 0;
  const start = toValidDate(startDate);
  const end = toValidDate(closedDate);
  const safeClosedDate = toISODateString(end);
  const elapsedMonths = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30.4167)));

  let penaltyPercent = 2.0;
  if (elapsedMonths < 12) {
    penaltyPercent = 2.0;
  } else if (elapsedMonths < 36) {
    penaltyPercent = 2.0;
  } else {
    penaltyPercent = 1.0;
  }

  const penaltyAmount = Math.round((P * (penaltyPercent / 100)) * 100) / 100;
  const netRefund = Math.round((P - penaltyAmount) * 100) / 100;

  return {
    depositAmount: P,
    elapsedMonths,
    penaltyPercent,
    penaltyAmount,
    totalPayoutsReceived: parseFloat(totalPayoutsReceived) || 0,
    netRefund,
    closedDate: safeClosedDate
  };
}

// -------------------------------------------------------------
// SAVINGS ACCOUNT (SB) DAILY PRODUCT INTEREST ENGINE
// Interest = Day-End Balance * (r / 36500)
// -------------------------------------------------------------
function calculateSavingsInterest({
  dayEndBalances = [],
  annualRate = 4.0
}) {
  const r = parseFloat(annualRate) || 4.0;
  let totalInterest = 0;

  for (const item of dayEndBalances) {
    const bal = typeof item === 'number' ? item : (item.balance || 0);
    const days = typeof item === 'number' ? 1 : (item.days || 1);
    const dailyInterest = (bal * (r / 100) * days) / 365;
    totalInterest += dailyInterest;
  }

  return {
    annualRate: r,
    totalInterest: round2(totalInterest)
  };
}

module.exports = {
  round2,
  normalizeCompoundingFrequency,
  calculateFD,
  calculatePrematureWithdrawal,
  calculateRD,
  calculateRDPrematureClosure,
  calculateMIS,
  calculateMISPrematureClosure,
  calculateSavingsInterest
};
