#!/usr/bin/env node

/**
 * Simple utility bill import script for 2025 data
 * Property ID: j575e1esdewkrqtc0ba237dayx7j9hrc
 * 
 * Usage:
 * 1. Make sure your Convex deployment is running
 * 2. Set CONVEX_URL environment variable
 * 3. Run: node scripts/add-utility-bills-simple.mjs
 */

import { ConvexHttpClient } from "convex/browser";

// You'll need to replace this with your actual Convex deployment URL
const CONVEX_URL = process.env.CONVEX_URL || "https://your-deployment-name.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

const PROPERTY_ID = "j575e1esdewkrqtc0ba237dayx7j9hrc";

// Bill data from your spreadsheet (non-zero amounts only)
const billsToAdd = [
  // January 2025
  { month: "2025-01", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-01", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-01", type: "Gas", amount: 360.61, provider: "Gas Company" },
  { month: "2025-01", type: "Electric", amount: 360.61, provider: "Electric Company" },
  { month: "2025-01", type: "Water", amount: 205.00, provider: "Water Department" },
  
  // February 2025
  { month: "2025-02", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-02", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-02", type: "Gas", amount: 336.56, provider: "Gas Company" },
  { month: "2025-02", type: "Electric", amount: 336.55, provider: "Electric Company" },
  { month: "2025-02", type: "Water", amount: 205.00, provider: "Water Department" },
  
  // March 2025
  { month: "2025-03", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-03", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-03", type: "Gas", amount: 286.92, provider: "Gas Company" },
  { month: "2025-03", type: "Electric", amount: 286.91, provider: "Electric Company" },
  { month: "2025-03", type: "Water", amount: 175.24, provider: "Water Department" },
  
  // April 2025
  { month: "2025-04", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-04", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-04", type: "Gas", amount: 160.87, provider: "Gas Company" },
  { month: "2025-04", type: "Electric", amount: 160.86, provider: "Electric Company" },
  { month: "2025-04", type: "Water", amount: 175.24, provider: "Water Department" },
  
  // May 2025
  { month: "2025-05", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-05", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-05", type: "Gas", amount: 73.81, provider: "Gas Company" },
  { month: "2025-05", type: "Electric", amount: 73.81, provider: "Electric Company" },
  { month: "2025-05", type: "Water", amount: 177.75, provider: "Water Department" },
  
  // June 2025
  { month: "2025-06", type: "Trash", amount: 178.78, provider: "Waste Management" },
  { month: "2025-06", type: "Internet", amount: 137.85, provider: "Internet Provider" },
  { month: "2025-06", type: "Gas", amount: 164.80, provider: "Gas Company" },
  { month: "2025-06", type: "Electric", amount: 164.79, provider: "Electric Company" },
  { month: "2025-06", type: "Water", amount: 177.75, provider: "Water Department" }
];

function getDatesForMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  
  // Bill date: 1st of the month
  const billDate = `${year}-${month}-01T00:00:00.000Z`;
  
  // Due date: 15th of next month
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const dueDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-15T00:00:00.000Z`;
  
  return { billDate, dueDate };
}

async function addUtilityBills() {
  console.log("🏠 Starting utility bill import...");
  console.log(`📋 Property ID: ${PROPERTY_ID}`);
  console.log(`📊 Total bills to add: ${billsToAdd.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  let totalAmount = 0;
  
  for (const bill of billsToAdd) {
    try {
      const { billDate, dueDate } = getDatesForMonth(bill.month);
      
      // Call the Convex mutation to add the bill
      const result = await client.mutation("utilityBills:addUtilityBill", {
        propertyId: PROPERTY_ID,
        utilityType: bill.type,
        provider: bill.provider,
        billMonth: bill.month,
        totalAmount: bill.amount,
        dueDate: dueDate,
        billDate: billDate,
        billingPeriod: "monthly",
        landlordPaidUtilityCompany: true, // Mark as paid
        landlordPaidDate: billDate,
        notes: `Imported from 2025 spreadsheet - ${bill.type} ${bill.month}`
      });
      
      console.log(`✅ Added ${bill.type} ${bill.month}: $${bill.amount}`);
      successCount++;
      totalAmount += bill.amount;
      
    } catch (error) {
      console.error(`❌ Failed to add ${bill.type} ${bill.month}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log("\n🎉 Import Summary:");
  console.log(`✅ Successfully added: ${successCount} bills`);
  console.log(`❌ Errors: ${errorCount} bills`);
  console.log(`💰 Total amount: $${totalAmount.toFixed(2)}`);
  
  return { successCount, errorCount, totalAmount };
}

// Check environment
if (!process.env.CONVEX_URL) {
  console.log("⚠️  CONVEX_URL not set in environment variables");
  console.log("🔧 Please set your Convex deployment URL:");
  console.log("   export CONVEX_URL=https://your-deployment.convex.cloud");
  console.log("\n💡 You can find your URL in the Convex dashboard");
  process.exit(1);
}

// Run the script
addUtilityBills()
  .then(() => {
    console.log("\n✅ Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });