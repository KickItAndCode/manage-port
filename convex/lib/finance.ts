/**
 * One definition of what a property earns.
 *
 * "Net income" meant two different things. The dashboard computed
 * rent − utilities − mortgage − capex; the property page computed
 * rent − mortgage − capex and carried a comment explaining that utilities were
 * tracked in the bills section instead. So on an account with utility bills the
 * portfolio figure disagreed with the sum of its own properties, and nothing on
 * either screen said which to believe.
 *
 * Utilities are in. For this app's core case — a landlord who pays the utility
 * company and recharges tenants a share — the bill is a real monthly cost, and
 * a net income that ignores it flatters every property that has one. That was
 * the dashboard's existing behaviour, so unifying on it changes the property
 * page rather than quietly restating the portfolio.
 *
 * Known limitation, deliberately not fixed here: utilities are counted gross.
 * Where tenants are recharged, the owner ultimately bears less than the full
 * bill, so this understates net income by the reimbursed share. Correcting it
 * means aggregating owner portions across bills, which the app does not yet do
 * at the property level — it computes them per bill in getBillSplitPreview.
 * Doing it symmetrically (count the reimbursement as income, or the bill net of
 * it, but never one without the other) is the follow-up.
 *
 * Shared by both runtimes, like leaseStatus, money and investment.
 */

export interface NetIncomeInputs {
  monthlyRent: number;
  monthlyUtilities: number;
  monthlyMortgage: number;
  monthlyCapEx: number;
}

/** What the owner keeps each month, after everything they pay. */
export function monthlyNetIncome(inputs: NetIncomeInputs): number {
  return (
    inputs.monthlyRent -
    inputs.monthlyUtilities -
    inputs.monthlyMortgage -
    inputs.monthlyCapEx
  );
}

/**
 * What the property earns before financing.
 *
 * The mortgage is excluded on purpose: a cap rate built on this has to describe
 * the building, not the loan, or two owners of identical properties would see
 * different figures purely because one borrowed more. CapEx stays in — it is an
 * operating reserve against the roof, not a financing choice.
 */
export function monthlyNetOperatingIncome(inputs: NetIncomeInputs): number {
  return inputs.monthlyRent - inputs.monthlyUtilities - inputs.monthlyCapEx;
}

/**
 * Average monthly cost of a set of bills across a window of months.
 *
 * Divides by the window, not the number of bills: four bills across three
 * months is a monthly cost of their total over three. Dividing by the count
 * would report the average bill and label it the monthly cost, which is the
 * same figure only by coincidence.
 */
export function averageMonthlyCost(
  bills: Array<{ totalAmount: number }>,
  months: number
): number {
  if (bills.length === 0 || months <= 0) return 0;
  const total = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  return total / months;
}
