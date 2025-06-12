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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

// Helper function to calculate days until due
export const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper function to determine payment status
export const getPaymentStatus = (bill: Doc<"utilityBills">): {
  status: 'paid' | 'overdue' | 'due_soon' | 'current';
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