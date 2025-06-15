import { Doc } from "@/../convex/_generated/dataModel";
import { UtilityBillStats } from "@/types/utilityBills";

// Pure function for calculating bill statistics
export const calculateBillStats = (bills: Array<Doc<"utilityBills">>): UtilityBillStats => {
  const totalBills = bills.length;
  const unpaidBills = bills.filter(bill => !bill.landlordPaidUtilityCompany).length;
  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const unpaidAmount = bills
    .filter(bill => !bill.landlordPaidUtilityCompany)
    .reduce((sum, bill) => sum + bill.totalAmount, 0);

  return {
    totalBills,
    unpaidBills,
    totalAmount,
    unpaidAmount,
  };
};

// Pure function for grouping bills by property
export const groupBillsByProperty = (
  bills: Array<Doc<"utilityBills">>
): Record<string, Array<Doc<"utilityBills">>> => {
  const grouped: Record<string, Array<Doc<"utilityBills">>> = {};
  
  bills.forEach(bill => {
    const propertyId = bill.propertyId;
    if (!grouped[propertyId]) {
      grouped[propertyId] = [];
    }
    grouped[propertyId].push(bill);
  });
  
  return grouped;
};

// Pure function for grouping bills by utility type
export const groupBillsByUtilityType = (
  bills: Array<Doc<"utilityBills">>
): Record<string, Array<Doc<"utilityBills">>> => {
  const grouped: Record<string, Array<Doc<"utilityBills">>> = {};
  
  bills.forEach(bill => {
    const utilityType = bill.utilityType;
    if (!grouped[utilityType]) {
      grouped[utilityType] = [];
    }
    grouped[utilityType].push(bill);
  });
  
  return grouped;
};

// Pure function for grouping bills by month
export const groupBillsByMonth = (
  bills: Array<Doc<"utilityBills">>
): Record<string, Array<Doc<"utilityBills">>> => {
  const grouped: Record<string, Array<Doc<"utilityBills">>> = {};
  
  bills.forEach(bill => {
    const month = bill.billMonth;
    if (!grouped[month]) {
      grouped[month] = [];
    }
    grouped[month].push(bill);
  });
  
  return grouped;
};

// Pure function for calculating monthly totals
export const calculateMonthlyTotals = (
  billsByMonth: Record<string, Array<Doc<"utilityBills">>>
): Array<{
  month: string;
  totalAmount: number;
  billCount: number;
  unpaidCount: number;
  unpaidAmount: number;
}> => {
  return Object.entries(billsByMonth)
    .map(([month, bills]) => ({
      month,
      totalAmount: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      billCount: bills.length,
      unpaidCount: bills.filter(bill => !bill.landlordPaidUtilityCompany).length,
      unpaidAmount: bills
        .filter(bill => !bill.landlordPaidUtilityCompany)
        .reduce((sum, bill) => sum + bill.totalAmount, 0),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

// Pure function for finding overdue bills
export const findOverdueBills = (bills: Array<Doc<"utilityBills">>): Array<Doc<"utilityBills">> => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return bills.filter(bill => 
    !bill.landlordPaidUtilityCompany && bill.dueDate < todayString
  );
};

// Pure function for calculating utility type breakdown
export const calculateUtilityTypeBreakdown = (
  bills: Array<Doc<"utilityBills">>
): Array<{
  utilityType: string;
  totalAmount: number;
  billCount: number;
  averageAmount: number;
}> => {
  const grouped = groupBillsByUtilityType(bills);
  
  return Object.entries(grouped)
    .map(([utilityType, typeBills]) => {
      const totalAmount = typeBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
      const billCount = typeBills.length;
      
      return {
        utilityType,
        totalAmount,
        billCount,
        averageAmount: billCount > 0 ? totalAmount / billCount : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
};