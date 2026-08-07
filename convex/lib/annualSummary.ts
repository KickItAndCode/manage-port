/**
 * What a property took in and paid out over a calendar year.
 *
 * The rest of the app answers "this month". A landlord's real deadline is tax
 * time, and the question then is annual and actual.
 *
 * Rent is counted month by month against the leases that were running, because
 * a property let for four months did not earn twelve months of rent. Utilities
 * are summed from the bills that exist rather than averaged — an annual figure
 * that is an estimate is no use to an accountant.
 */

export interface AnnualLease {
  startDate: string;
  endDate: string;
  rent: number;
}

export interface AnnualBill {
  billMonth: string;
  totalAmount: number;
}

export interface AnnualSummaryInput {
  year: number;
  leases: AnnualLease[];
  bills: AnnualBill[];
  monthlyMortgage: number;
  monthlyCapEx: number;
}

export interface AnnualSummary {
  year: number;
  rent: number;
  utilities: number;
  mortgage: number;
  capEx: number;
  net: number;
  /** How many of the twelve months had at least one lease running. */
  monthsOccupied: number;
}

/** The twelve YYYY-MM keys of a year, zero padded to sort as strings. */
export function monthsOfYear(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );
}

/** True when the lease was running at any point in the given YYYY-MM. */
function runningIn(lease: AnnualLease, month: string): boolean {
  // Compared as YYYY-MM strings, the same calendar-day discipline used
  // everywhere else here — a lease ending on the 3rd still earned that month.
  return lease.startDate.slice(0, 7) <= month && lease.endDate.slice(0, 7) >= month;
}

export function annualSummary(input: AnnualSummaryInput): AnnualSummary {
  const months = monthsOfYear(input.year);

  let rent = 0;
  let monthsOccupied = 0;

  for (const month of months) {
    const running = input.leases.filter((lease) => runningIn(lease, month));
    if (running.length === 0) continue;
    // Concurrent leases add up — a duplex earns both — but two leases in one
    // month is still one month of occupancy.
    monthsOccupied += 1;
    rent += running.reduce((sum, lease) => sum + lease.rent, 0);
  }

  const utilities = input.bills
    .filter((bill) => bill.billMonth.slice(0, 4) === String(input.year))
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  const mortgage = input.monthlyMortgage * 12;
  const capEx = input.monthlyCapEx * 12;

  return {
    year: input.year,
    rent,
    utilities,
    mortgage,
    capEx,
    net: rent - utilities - mortgage - capEx,
    monthsOccupied,
  };
}
