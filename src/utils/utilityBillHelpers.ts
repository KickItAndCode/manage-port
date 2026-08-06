import { Doc, Id } from "@/../convex/_generated/dataModel";

// Helper function to format currency values
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Helper function to format dates
export const formatDate = (dateString: string): string => {
  return toLocalDate(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Parses a stored date as a calendar day in the viewer's timezone.
 *
 * Dates here are days, not instants — a bill is due on the 15th, not at a
 * particular moment. `new Date("2025-12-15")` reads the string as UTC
 * midnight, which renders as the 14th anywhere west of Greenwich; a bill due
 * 2025-12-15 was being shown as "Due: 12/14/2025". Splitting the date part and
 * constructing from its components keeps the day intact. Values that also
 * carry a time (…T00:00:00.000Z) are truncated to their date first.
 */
export const toLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  if ([year, month, day].every((n) => Number.isFinite(n))) {
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

// Helper function to format bill month (YYYY-MM) to readable format
export const formatBillMonth = (billMonth: string): string => {
  const [year, month] = billMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
};

// Helper function to get utility type icon/color
export const getUtilityTypeInfo = (utilityType: string): {
  color: string;
  bgColor: string;
  textColor: string;
} => {
  const typeMap: Record<string, { color: string; bgColor: string; textColor: string }> = {
    'Electric': { color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    'Water': { color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    'Gas': { color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
    'Sewer': { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
    'Trash': { color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    'Internet': { color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  };
  
  return typeMap[utilityType] || { color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
};

/**
 * Whole days from today to `dateString`: 0 today, negative once past.
 *
 * Both sides are reduced to a calendar day in the viewer's timezone before
 * subtracting. Comparing a UTC-parsed date against a local `new Date()` is off
 * by one for most of the day in any negative-offset zone, and mixing that with
 * setHours(0,0,0,0) — which sets *local* midnight on a UTC-parsed value — moves
 * the date back a day outright.
 */
export const daysUntil = (dateString: string): number => {
  const target = toLocalDate(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

// Helper function to calculate days until due
export const getDaysUntilDue = (dueDate: string): number => daysUntil(dueDate);

export type PaymentStatus = 'paid' | 'overdue' | 'due_soon' | 'current';

/** The fields a bill must carry to have a payment status. */
export interface BillPaymentFields {
  dueDate: string;
  landlordPaidUtilityCompany?: boolean;
}

/**
 * Turns a due date into the state a landlord acts on.
 *
 * Structural rather than `Doc<"utilityBills">` so the table config's own
 * UtilityBill interface and the Convex document can both use it without a cast.
 */
export const getPaymentStatus = (bill: BillPaymentFields): {
  status: PaymentStatus;
  label: string;
  color: string;
} => {
  if (bill.landlordPaidUtilityCompany) {
    return { status: 'paid', label: 'Paid', color: 'green' };
  }
  
  const daysUntilDue = getDaysUntilDue(bill.dueDate);
  
  if (daysUntilDue < 0) {
    return { status: 'overdue', label: 'Overdue', color: 'red' };
  } else if (daysUntilDue <= 7) {
    return { status: 'due_soon', label: 'Due Soon', color: 'yellow' };
  } else {
    return { status: 'current', label: 'Current', color: 'blue' };
  }
};

/**
 * "3 days overdue", "due today", "due in 5 days".
 *
 * Past a month days stop carrying meaning — "247 days overdue" reads as noise
 * where "8 months overdue" lands. The exact figure stays available in the due
 * date itself; this is the at-a-glance version.
 */
export const describeDueDate = (dueDate: string): string => {
  const days = daysUntil(dueDate);
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days === -1) return '1 day overdue';

  const magnitude = Math.abs(days);
  const amount =
    magnitude < 31
      ? `${magnitude} days`
      : magnitude < 365
        ? `${Math.round(magnitude / 30)} months`
        : `${(magnitude / 365).toFixed(1)} years`;

  return days < 0 ? `${amount} overdue` : `due in ${amount}`;
};

// Helper function to find property by ID
export const findPropertyById = (
  properties: Array<Doc<"properties"> & { monthlyRent: number }>,
  propertyId: Id<"properties">
): (Doc<"properties"> & { monthlyRent: number }) | undefined => {
  return properties.find(property => property._id === propertyId);
};

// Helper function to find lease by ID
export const findLeaseById = (
  leases: Array<Doc<"leases"> & { unit?: Doc<"units"> }>,
  leaseId: Id<"leases">
): (Doc<"leases"> & { unit?: Doc<"units"> }) | undefined => {
  return leases.find(lease => lease._id === leaseId);
};

// Helper function to get display name for a property
export const getPropertyDisplayName = (property: Doc<"properties">): string => {
  return property.name || property.address || 'Unnamed Property';
};

// Helper function to get display name for a tenant/lease
export const getTenantDisplayName = (
  lease: Doc<"leases"> & { unit?: Doc<"units"> }
): string => {
  const unitInfo = lease.unit?.unitIdentifier ? ` - ${lease.unit.unitIdentifier}` : '';
  return `${lease.tenantName}${unitInfo}`;
};

// Helper function to validate bill month format
export const isValidBillMonth = (billMonth: string): boolean => {
  return /^\d{4}-\d{2}$/.test(billMonth);
};

// Helper function to generate next bill month
export const getNextBillMonth = (currentMonth?: string): string => {
  const now = new Date();
  
  if (currentMonth && isValidBillMonth(currentMonth)) {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = new Date(year, month, 1); // month is 0-indexed, so this gives us next month
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  }
  
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper function to get bill month options for date picker
export const getBillMonthOptions = (monthsBack: number = 12): Array<{ value: string; label: string }> => {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatBillMonth(value);
    options.push({ value, label });
  }
  
  return options;
};

// Helper function to calculate percentage
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Helper function to safely parse number
export const safeParseNumber = (value: string | number, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};