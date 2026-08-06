import { describe, expect, it } from "vitest";
import type { Doc } from "@/../convex/_generated/dataModel";
import {
  daysUntil,
  describeDueDate,
  formatLocalDate,
  getPaymentStatus,
  toLocalDate,
} from "./utilityBillHelpers";

/**
 * getPaymentStatus is what turns a due date into the thing a landlord actually
 * needs to know: is this overdue, due this week, or fine. It existed unused
 * while the bills table rendered a binary paid/unpaid badge, so an eight-month
 * overdue bill looked exactly like one due next week.
 *
 * The boundaries matter more than they look. "Due today" must not read as
 * overdue — a landlord who still has the afternoon to pay should not be told
 * they missed it — and the day either side of the seven-day window is where an
 * off-by-one would hide.
 */

/** A YYYY-MM-DD string N days from today, built in local time. */
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function bill(overrides: Partial<Doc<"utilityBills">>): Doc<"utilityBills"> {
  return {
    dueDate: dayOffset(30),
    landlordPaidUtilityCompany: false,
    ...overrides,
  } as Doc<"utilityBills">;
}

describe("getPaymentStatus", () => {
  it("reports paid regardless of how far past due", () => {
    // Paid wins over every other signal: a bill settled late is not outstanding.
    const status = getPaymentStatus(
      bill({ landlordPaidUtilityCompany: true, dueDate: dayOffset(-400) })
    );
    expect(status.status).toBe("paid");
    expect(status.label).toBe("Paid");
  });

  it("reports overdue the day after the due date", () => {
    expect(getPaymentStatus(bill({ dueDate: dayOffset(-1) })).status).toBe("overdue");
    expect(getPaymentStatus(bill({ dueDate: dayOffset(-240) })).label).toBe("Overdue");
  });

  it("does not call a bill due today overdue", () => {
    // The boundary that matters: today is still due_soon, not missed.
    const status = getPaymentStatus(bill({ dueDate: dayOffset(0) }));
    expect(status.status).toBe("due_soon");
  });

  it("treats the seventh day as due soon and the eighth as current", () => {
    expect(getPaymentStatus(bill({ dueDate: dayOffset(7) })).status).toBe("due_soon");
    expect(getPaymentStatus(bill({ dueDate: dayOffset(8) })).status).toBe("current");
  });

  it("reports current for bills comfortably in the future", () => {
    const status = getPaymentStatus(bill({ dueDate: dayOffset(45) }));
    expect(status.status).toBe("current");
    expect(status.label).toBe("Current");
  });

  it("tolerates a stored timestamp rather than a bare date", () => {
    // Some rows carry the full ISO instant. It must still resolve to its
    // calendar day rather than shifting a day backwards.
    const iso = `${dayOffset(-1)}T00:00:00.000Z`;
    expect(getPaymentStatus(bill({ dueDate: iso })).status).toBe("overdue");
  });
});

describe("getPaymentStatus with an unusable due date", () => {
  // UtilityBillForm defaults dueDate to "" and never validates it, so bills
  // with no due date exist. Reporting those as "Current" tells a landlord
  // everything is fine about a record that cannot be judged at all.
  it("does not claim a bill with no due date is current", () => {
    const status = getPaymentStatus(bill({ dueDate: "" }));
    expect(status.status).toBe("unknown");
    expect(status.label).toBe("No due date");
  });

  it("does not claim a bill with a malformed due date is current", () => {
    expect(getPaymentStatus(bill({ dueDate: "not-a-date" })).status).toBe("unknown");
  });

  it("still reports paid when the bill is settled but undated", () => {
    // Paid is knowable without a due date, so it should still win.
    const status = getPaymentStatus(
      bill({ dueDate: "", landlordPaidUtilityCompany: true })
    );
    expect(status.status).toBe("paid");
  });
});

describe("daysUntil", () => {
  it("counts calendar days, not elapsed hours", () => {
    expect(daysUntil(dayOffset(0))).toBe(0);
    expect(daysUntil(dayOffset(1))).toBe(1);
    expect(daysUntil(dayOffset(-1))).toBe(-1);
  });

  it("is unaffected by the time of day the code runs", () => {
    // A UTC-parsed date compared against a local now() drifts by one for most
    // of the day in negative-offset zones. Whatever the clock reads, tomorrow
    // is exactly one day away.
    expect(daysUntil(dayOffset(10))).toBe(10);
  });
});

describe("describeDueDate", () => {
  it("names today and tomorrow rather than counting them", () => {
    expect(describeDueDate(dayOffset(0))).toBe("due today");
    expect(describeDueDate(dayOffset(1))).toBe("due tomorrow");
  });

  it("singularises one day overdue", () => {
    expect(describeDueDate(dayOffset(-1))).toBe("1 day overdue");
  });

  it("counts days inside a month", () => {
    expect(describeDueDate(dayOffset(-9))).toBe("9 days overdue");
    expect(describeDueDate(dayOffset(20))).toBe("due in 20 days");
  });

  it("switches to months once days stop being meaningful", () => {
    // 247 days overdue is noise; 8 months is a fact you can act on.
    expect(describeDueDate(dayOffset(-247))).toBe("8 months overdue");
    expect(describeDueDate(dayOffset(60))).toBe("due in 2 months");
  });

  it("switches to years beyond twelve months", () => {
    expect(describeDueDate(dayOffset(-550))).toBe("1.5 years overdue");
  });

  it("says nothing rather than 'NaN years' for an unusable date", () => {
    // Arithmetic on an unparseable date yields NaN, which formats as
    // "due in NaN years" — worse than no line at all.
    expect(describeDueDate("")).toBe("");
    expect(describeDueDate("not-a-date")).toBe("");
  });
});

describe("toLocalDate", () => {
  it("keeps the calendar day intact", () => {
    const d = toLocalDate("2026-08-06");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(6);
  });
});

describe("formatLocalDate", () => {
  it("writes the local calendar day, not the UTC one", () => {
    // toISOString() on local midnight yields the previous day east of
    // Greenwich, which put the default bill date in the wrong month.
    expect(formatLocalDate(new Date(2026, 7, 1))).toBe("2026-08-01");
    expect(formatLocalDate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("zero-pads month and day", () => {
    expect(formatLocalDate(new Date(2026, 8, 5))).toBe("2026-09-05");
  });

  it("round-trips through toLocalDate", () => {
    const original = "2026-12-31";
    expect(formatLocalDate(toLocalDate(original))).toBe(original);
  });
});
