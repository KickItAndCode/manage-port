#!/usr/bin/env node

/**
 * Standalone script to add utility bills for 2025
 * Based on spreadsheet data provided by user
 * 
 * Property ID: j575e1esdewkrqtc0ba237dayx7j9hrc
 * Bills: January 2025 - June 2025 (non-zero amounts only)
 * Status: All marked as paid (landlordPaidUtilityCompany: true)
 */

const { ConvexHttpClient } = require("convex/browser");
const { api } = require("../convex/_generated/api");

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL || "your-convex-url-here");

// Utility bill data from spreadsheet
const utilityBillsData = [
  // January 2025 - $1,242.85 total
  {
    month: "2025-01",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 360.61, provider: "Gas Company" }, // 50% of $721.22
      { type: "Electric", amount: 360.61, provider: "Electric Company" }, // 50% of $721.22
      { type: "Water", amount: 205.00, provider: "Water Department" }
    ]
  },
  // February 2025 - $1,194.74 total
  {
    month: "2025-02",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 336.56, provider: "Gas Company" }, // 50% of $673.11
      { type: "Electric", amount: 336.55, provider: "Electric Company" }, // 50% of $673.11
      { type: "Water", amount: 205.00, provider: "Water Department" }
    ]
  },
  // March 2025 - $1,065.70 total
  {
    month: "2025-03",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 286.92, provider: "Gas Company" }, // 50% of $573.83
      { type: "Electric", amount: 286.91, provider: "Electric Company" }, // 50% of $573.83
      { type: "Water", amount: 175.24, provider: "Water Department" }
    ]
  },
  // April 2025 - $813.60 total
  {
    month: "2025-04",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 160.87, provider: "Gas Company" }, // 50% of $321.73
      { type: "Electric", amount: 160.86, provider: "Electric Company" }, // 50% of $321.73
      { type: "Water", amount: 175.24, provider: "Water Department" }
    ]
  },
  // May 2025 - $642.00 total
  {
    month: "2025-05",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 73.81, provider: "Gas Company" }, // 50% of $147.62
      { type: "Electric", amount: 73.81, provider: "Electric Company" }, // 50% of $147.62
      { type: "Water", amount: 177.75, provider: "Water Department" }
    ]
  },
  // June 2025 - $823.97 total
  {
    month: "2025-06",
    bills: [
      { type: "Trash", amount: 178.78, provider: "WM (Waste Management)" },
      { type: "Internet", amount: 137.85, provider: "Internet Service Provider" },
      { type: "Gas", amount: 164.80, provider: "Gas Company" }, // 50% of $329.59
      { type: "Electric", amount: 164.79, provider: "Electric Company" }, // 50% of $329.59
      { type: "Water", amount: 177.75, provider: "Water Department" }
    ]
  }
];

const PROPERTY_ID = "j575e1esdewkrqtc0ba237dayx7j9hrc";

async function addUtilityBills() {
  try {
    console.log("🏠 Starting utility bill import for 2025...");
    console.log(`📋 Property ID: ${PROPERTY_ID}`);
    console.log(`📅 Period: January 2025 - June 2025`);
    
    let totalBillsAdded = 0;
    let totalAmount = 0;

    for (const monthData of utilityBillsData) {
      console.log(`\n📅 Processing ${monthData.month}...`);
      
      // Calculate due date (15th of following month)
      const [year, month] = monthData.month.split('-');
      const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const dueDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-15T00:00:00.000Z`;
      
      // Bill date (1st of current month)
      const billDate = `${year}-${month}-01T00:00:00.000Z`;
      
      for (const bill of monthData.bills) {
        try {
          console.log(`  💰 Adding ${bill.type}: $${bill.amount} (${bill.provider})`);
          
          // Create individual utility bill using the addUtilityBill mutation
          await client.mutation(api.utilityBills.addUtilityBill, {
            propertyId: PROPERTY_ID,
            utilityType: bill.type,
            provider: bill.provider,
            billMonth: monthData.month,
            totalAmount: bill.amount,
            dueDate: dueDate,
            billDate: billDate,
            billingPeriod: bill.type === "Trash" ? "quarterly" : bill.type === "Water" ? "bi-monthly" : "monthly",
            landlordPaidUtilityCompany: true, // Mark as paid
            landlordPaidDate: billDate, // Paid on bill date
            notes: `Imported from 2025 spreadsheet data - ${bill.type} bill for ${monthData.month}`
          });
          
          totalBillsAdded++;
          totalAmount += bill.amount;
          
        } catch (error) {
          console.error(`  ❌ Error adding ${bill.type} bill for ${monthData.month}:`, error.message);
          // Continue with other bills even if one fails
        }
      }
      
      const monthTotal = monthData.bills.reduce((sum, bill) => sum + bill.amount, 0);
      console.log(`  ✅ Month total: $${monthTotal.toFixed(2)}`);
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Bills added: ${totalBillsAdded}`);
    console.log(`   • Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`   • Period: January 2025 - June 2025`);
    console.log(`   • Status: All bills marked as paid`);
    
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Validate environment
if (!process.env.CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL environment variable is required");
  console.log("💡 Set it with: export CONVEX_URL=your-convex-deployment-url");
  process.exit(1);
}

// Run the script
if (require.main === module) {
  addUtilityBills()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { addUtilityBills };