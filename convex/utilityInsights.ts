import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export interface UtilityAnomaly {
  billId: Id<"utilityBills">;
  propertyId: Id<"properties">;
  propertyName: string;
  utilityType: string;
  billMonth: string;
  amount: number;
  previousAverage: number;
  percentageIncrease: number;
  severity: "low" | "medium" | "high";
}

export interface MonthlyDelta {
  month: string;
  utilityType: string;
  currentAmount: number;
  previousAmount: number;
  delta: number;
  percentageChange: number;
}

/**
 * Detect anomalies in utility bills (spikes)
 * Compares each bill to the average of previous 3 months
 */
export const detectUtilityAnomalies = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    threshold: v.optional(v.number()), // Percentage increase threshold (default 30%)
  },
  handler: async (ctx, args): Promise<UtilityAnomaly[]> => {
    const threshold = args.threshold || 30; // Default 30% increase threshold

    // Get all bills for the user/property
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        args.propertyId
          ? q.eq(q.field("propertyId"), args.propertyId)
          : q.eq(q.field("userId"), args.userId)
      )
      .collect();

    // Group bills by property and utility type
    const billsByPropertyAndType: Record<string, Doc<"utilityBills">[]> = {};

    for (const bill of bills) {
      const key = `${bill.propertyId}-${bill.utilityType}`;
      if (!billsByPropertyAndType[key]) {
        billsByPropertyAndType[key] = [];
      }
      billsByPropertyAndType[key].push(bill);
    }

    const anomalies: UtilityAnomaly[] = [];

    // Process each property/utility combination
    for (const [key, propertyBills] of Object.entries(billsByPropertyAndType)) {
      // Sort bills by month (oldest first)
      const sortedBills = propertyBills.sort((a, b) =>
        a.billMonth.localeCompare(b.billMonth)
      );

      // Need at least 4 months of data to detect anomalies
      if (sortedBills.length < 4) continue;

      // Get property name
      const [propertyId] = key.split("-");
      const property = await ctx.db.get(propertyId as Id<"properties">);
      const propertyName = property?.name || "Unknown Property";

      // Check each bill starting from the 4th month
      for (let i = 3; i < sortedBills.length; i++) {
        const currentBill = sortedBills[i];
        const previousBills = sortedBills.slice(i - 3, i);

        // Calculate average of previous 3 months
        const previousAverage =
          previousBills.reduce((sum, bill) => sum + bill.totalAmount, 0) /
          previousBills.length;

        // Calculate percentage increase
        const percentageIncrease =
          ((currentBill.totalAmount - previousAverage) / previousAverage) * 100;

        // Check if it exceeds threshold
        if (percentageIncrease >= threshold) {
          // Determine severity
          let severity: "low" | "medium" | "high" = "low";
          if (percentageIncrease >= 100) {
            severity = "high";
          } else if (percentageIncrease >= 50) {
            severity = "medium";
          }

          anomalies.push({
            billId: currentBill._id,
            propertyId: currentBill.propertyId,
            propertyName,
            utilityType: currentBill.utilityType,
            billMonth: currentBill.billMonth,
            amount: currentBill.totalAmount,
            previousAverage,
            percentageIncrease: Math.round(percentageIncrease * 10) / 10,
            severity,
          });
        }
      }
    }

    // Sort by severity and percentage increase (highest first)
    return anomalies.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.percentageIncrease - a.percentageIncrease;
    });
  },
});

/**
 * Calculate monthly deltas for utility bills
 * Compares current month to previous month
 */
