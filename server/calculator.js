// FD Calculation engine supporting all Indian banking & NBFC compounding/payout modes

function calculateFD({
  principal,
  annualRate,
  tenureMonths = 12,
  tenureDays = 0,
  compoundingFrequency = 'quarterly', // 'quarterly', 'monthly', 'half_yearly', 'yearly', 'simple', 'payout_monthly', 'payout_quarterly', 'payout_half_yearly', 'payout_annual'
  startDate = new Date().toISOString().split('T')[0],
  isSeniorCitizen = false,
  seniorBonus = 0.5
}) {
  const P = parseFloat(principal) || 0;
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (parseFloat(seniorBonus) || 0.5);
  }

  const months = parseInt(tenureMonths) || 0;
  const days = parseInt(tenureDays) || 0;
  const tenureYears = days === 0 ? (months / 12) : ((months / 12) + (days / 365));

  const start = new Date(startDate);
  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + months);
  maturityDateObj.setDate(maturityDateObj.getDate() + days);
  const maturityDate = maturityDateObj.toISOString().split('T')[0];

  let maturityAmount = 0;
  let totalInterest = 0;
  let periodicPayout = 0;
  let isCumulative = true;
  let schedule = [];

  const r = effectiveRate / 100;

  switch (compoundingFrequency) {
    case 'quarterly': // Indian Banking Standard for Cumulative FDs
      isCumulative = true;
      // Formula: A = P * (1 + r/4)^(4 * t)
      maturityAmount = P * Math.pow(1 + (r / 4), 4 * tenureYears);
      totalInterest = maturityAmount - P;
      break;

    case 'monthly':
      isCumulative = true;
      maturityAmount = P * Math.pow(1 + (r / 12), 12 * tenureYears);
      totalInterest = maturityAmount - P;
      break;

    case 'half_yearly':
      isCumulative = true;
      maturityAmount = P * Math.pow(1 + (r / 2), 2 * tenureYears);
      totalInterest = maturityAmount - P;
      break;

    case 'yearly':
      isCumulative = true;
      maturityAmount = P * Math.pow(1 + r, tenureYears);
      totalInterest = maturityAmount - P;
      break;

    case 'simple':
      isCumulative = true;
      totalInterest = P * r * tenureYears;
      maturityAmount = P + totalInterest;
      break;

    case 'payout_monthly':
      isCumulative = false;
      // Monthly interest payout (simple per month)
      periodicPayout = (P * r) / 12;
      totalInterest = periodicPayout * months;
      maturityAmount = P; // Principal returned at maturity
      break;

    case 'payout_quarterly':
      isCumulative = false;
      const quarters = months / 3;
      periodicPayout = (P * r) / 4;
      totalInterest = periodicPayout * quarters;
      maturityAmount = P;
      break;

    case 'payout_half_yearly':
      isCumulative = false;
      const halfYears = months / 6;
      periodicPayout = (P * r) / 2;
      totalInterest = periodicPayout * halfYears;
      maturityAmount = P;
      break;

    case 'payout_annual':
      isCumulative = false;
      periodicPayout = P * r;
      totalInterest = periodicPayout * (months / 12);
      maturityAmount = P;
      break;

    default:
      // Default to quarterly compounding
      isCumulative = true;
      maturityAmount = P * Math.pow(1 + (r / 4), 4 * tenureYears);
      totalInterest = maturityAmount - P;
      break;
  }

  // Generate Schedule Breakdown
  schedule = generateSchedule({
    principal: P,
    annualRate: effectiveRate,
    startDate,
    months,
    compoundingFrequency,
    isCumulative,
    periodicPayout,
    maturityAmount
  });

  return {
    principal: Math.round(P * 100) / 100,
    annualRate: effectiveRate,
    tenureMonths: months,
    tenureDays: days,
    startDate,
    maturityDate,
    compoundingFrequency,
    isCumulative,
    totalInterest: Math.round(totalInterest * 100) / 100,
    maturityAmount: Math.round(maturityAmount * 100) / 100,
    periodicPayout: Math.round(periodicPayout * 100) / 100,
    schedule
  };
}

