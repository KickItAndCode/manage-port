"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { exportCsv } from "@/lib/csv";
import {
  annualSummary,
  type AnnualBill,
  type AnnualLease,
} from "@/../convex/lib/annualSummary";

/**
 * What the property took in and paid out over a calendar year, exportable.
 *
 * Everything else in the app answers "this month". At tax time the question is
 * annual and actual, and the answer previously had to be assembled by hand from
 * the bills list.
 */

interface PropertyYearSummaryProps {
  propertyName: string;
  leases: AnnualLease[];
  bills: AnnualBill[];
  monthlyMortgage?: number;
  monthlyCapEx?: number;
}

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function PropertyYearSummary({
  propertyName,
  leases,
  bills,
  monthlyMortgage = 0,
  monthlyCapEx = 0,
}: PropertyYearSummaryProps) {
  /**
   * Offered years come from the data, newest first, so the picker never lists a
   * year with nothing in it — and always includes the current one, which is the
   * year an owner is most likely to want even before it has any bills.
   */
  const years = useMemo(() => {
    const found = new Set<number>([new Date().getFullYear()]);
    for (const bill of bills) {
      const year = Number(bill.billMonth.slice(0, 4));
      if (Number.isFinite(year)) found.add(year);
    }
    for (const lease of leases) {
      const start = Number(lease.startDate.slice(0, 4));
      const end = Number(lease.endDate.slice(0, 4));
      for (let y = start; y <= end; y++) if (Number.isFinite(y)) found.add(y);
    }
    return [...found].sort((a, b) => b - a);
  }, [bills, leases]);

  const [year, setYear] = useState(() => new Date().getFullYear());

  const summary = useMemo(
    () => annualSummary({ year, leases, bills, monthlyMortgage, monthlyCapEx }),
    [year, leases, bills, monthlyMortgage, monthlyCapEx]
  );

  const rows = [
    { line: "Rent collected", amount: summary.rent },
    { line: "Utilities", amount: -summary.utilities },
    { line: "Mortgage", amount: -summary.mortgage },
    { line: "CapEx reserve", amount: -summary.capEx },
    { line: "Net", amount: summary.net },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg">Year Summary</CardTitle>
          <div className="flex items-center gap-2">
            <SelectNative
              aria-label="Summary year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 w-28 text-sm"
              data-testid="year-summary-select"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectNative>
            <Button
              variant="outline"
              size="sm"
              data-testid="year-summary-export"
              onClick={() =>
                exportCsv(
                  `${propertyName}-${year}-summary`,
                  rows,
                  [
                    { header: "Line", value: (r) => r.line },
                    { header: "Amount", value: (r) => r.amount.toFixed(2) },
                  ]
                )
              }
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => {
            const isNet = row.line === "Net";
            return (
              <div
                key={row.line}
                className={
                  isNet
                    ? "flex justify-between items-center p-3 rounded-lg border-t pt-3 font-semibold"
                    : "flex justify-between items-center p-3 bg-background/50 rounded-lg"
                }
              >
                <span className={isNet ? "" : "text-muted-foreground"}>{row.line}</span>
                <span
                  className={
                    isNet
                      ? row.amount >= 0
                        ? "text-green-600 font-bold"
                        : "text-red-600 font-bold"
                      : "font-semibold"
                  }
                  data-testid={isNet ? "year-summary-net" : undefined}
                >
                  {money(row.amount)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {summary.monthsOccupied} of 12 months let. Rent counts only the months a
          lease was running; utilities are the bills actually issued in {year}.
        </p>
      </CardContent>
    </Card>
  );
}