export const getMonthlyDeltas = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    months: v.optional(v.number()), // Number of months to analyze (default 6)
  },
  handler: async (ctx, args): Promise<MonthlyDelta[]> => {
    const monthsToAnalyze = args.months || 6;

    // Get all bills
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        args.propertyId
          ? q.eq(q.field("propertyId"), args.propertyId)
          : q.eq(q.field("userId"), args.userId)
      )
      .collect();

    // Group by property and utility type, then by month
    const billsByKey: Record<
      string,
      Record<string, Doc<"utilityBills">[]>
    > = {};

    for (const bill of bills) {
      const key = `${bill.propertyId}-${bill.utilityType}`;
      if (!billsByKey[key]) {
        billsByKey[key] = {};
      }
      if (!billsByKey[key][bill.billMonth]) {
        billsByKey[key][bill.billMonth] = [];
      }
      billsByKey[key][bill.billMonth].push(bill);
    }

    const deltas: MonthlyDelta[] = [];
    const sortedMonths: string[] = [];

    // Collect all unique months and sort them
    for (const billsByMonth of Object.values(billsByKey)) {
      for (const month of Object.keys(billsByMonth)) {
        if (!sortedMonths.includes(month)) {
          sortedMonths.push(month);
        }
      }
    }
    sortedMonths.sort();

    // Analyze last N months
    const monthsToProcess = sortedMonths.slice(-monthsToAnalyze);

    for (const [key, billsByMonth] of Object.entries(billsByKey)) {
      const [propertyId, utilityType] = key.split("-");

      for (let i = 1; i < monthsToProcess.length; i++) {
        const currentMonth = monthsToProcess[i];
        const previousMonth = monthsToProcess[i - 1];

        const currentBills = billsByMonth[currentMonth] || [];
        const previousBills = billsByMonth[previousMonth] || [];

        if (currentBills.length === 0 || previousBills.length === 0) continue;

        const currentAmount = currentBills.reduce(
          (sum, bill) => sum + bill.totalAmount,
          0
        );
        const previousAmount = previousBills.reduce(
          (sum, bill) => sum + bill.totalAmount,
          0
        );

        if (previousAmount === 0) continue;

        const delta = currentAmount - previousAmount;
        const percentageChange = (delta / previousAmount) * 100;

        deltas.push({
          month: currentMonth,
          utilityType,
          currentAmount,
          previousAmount,
          delta,
          percentageChange: Math.round(percentageChange * 10) / 10,
        });
      }
    }

    // Sort by month (newest first)
    return deltas.sort((a, b) => b.month.localeCompare(a.month));
  },
});

/**
 * Get utility insights summary
 */