function generateSchedule({
  principal,
  annualRate,
  startDate,
  months,
  compoundingFrequency,
  isCumulative,
  periodicPayout,
  maturityAmount
}) {
  const schedule = [];
  const start = new Date(startDate);
  const r = annualRate / 100;

  if (!isCumulative) {
    let intervalMonths = 1;
    if (compoundingFrequency === 'payout_quarterly') intervalMonths = 3;
    if (compoundingFrequency === 'payout_half_yearly') intervalMonths = 6;
    if (compoundingFrequency === 'payout_annual') intervalMonths = 12;

    const totalPeriods = Math.floor(months / intervalMonths);
    let cumulativeInterest = 0;

    for (let i = 1; i <= totalPeriods; i++) {
      const pDate = new Date(start);
      pDate.setMonth(pDate.getMonth() + (i * intervalMonths));
      cumulativeInterest += periodicPayout;

      schedule.push({
        periodNo: i,
        payoutDate: pDate.toISOString().split('T')[0],
        payoutAmount: Math.round(periodicPayout * 100) / 100,
        interestAccrued: Math.round(periodicPayout * 100) / 100,
        cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
        balance: Math.round(principal * 100) / 100,
        type: (i === totalPeriods) ? 'Interest Payout + Principal Due' : 'Periodic Interest Payout'
      });
    }
  } else {
    // Cumulative breakdown (Quarterly or Monthly milestone tracker)
    const breakdownInterval = (compoundingFrequency === 'monthly') ? 1 : 3;
    const totalSteps = Math.max(1, Math.floor(months / breakdownInterval));
    let runningBalance = principal;
    let cumInterest = 0;

    for (let i = 1; i <= totalSteps; i++) {
      const pDate = new Date(start);
      pDate.setMonth(pDate.getMonth() + (i * breakdownInterval));
      
      const t = (i * breakdownInterval) / 12;
      let balAtStep = 0;
      if (compoundingFrequency === 'monthly') {
        balAtStep = principal * Math.pow(1 + (r / 12), 12 * t);
      } else if (compoundingFrequency === 'quarterly') {
        balAtStep = principal * Math.pow(1 + (r / 4), 4 * t);
      } else if (compoundingFrequency === 'simple') {
        balAtStep = principal + (principal * r * t);
      } else {
        balAtStep = principal * Math.pow(1 + r, t);
      }

      const accruedInPeriod = balAtStep - runningBalance;
      cumInterest = balAtStep - principal;
      runningBalance = balAtStep;

      schedule.push({
        periodNo: i,
        payoutDate: pDate.toISOString().split('T')[0],
        payoutAmount: 0,
        interestAccrued: Math.round(accruedInPeriod * 100) / 100,
        cumulativeInterest: Math.round(cumInterest * 100) / 100,
        balance: Math.round(balAtStep * 100) / 100,
        type: (i === totalSteps) ? 'Maturity Compounded' : 'Compounding Milestone'
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
  withdrawalDate = new Date().toISOString().split('T')[0],
  penaltyRate = 1.0, // Typically 1% reduction in interest rate
  alreadyPaidInterest = 0
}) {
  const start = new Date(startDate);
  const end = new Date(withdrawalDate);
  const diffDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  const diffYears = diffDays / 365;

  const adjustedRate = Math.max(0, annualRate - penaltyRate);
  const eligibleInterest = principal * (adjustedRate / 100) * diffYears;
  const netPayable = principal + eligibleInterest - alreadyPaidInterest;

  return {
    principal,
    originalRate: annualRate,
    penaltyRate,
    adjustedRate,
    daysCompleted: diffDays,
    eligibleInterest: Math.round(eligibleInterest * 100) / 100,
    alreadyPaidInterest: Math.round(alreadyPaidInterest * 100) / 100,
    netPayable: Math.round(netPayable * 100) / 100,
    withdrawalDate
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
  startDate = new Date().toISOString().split('T')[0],
  isSeniorCitizen = false,
  seniorBonus = 0.5,
  lateFeePerHundred = 1.50
}) {
  const P = parseFloat(installmentAmount) || 0;
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (parseFloat(seniorBonus) || 0.5);
  }
  const n = parseInt(tenureMonths) || 12;
  const r = effectiveRate / 100;
  const start = new Date(startDate);

  let maturityAmount = 0;
  const schedule = [];

  for (let i = 1; i <= n; i++) {
    const monthsRemaining = n - i + 1;
    const quarters = monthsRemaining / 3;
    const maturityComponent = P * Math.pow(1 + (r / 4), quarters);
    maturityAmount += maturityComponent;

    const dDate = new Date(start);
    dDate.setMonth(dDate.getMonth() + (i - 1));
    const dueDate = dDate.toISOString().split('T')[0];

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

  const totalPrincipal = P * n;
  maturityAmount = Math.round(maturityAmount * 100) / 100;
  const totalInterest = Math.round((maturityAmount - totalPrincipal) * 100) / 100;

  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + n);
  const maturityDate = maturityDateObj.toISOString().split('T')[0];

  return {
    monthlyInstallment: P,
    annualRate: effectiveRate,
    tenureMonths: n,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalInterest,
    maturityAmount,
    startDate,
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
  closedDate = new Date().toISOString().split('T')[0],
  penaltyRate = 1.0
}) {
  const P = parseFloat(monthlyInstallment) || 0;
  const k = parseInt(installmentsPaid) || 1;
  const baseRate = Math.max(0, parseFloat(annualRate) - parseFloat(penaltyRate));
  const r = baseRate / 100;
  
  const totalPrincipal = P * k;
  let accumulated = 0;
  for (let i = 1; i <= k; i++) {
    const months = k - i + 1;
    const quarters = months / 3;
    accumulated += P * Math.pow(1 + (r / 4), quarters);
  }
  const interestEarned = Math.max(0, accumulated - totalPrincipal);
  const netSettlement = totalPrincipal + interestEarned;

  return {
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    installmentsPaid: k,
    originalRate: annualRate,
    adjustedRate: baseRate,
    penaltyRate,
    interestEarned: Math.round(interestEarned * 100) / 100,
    netSettlement: Math.round(netSettlement * 100) / 100,
    closedDate
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
  startDate = new Date().toISOString().split('T')[0],
  isSeniorCitizen = false,
  seniorBonus = 0.5
}) {
  const P = parseFloat(depositAmount) || 0;
  let effectiveRate = parseFloat(annualRate) || 0;
  if (isSeniorCitizen) {
    effectiveRate += (parseFloat(seniorBonus) || 0.5);
  }
  const n = parseInt(tenureMonths) || 60;
  const r = effectiveRate / 100;
  const start = new Date(startDate);

  const monthlyPayout = Math.round(((P * r) / 12) * 100) / 100;
  const totalPayoutAmount = Math.round((monthlyPayout * n) * 100) / 100;
  const maturityAmount = P;

  const maturityDateObj = new Date(start);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + n);
  const maturityDate = maturityDateObj.toISOString().split('T')[0];

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
    startDate,
    maturityDate,
    schedule
  };
}

function calculateMISPrematureClosure({
  depositAmount,
  startDate,
  closedDate = new Date().toISOString().split('T')[0],
  totalPayoutsReceived = 0
}) {
  const P = parseFloat(depositAmount) || 0;
  const start = new Date(startDate);
  const end = new Date(closedDate);
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
    closedDate
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
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}

module.exports = {
  calculateFD,
  calculatePrematureWithdrawal,
  calculateRD,
  calculateRDPrematureClosure,
  calculateMIS,
  calculateMISPrematureClosure,
  calculateSavingsInterest
};
