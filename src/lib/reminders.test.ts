import { describe, expect, it } from "vitest";
import {
  buildPaymentReminder,
  describeAddress,
  reminderMailtoUrl,
  type ReminderInput,
} from "./reminders";

const base: ReminderInput = {
  tenantName: "Josen X",
  propertyName: "1368 East 28th St",
  unitIdentifier: "Main",
  lines: [
    { utilityType: "Water", billMonth: "2025-12", amountOwed: 78 },
    { utilityType: "Electric", billMonth: "2025-12", amountOwed: 42.5 },
  ],
  totalOwed: 120.5,
};

describe("buildPaymentReminder", () => {
  it("addresses the tenant and names the property and unit", () => {
    const { body } = buildPaymentReminder(base);
    expect(body).toContain("Hi Josen X,");
    expect(body).toContain("1368 East 28th St — Main");
  });

  it("itemises every charge with its month and amount", () => {
    // A tenant disputing a figure needs to see where it came from, so the
    // breakdown matters more than the total.
    const { body } = buildPaymentReminder(base);
    expect(body).toContain("Water (2025-12): $78.00");
    expect(body).toContain("Electric (2025-12): $42.50");
  });

  it("states the total as currency", () => {
    const { body, subject } = buildPaymentReminder(base);
    expect(body).toContain("Total due: $120.50");
    expect(subject).toContain("$120.50");
  });

  it("says charge, not charges, for a single item", () => {
    const single = buildPaymentReminder({
      ...base,
      lines: [base.lines[0]],
      totalOwed: 78,
    });
    expect(single.body).toContain("1 outstanding utility charge for");
    expect(single.body).not.toContain("charges");
  });

  it("omits the unit when there is none", () => {
    const noUnit = buildPaymentReminder({ ...base, unitIdentifier: undefined });
    expect(noUnit.body).toContain("for 1368 East 28th St:");
    expect(noUnit.body).not.toContain("—");
  });
});

describe("describeAddress", () => {
  it("joins property and unit, or returns the property alone", () => {
    expect(describeAddress("Oak St", "Apt 2")).toBe("Oak St — Apt 2");
    expect(describeAddress("Oak St")).toBe("Oak St");
  });
});

describe("reminderMailtoUrl", () => {
  it("encodes the body so newlines survive", () => {
    const url = reminderMailtoUrl("t@example.com", buildPaymentReminder(base));
    expect(url.startsWith("mailto:t%40example.com?")).toBe(true);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
    expect(url).not.toContain("\n");
  });

  it("does not let an ampersand in the address truncate the message", () => {
    // "Smith & Sons" unencoded would end the body parameter early and send a
    // partial reminder, which the landlord would never see happen.
    const url = reminderMailtoUrl(
      "t@example.com",
      buildPaymentReminder({ ...base, propertyName: "Smith & Sons #4" })
    );
    const body = new URLSearchParams(url.split("?")[1]).get("body") ?? "";
    expect(body).toContain("Smith & Sons #4");
    expect(body).toContain("Total due:");
  });
});