export const getUtilityInsights = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Inline anomaly detection logic
    const threshold = 30;
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        args.propertyId
          ? q.eq(q.field("propertyId"), args.propertyId)
          : q.eq(q.field("userId"), args.userId)
      )
      .collect();

    const billsByPropertyAndType: Record<string, Doc<"utilityBills">[]> = {};
    for (const bill of bills) {
      const key = `${bill.propertyId}-${bill.utilityType}`;
      if (!billsByPropertyAndType[key]) {
        billsByPropertyAndType[key] = [];
      }
      billsByPropertyAndType[key].push(bill);
    }

    const anomalies: UtilityAnomaly[] = [];
    for (const [key, propertyBills] of Object.entries(billsByPropertyAndType)) {
      const sortedBills = propertyBills.sort((a, b) =>
        a.billMonth.localeCompare(b.billMonth)
      );
      if (sortedBills.length < 4) continue;
      const [propertyId] = key.split("-");
      const property = await ctx.db.get(propertyId as Id<"properties">);
      const propertyName = property?.name || "Unknown Property";
      for (let i = 3; i < sortedBills.length; i++) {
        const currentBill = sortedBills[i];
        const previousBills = sortedBills.slice(i - 3, i);
        const previousAverage =
          previousBills.reduce((sum, bill) => sum + bill.totalAmount, 0) /
          previousBills.length;
        const percentageIncrease =
          ((currentBill.totalAmount - previousAverage) / previousAverage) * 100;
        if (percentageIncrease >= threshold) {
          let severity: "low" | "medium" | "high" = "low";
          if (percentageIncrease >= 100) {
            severity = "high";
          } else if (percentageIncrease >= 50) {
            severity = "medium";
          }
          anomalies.push({
            billId: currentBill._id,
            propertyId: currentBill.propertyId,
            propertyName,
            utilityType: currentBill.utilityType,
            billMonth: currentBill.billMonth,
            amount: currentBill.totalAmount,
            previousAverage,
            percentageIncrease: Math.round(percentageIncrease * 10) / 10,
            severity,
          });
        }
      }
    }
    const sortedAnomalies = anomalies.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.percentageIncrease - a.percentageIncrease;
    });

    // Inline monthly deltas logic
    const monthsToAnalyze = 6;
    const billsByKey: Record<
      string,
      Record<string, Doc<"utilityBills">[]>
    > = {};
    for (const bill of bills) {
      const key = `${bill.propertyId}-${bill.utilityType}`;
      if (!billsByKey[key]) {
        billsByKey[key] = {};
      }
      if (!billsByKey[key][bill.billMonth]) {
        billsByKey[key][bill.billMonth] = [];
      }
      billsByKey[key][bill.billMonth].push(bill);
    }
    const deltas: MonthlyDelta[] = [];
    const sortedMonths: string[] = [];
    for (const billsByMonth of Object.values(billsByKey)) {
      for (const month of Object.keys(billsByMonth)) {
        if (!sortedMonths.includes(month)) {
          sortedMonths.push(month);
        }
      }
    }
    sortedMonths.sort();
    const monthsToProcess = sortedMonths.slice(-monthsToAnalyze);
    for (const [key, billsByMonth] of Object.entries(billsByKey)) {
      const [propertyId, utilityType] = key.split("-");
      for (let i = 1; i < monthsToProcess.length; i++) {
        const currentMonth = monthsToProcess[i];
        const previousMonth = monthsToProcess[i - 1];
        const currentBills = billsByMonth[currentMonth] || [];
        const previousBills = billsByMonth[previousMonth] || [];
        if (currentBills.length === 0 || previousBills.length === 0) continue;
        const currentAmount = currentBills.reduce(
          (sum, bill) => sum + bill.totalAmount,
          0
        );
        const previousAmount = previousBills.reduce(
          (sum, bill) => sum + bill.totalAmount,
          0
        );
        if (previousAmount === 0) continue;
        const delta = currentAmount - previousAmount;
        const percentageChange = (delta / previousAmount) * 100;
        deltas.push({
          month: currentMonth,
          utilityType,
          currentAmount,
          previousAmount,
          delta,
          percentageChange: Math.round(percentageChange * 10) / 10,
        });
      }
    }
    const sortedDeltas = deltas.sort((a, b) => b.month.localeCompare(a.month));

    return {
      anomalies: sortedAnomalies,
      deltas: sortedDeltas,
      anomalyCount: sortedAnomalies.length,
      highSeverityAnomalies: sortedAnomalies.filter(
        (a) => a.severity === "high"
      ).length,
    };
  },
});

export interface OverdueBillReminder {
  billId: Id<"utilityBills">;
  propertyId: Id<"properties">;
  propertyName: string;
  utilityType: string;
  billMonth: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface MissingReadingReminder {
  propertyId: Id<"properties">;
  propertyName: string;
  utilityType: string;
  expectedMonth: string;
  lastBillMonth: string | null;
  daysSinceLastBill: number;
}

/**
 * Detect overdue utility bills
 * Bills are considered overdue if:
 * - dueDate has passed
 * - landlordPaidUtilityCompany is false
 */
export const getOverdueBills = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    daysOverdueThreshold: v.optional(v.number()), // Minimum days overdue to show (default 1)
  },
  handler: async (ctx, args): Promise<OverdueBillReminder[]> => {
    const threshold = args.daysOverdueThreshold || 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unpaid bills
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("landlordPaidUtilityCompany"), false),
          args.propertyId
            ? q.eq(q.field("propertyId"), args.propertyId)
            : q.eq(q.field("userId"), args.userId)
        )
      )
      .collect();

    const reminders: OverdueBillReminder[] = [];

    for (const bill of bills) {
      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue >= threshold) {
          const property = await ctx.db.get(bill.propertyId);
          reminders.push({
            billId: bill._id,
            propertyId: bill.propertyId,
            propertyName: property?.name || "Unknown Property",
            utilityType: bill.utilityType,
            billMonth: bill.billMonth,
            amount: bill.totalAmount,
            dueDate: bill.dueDate,
            daysOverdue,
          });
        }
      }
    }

    // Sort by days overdue (most overdue first)
    return reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

