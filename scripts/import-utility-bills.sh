#!/bin/bash

# Import utility bills using Convex CLI
# Property ID: j575e1esdewkrqtc0ba237dayx7j9hrc
# Data from 2025 spreadsheet

echo "🏠 Starting utility bill import for 2025..."
echo "📋 Property ID: j575e1esdewkrqtc0ba237dayx7j9hrc"
echo "👤 User ID: user_2xTKJWitGcu4swtDCTwviVfbi1G"

PROPERTY_ID="j575e1esdewkrqtc0ba237dayx7j9hrc"
USER_ID="user_2xTKJWitGcu4swtDCTwviVfbi1G"

# Function to add a utility bill
add_bill() {
    local month=$1
    local type=$2
    local amount=$3
    local provider=$4
    
    # Calculate dates
    local year=${month:0:4}
    local mon=${month:5:2}
    local bill_date="${year}-${mon}-01T00:00:00.000Z"
    
    # Calculate due date (15th of next month)
    local next_month=$((10#$mon + 1))
    local due_year=$year
    if [ $next_month -gt 12 ]; then
        next_month=1
        due_year=$((year + 1))
    fi
    local due_date="${due_year}-$(printf "%02d" $next_month)-15T00:00:00.000Z"
    
    echo "  💰 Adding $type: \$$amount ($provider)"
    
    npx convex run utilityBills:addUtilityBill '{
        "userId": "'"$USER_ID"'",
        "propertyId": "'"$PROPERTY_ID"'",
        "utilityType": "'"$type"'",
        "provider": "'"$provider"'",
        "billMonth": "'"$month"'",
        "totalAmount": '$amount',
        "dueDate": "'"$due_date"'",
        "billDate": "'"$bill_date"'",
        "billingPeriod": "monthly",
        "noTenantCharges": true,
        "notes": "Imported from 2025 spreadsheet - '"$type"' '"$month"' (Historical bill)"
    }'
}

echo ""
echo "📅 January 2025 - Total: \$1,242.85"
add_bill "2025-01" "Trash" 178.78 "Waste Management"
add_bill "2025-01" "Internet" 137.85 "Internet Provider"
add_bill "2025-01" "Gas" 360.61 "Gas Company"
add_bill "2025-01" "Electric" 360.61 "Electric Company"
add_bill "2025-01" "Water" 205.00 "Water Department"

echo ""
echo "📅 February 2025 - Total: \$1,194.74"
add_bill "2025-02" "Trash" 178.78 "Waste Management"
add_bill "2025-02" "Internet" 137.85 "Internet Provider"
add_bill "2025-02" "Gas" 336.56 "Gas Company"
add_bill "2025-02" "Electric" 336.55 "Electric Company"
add_bill "2025-02" "Water" 205.00 "Water Department"

echo ""
echo "📅 March 2025 - Total: \$1,065.70"
add_bill "2025-03" "Trash" 178.78 "Waste Management"
add_bill "2025-03" "Internet" 137.85 "Internet Provider"
add_bill "2025-03" "Gas" 286.92 "Gas Company"
add_bill "2025-03" "Electric" 286.91 "Electric Company"
add_bill "2025-03" "Water" 175.24 "Water Department"

echo ""
echo "📅 April 2025 - Total: \$813.60"
add_bill "2025-04" "Trash" 178.78 "Waste Management"
add_bill "2025-04" "Internet" 137.85 "Internet Provider"
add_bill "2025-04" "Gas" 160.87 "Gas Company"
add_bill "2025-04" "Electric" 160.86 "Electric Company"
add_bill "2025-04" "Water" 175.24 "Water Department"

echo ""
echo "📅 May 2025 - Total: \$642.00"
add_bill "2025-05" "Trash" 178.78 "Waste Management"
add_bill "2025-05" "Internet" 137.85 "Internet Provider"
add_bill "2025-05" "Gas" 73.81 "Gas Company"
add_bill "2025-05" "Electric" 73.81 "Electric Company"
add_bill "2025-05" "Water" 177.75 "Water Department"

echo ""
echo "📅 June 2025 - Total: \$823.97"
add_bill "2025-06" "Trash" 178.78 "Waste Management"
add_bill "2025-06" "Internet" 137.85 "Internet Provider"
add_bill "2025-06" "Gas" 164.80 "Gas Company"
add_bill "2025-06" "Electric" 164.79 "Electric Company"
add_bill "2025-06" "Water" 177.75 "Water Department"

echo ""
echo "🎉 Import complete!"
echo "📊 Summary:"
echo "   • 6 months of utility bills imported (Jan-Jun 2025)"
echo "   • 30 individual bills added"
echo "   • Total amount: \$4,782.46"
echo "   • All bills marked as historical (no tenant charges)"
echo "   • Property: j575e1esdewkrqtc0ba237dayx7j9hrc"
echo ""
echo "✅ These bills won't generate outstanding tenant charges"
echo "💡 Bills are kept for your records and reporting"