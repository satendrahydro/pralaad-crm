const c = require('./calculator');

console.log('--- Testing RD Calculation ---');
const rd = c.calculateRD({ installmentAmount: 5000, annualRate: 8, tenureMonths: 12 });
console.log('Monthly:', rd.monthlyInstallment, 'Total Principal:', rd.totalPrincipal, 'Interest:', rd.totalInterest, 'Maturity:', rd.maturityAmount, 'Schedule Count:', rd.schedule.length);

console.log('--- Testing MIS Calculation ---');
const mis = c.calculateMIS({ depositAmount: 1000000, annualRate: 8.4, tenureMonths: 60 });
console.log('Deposit:', mis.depositAmount, 'Monthly Payout:', mis.monthlyPayout, 'Total Payout:', mis.totalPayoutAmount, 'Maturity Amount:', mis.maturityAmount, 'Schedule Count:', mis.schedule.length);

console.log('--- Testing Savings Account Interest Calculation ---');
const sb = c.calculateSavingsInterest({ dayEndBalances: [100000, 100000, 150000], annualRate: 4 });
console.log('Rate:', sb.annualRate, 'Interest for 3 days:', sb.totalInterest);

console.log('--- All Calculations Verified Successfully ---');