/**
 * Detect missing utility bill readings
 * A reading is considered missing if:
 * - Property has active leases with utility responsibility
 * - Expected bill month has passed (current month or previous month)
 * - No bill exists for that month/utility type
 */
export const getMissingReadings = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    lookbackMonths: v.optional(v.number()), // How many months back to check (default 2)
  },
  handler: async (ctx, args): Promise<MissingReadingReminder[]> => {
    const lookback = args.lookbackMonths || 2;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    // Get all properties for the user
    const properties = await ctx.db
      .query("properties")
      .filter((q) =>
        args.propertyId
          ? q.eq(q.field("_id"), args.propertyId)
          : q.eq(q.field("userId"), args.userId)
      )
      .collect();

    const reminders: MissingReadingReminder[] = [];

    for (const property of properties) {
      // Get active leases for this property
      const leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (leases.length === 0) continue;

      // Get utility types that have responsibility settings
      const utilityTypes = new Set<string>();
      for (const lease of leases) {
        const settings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
          .collect();

        for (const setting of settings) {
          if (setting.responsibilityPercentage > 0) {
            utilityTypes.add(setting.utilityType);
          }
        }
      }

      if (utilityTypes.size === 0) continue;

      // Get all bills for this property
      const bills = await ctx.db
        .query("utilityBills")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();

      // Group bills by utility type and month
      const billsByTypeAndMonth: Record<string, Set<string>> = {};
      for (const bill of bills) {
        if (!billsByTypeAndMonth[bill.utilityType]) {
          billsByTypeAndMonth[bill.utilityType] = new Set();
        }
        billsByTypeAndMonth[bill.utilityType].add(bill.billMonth);
      }

      // Check for missing readings in the last N months
      for (let i = 0; i < lookback; i++) {
        let checkMonth = currentMonth - i;
        let checkYear = currentYear;

        // Handle year rollover
        while (checkMonth < 1) {
          checkMonth += 12;
          checkYear -= 1;
        }

        const expectedMonth = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
        const expectedDate = new Date(checkYear, checkMonth - 1, 1);
        const daysSinceExpected = Math.floor(
          (today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only flag as missing if the month has passed (at least 5 days into next month)
        if (daysSinceExpected < 35) continue;

        for (const utilityType of utilityTypes) {
          const hasBill = billsByTypeAndMonth[utilityType]?.has(expectedMonth);

          if (!hasBill) {
            // Find the most recent bill for this utility type
            const billsForType = bills.filter(
              (b) => b.utilityType === utilityType
            );
            const sortedBills = billsForType.sort((a, b) =>
              b.billMonth.localeCompare(a.billMonth)
            );
            const lastBill = sortedBills[0];

            reminders.push({
              propertyId: property._id,
              propertyName: property.name,
              utilityType,
              expectedMonth,
              lastBillMonth: lastBill?.billMonth || null,
              daysSinceLastBill: lastBill
                ? Math.floor(
                    (today.getTime() -
                      new Date(lastBill.billMonth + "-01").getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : daysSinceExpected,
            });
          }
        }
      }
    }

    // Sort by days since last bill (most overdue first)
    return reminders.sort((a, b) => b.daysSinceLastBill - a.daysSinceLastBill);
  },
});

/**
 * Get all utility reminders (overdue bills + missing readings)
 */
export const getUtilityReminders = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Inline overdue bills detection
    const threshold = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unpaidBills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("landlordPaidUtilityCompany"), false),
          args.propertyId
            ? q.eq(q.field("propertyId"), args.propertyId)
            : q.eq(q.field("userId"), args.userId)
        )
      )
      .collect();
    const overdueBills: OverdueBillReminder[] = [];
    for (const bill of unpaidBills) {
      const dueDate = new Date(bill.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOverdue >= threshold) {
          const property = await ctx.db.get(bill.propertyId);
          overdueBills.push({
            billId: bill._id,
            propertyId: bill.propertyId,
            propertyName: property?.name || "Unknown Property",
            utilityType: bill.utilityType,
            billMonth: bill.billMonth,
            amount: bill.totalAmount,
            dueDate: bill.dueDate,
            daysOverdue,
          });
        }
      }
    }
    const sortedOverdueBills = overdueBills.sort(
      (a, b) => b.daysOverdue - a.daysOverdue
    );

    // Inline missing readings detection
    const lookback = 2;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const properties = await ctx.db
      .query("properties")
      .filter((q) =>
        args.propertyId
          ? q.eq(q.field("_id"), args.propertyId)
          : q.eq(q.field("userId"), args.userId)
      )
      .collect();
    const missingReadings: MissingReadingReminder[] = [];
    for (const property of properties) {
      const leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      if (leases.length === 0) continue;
      const utilityTypes = new Set<string>();
      for (const lease of leases) {
        const settings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
          .collect();
        for (const setting of settings) {
          if (setting.responsibilityPercentage > 0) {
            utilityTypes.add(setting.utilityType);
          }
        }
      }
      if (utilityTypes.size === 0) continue;
      const bills = await ctx.db
        .query("utilityBills")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      const billsByTypeAndMonth: Record<string, Set<string>> = {};
      for (const bill of bills) {
        if (!billsByTypeAndMonth[bill.utilityType]) {
          billsByTypeAndMonth[bill.utilityType] = new Set();
        }
        billsByTypeAndMonth[bill.utilityType].add(bill.billMonth);
      }
      for (let i = 0; i < lookback; i++) {
        let checkMonth = currentMonth - i;
        let checkYear = currentYear;
        while (checkMonth < 1) {
          checkMonth += 12;
          checkYear -= 1;
        }
        const expectedMonth = `${checkYear}-${String(checkMonth).padStart(2, "0")}`;
        const expectedDate = new Date(checkYear, checkMonth - 1, 1);
        const daysSinceExpected = Math.floor(
          (today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceExpected < 35) continue;
        for (const utilityType of utilityTypes) {
          const hasBill = billsByTypeAndMonth[utilityType]?.has(expectedMonth);
          if (!hasBill) {
            const billsForType = bills.filter(
              (b) => b.utilityType === utilityType
            );
            const sortedBills = billsForType.sort((a, b) =>
              b.billMonth.localeCompare(a.billMonth)
            );
            const lastBill = sortedBills[0];
            missingReadings.push({
              propertyId: property._id,
              propertyName: property.name,
              utilityType,
              expectedMonth,
              lastBillMonth: lastBill?.billMonth || null,
              daysSinceLastBill: lastBill
                ? Math.floor(
                    (today.getTime() -
                      new Date(lastBill.billMonth + "-01").getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : daysSinceExpected,
            });
          }
        }
      }
    }
    const sortedMissingReadings = missingReadings.sort(
      (a, b) => b.daysSinceLastBill - a.daysSinceLastBill
    );

    return {
      overdueBills: sortedOverdueBills,
      missingReadings: sortedMissingReadings,
      totalReminders: sortedOverdueBills.length + sortedMissingReadings.length,
    };
  },
});
