# Wheel Strategy Trade Wizard - Product Requirements Document

## Table of Contents
1. [Overview](#overview)
2. [Product Goals](#product-goals)
3. [User Stories](#user-stories)
4. [Technical Architecture](#technical-architecture)
5. [Phase-by-Phase Specifications](#phase-by-phase-specifications)
6. [Component Specifications](#component-specifications)
7. [Data Models](#data-models)
8. [UI/UX Requirements](#uiux-requirements)
9. [Validation Rules](#validation-rules)
10. [Performance Requirements](#performance-requirements)
11. [Integration Requirements](#integration-requirements)
12. [Implementation Checklist](#implementation-checklist)

## Overview

### Product Vision
Create a comprehensive, professional-grade options trading wizard that guides users through end-to-end wheel strategy implementation, from stock selection to multi-position portfolio tracking, based on research-backed criteria for generating 15-22% annual returns.

### Success Metrics
- Time from stock idea to validated trade setup: < 5 minutes
- Portfolio compliance with research-based allocation rules: 100%
- Automated detection of roll opportunities: Real-time
- User completion rate through all phases: > 80%

### Target Users
- Individual investors with $50K-$500K portfolios
- Options traders seeking systematic income strategies
- Real estate investors diversifying into equities
- Financial advisors managing client portfolios

## Product Goals

### Primary Goals
1. **Systematic Trade Validation**: Ensure every trade meets professional wheel strategy criteria
2. **Risk Management**: Prevent over-concentration and maintain portfolio balance
3. **Education**: Guide users through professional-grade analysis and decision-making
4. **Performance Tracking**: Monitor returns, risk metrics, and portfolio health

### Secondary Goals
1. **Tax Optimization**: Highlight Section 1256 opportunities
2. **Automation**: Reduce manual calculations and decision fatigue
3. **Compliance**: Maintain position sizing and sector allocation rules
4. **Scalability**: Support growth from $150K to $500K+ portfolios

## User Stories

### Epic 1: Stock Analysis & Selection
- **As a trader**, I want to search for stocks and see real-time validation against wheel criteria, so I can quickly identify suitable candidates
- **As a risk manager**, I want to see comprehensive fundamental analysis with weighted scoring, so I can assess financial health
- **As an investor**, I want historical charts and key ratios displayed clearly, so I can make informed decisions

### Epic 2: Options Analysis & Trade Setup
- **As an options trader**, I want to see complete options chains with delta/premium analysis, so I can select optimal strikes
- **As a portfolio manager**, I want position sizing controls and return calculations, so I can manage capital allocation
- **As a trader**, I want assignment probability and risk metrics, so I can understand trade outcomes

### Epic 3: Portfolio Management
- **As a portfolio manager**, I want real-time portfolio overview with sector allocation, so I can maintain diversification
- **As a trader**, I want to track positions across all wheel phases, so I can manage the complete cycle
- **As a risk manager**, I want alerts for concentration limits and roll opportunities, so I can take timely action

### Epic 4: Risk Monitoring
- **As a risk manager**, I want real-time portfolio delta and correlation monitoring, so I can maintain risk parameters
- **As a trader**, I want drawdown tracking and Sharpe ratio calculations, so I can measure performance
- **As a portfolio manager**, I want automated alerts for risk threshold breaches, so I can respond quickly

## Technical Architecture

### Frontend Stack
- **Framework**: React/Next.js with TypeScript
- **UI Library**: shadcn/ui components with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: React hooks and context

### Component Hierarchy
```
WheelWizardPage
├── WizardPhaseNavigation
├── WheelWizardStep (Base Component)
│   ├── StockSelectionStep
│   ├── FinancialValidationStep
│   ├── PremiumAnalysisStep
│   └── PortfolioReviewStep
└── TabsComponent
    ├── PortfolioDashboard
    └── RiskManagementDashboard
```

### Data Flow
1. **Stock Selection**: User search → API validation → Wizard state update
2. **Financial Analysis**: Stock data → Validation engine → Weighted scoring
3. **Premium Analysis**: Options chain → Calculator → Position analysis
4. **Portfolio Management**: Position data → Dashboard → Risk monitoring

## Phase-by-Phase Specifications

### Phase 1: Overview
**Purpose**: Introduce wheel strategy and set expectations

**Components**:
- Strategy overview with 3-step process visualization
- Expected performance metrics (15-22% returns, Sharpe ratio 1.08)
- Risk disclosure and disclaimers
- Visual progress indicators

**Data Requirements**: Static educational content

**Validation**: User acknowledgment (automatic progression)

### Phase 2: Stock Selection
**Purpose**: Find and validate wheel strategy candidates

**Components**:
- Real-time stock search with auto-complete
- Comprehensive validation grid with pass/warning/fail indicators
- Stock metrics display (price, market cap, volume, beta)
- Validation scoring system (60% minimum to proceed)

**Data Requirements**:
```typescript
interface StockData {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume: number;
  beta: number;
  dividend?: number;
  sector: string;
  optionsVolume?: number;
  bidAskSpread?: number;
}
```

**Validation Criteria**:
- Market cap > $10B (Pass/Fail)
- Daily volume > 1M shares (Pass/Fail)
- Beta 0.7-1.2 (Pass/Warning/Fail)
- Options volume > 5K contracts (Pass/Warning/Fail)
- Bid-ask spread < $0.05 (Pass/Warning/Fail)

### Phase 3: Financial Validation
**Purpose**: Validate fundamental financial health

**Components**:
- Weighted scoring system with progress bars
- Historical revenue and earnings charts
- Key financial ratios display
- Pass/warning/fail recommendations

**Data Requirements**:
```typescript
interface FinancialData {
  debtToEquity: number;
  profitability: {
    years: number;
    consistent: boolean;
    avgROE: number;
  };
  dividendYield: number;
  payoutRatio: number;
  ivRank: number;
  priceVs52Week: {
    current: number;
    low: number;
    high: number;
    position: number;
  };
  creditRating: string;
  revenue: Array<{ year: string; value: number }>;
  earnings: Array<{ year: string; value: number }>;
}
```

**Validation Criteria**:
- Debt-to-equity < 0.5 (20% weight)
- Consistent profitability 3-5 years (25% weight)
- Dividend yield 2-4% (15% weight)
- Payout ratio < 60% (15% weight)
- IV rank > 50% (15% weight)
- 52-week position 25-75% (10% weight)

### Phase 4: Premium Analysis
**Purpose**: Calculate optimal strike selection and returns

**Components**:
- Position sizing sliders ($5K-$50K range)
- Target delta adjustment (0.10-0.35)
- Days to expiration selection (21-60 days)
- Interactive options chain table
- Real-time analysis results

**Data Requirements**:
```typescript
interface OptionsChain {
  strike: number;
  delta: number;
  premium: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  iv: number;
  assignmentProbability: number;
}

interface PremiumAnalysis {
  optimalStrike: number;
  premiumCollected: number;
  monthlyReturn: number;
  annualizedReturn: number;
  costBasis: number;
  assignmentRisk: number;
  maxProfit: number;
  breakeven: number;
  daysToExpiration: number;
}
```

**Calculations**:
- Contracts = floor(positionSize / (strike × 100))
- Premium collected = premium × contracts × 100
- Monthly return = (premium / capitalRequired) × 100
- Annualized return = monthlyReturn × 12
- Cost basis = strike - premium

### Phase 5: Portfolio Review
**Purpose**: Manage positions and monitor risk

**Components**:
- Tabbed interface (Portfolio Dashboard | Risk Management)
- Real-time portfolio metrics
- Position tracking across all wheel phases
- Risk alerts and recommendations

## Component Specifications

### WheelWizardStep (Base Component)
**Props**:
```typescript
interface WheelWizardStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  isNextEnabled?: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  showNavigation?: boolean;
}
```

**Functionality**:
- Consistent step layout with header, content, and navigation
- Conditional button rendering
- Progress validation before advancement

### StockSelectionStep
**Features**:
- Searchable dropdown with stock filtering
- Real-time validation against criteria
- Visual status indicators (green/yellow/red)
- Overall score calculation and display

**State Management**:
```typescript
const [open, setOpen] = useState(false);
const [searchValue, setSearchValue] = useState("");
const [filteredStocks, setFilteredStocks] = useState<StockData[]>([]);
const [selectedStockData, setSelectedStockData] = useState<StockData | null>(null);
const [validationResults, setValidationResults] = useState<any>(null);
```

### FinancialValidationStep
**Features**:
- Weighted scoring system with visual progress
- Historical chart integration (Recharts)
- Detailed criteria breakdown
- Recommendation engine based on scores

**Scoring Algorithm**:
```typescript
const calculateOverallScore = (criteria: ValidationCriteria): number => {
  let totalWeight = 0;
  let weightedScore = 0;
  
  Object.values(criteria).forEach(criterion => {
    totalWeight += criterion.weight;
    const points = criterion.status === 'pass' ? 100 : 
                  criterion.status === 'warning' ? 70 : 30;
    weightedScore += (points * criterion.weight);
  });
  
  return weightedScore / totalWeight;
};
```

### PremiumAnalysisStep
**Features**:
- Interactive sliders for position configuration
- Options chain table with sorting and selection
- Real-time calculation engine
- Risk/reward visualization

**Key Controls**:
- Position Size: Slider component ($5K-$50K, $1K increments)
- Target Delta: Slider component (0.10-0.35, 0.05 increments)
- Days to Expiration: Slider component (21-60 days, 7-day increments)

### PortfolioDashboard
**Features**:
- Portfolio overview cards with key metrics
- Sector allocation pie chart
- Monthly performance bar chart
- Position tracking table with phase indicators

**Key Metrics**:
- Total capital and deployment percentage
- Monthly and annualized returns
- Win rate and active positions
- Capital allocation progress bar

### RiskManagementDashboard
**Features**:
- Risk alerts system with priority levels
- Portfolio risk metrics grid
- Historical drawdown and delta charts
- Position-level risk analysis table

**Risk Alerts**:
- ERROR: Requires immediate action
- WARNING: Attention needed
- INFO: Informational updates

## Data Models

### Wizard State
```typescript
interface WizardState {
  phase: WizardPhase;
  selectedStock: string | null;
  stockData: StockData | null;
  validationResults: ValidationResults | null;
  financialData: FinancialData | null;
  financialValidation: ValidationCriteria | null;
  financialScore: number;
  premiumAnalysis: PremiumAnalysis | null;
  selectedOption: OptionsChain | null;
  positionSize: number;
  contracts: number;
  portfolioData: PortfolioMetrics | null;
  isComplete: boolean;
}
```

### Position Tracking
```typescript
interface Position {
  id: string;
  symbol: string;
  phase: 'PUT_SOLD' | 'ASSIGNED' | 'CALL_SOLD' | 'COMPLETED';
  strike: number;
  premium: number;
  contracts: number;
  expiration: string;
  daysToExpiration: number;
  currentPnL: number;
  status: 'ACTIVE' | 'EXPIRED' | 'ASSIGNED' | 'CALLED_AWAY';
  sector: string;
}
```

### Portfolio Metrics
```typescript
interface PortfolioMetrics {
  totalCapital: number;
  deployedCapital: number;
  availableCash: number;
  totalPremiumCollected: number;
  monthlyReturn: number;
  annualizedReturn: number;
  totalPositions: number;
  activePositions: number;
  winRate: number;
  avgDaysToExpiration: number;
}
```

### Risk Metrics
```typescript
interface RiskMetrics {
  portfolioDelta: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  correlationRisk: number;
  concentrationRisk: number;
  cashReserve: number;
  marginUtilization: number;
}
```

## UI/UX Requirements

### Design System
- **Colors**: Use existing shadcn/ui color palette
- **Typography**: Geist Sans font family
- **Spacing**: Tailwind spacing scale (0.25rem increments)
- **Radius**: Consistent border radius (0.5rem default)

### Visual Hierarchy
- **Primary**: Main wizard navigation and phase headers
- **Secondary**: Step content and form elements
- **Tertiary**: Supporting text and metadata

### Status Indicators
- **Success/Pass**: Green (#10b981)
- **Warning**: Yellow/Amber (#f59e0b)
- **Error/Fail**: Red (#ef4444)
- **Info**: Blue (#3b82f6)
- **Neutral**: Gray (#6b7280)

### Responsive Breakpoints
- **Mobile**: < 768px (card layouts, vertical stacking)
- **Tablet**: 768px - 1024px (hybrid layouts)
- **Desktop**: > 1024px (full table and grid layouts)

### Animation Guidelines
- **Transitions**: 200-300ms ease-in-out
- **Hover Effects**: Scale 1.05, opacity changes
- **Loading States**: Skeleton components and progress bars
- **State Changes**: Smooth color and size transitions

### Accessibility
- **ARIA Labels**: All interactive elements labeled
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and role attributes
- **Color Contrast**: WCAG 2.1 AA compliance

## Validation Rules

### Stock Selection Validation
```typescript
const validateStock = (stock: StockData) => ({
  marketCap: {
    status: stock.marketCap >= 10e9 ? 'pass' : 'fail',
    label: 'Market Cap > $10B'
  },
  volume: {
    status: stock.volume >= 1e6 ? 'pass' : 'fail',
    label: 'Daily Volume > 1M'
  },
  beta: {
    status: stock.beta >= 0.7 && stock.beta <= 1.2 ? 'pass' : 'warning',
    label: 'Beta 0.7-1.2'
  },
  optionsVolume: {
    status: (stock.optionsVolume || 0) >= 5000 ? 'pass' : 'warning',
    label: 'Options Volume > 5K'
  },
  bidAskSpread: {
    status: (stock.bidAskSpread || 0.1) <= 0.05 ? 'pass' : 'warning',
    label: 'Bid-Ask Spread < $0.05'
  }
});
```

### Financial Validation Rules
- **Minimum Score**: 70% to proceed to next phase
- **Weight Distribution**: Profitability (25%), Debt (20%), Dividends (15%), Payout (15%), IV (15%), Price Position (10%)
- **Pass Threshold**: 85% = Excellent, 70% = Good, <70% = Proceed with Caution

### Premium Analysis Validation
- **Minimum Premium**: 1% monthly target
- **Optimal Delta Range**: 0.15-0.30 for put selling
- **DTE Range**: 30-45 days optimal
- **Position Size**: 5-10% of portfolio maximum

### Portfolio Risk Limits
- **Individual Stock**: Maximum 10% of portfolio
- **Sector Concentration**: Maximum 20% per sector
- **Portfolio Delta**: Target range 0.20-0.40
- **Cash Reserves**: Minimum 20%, target 20-30%

## Performance Requirements

### Loading Times
- **Initial Page Load**: < 2 seconds
- **Phase Transitions**: < 500ms
- **Data Calculations**: < 1 second
- **Chart Rendering**: < 1 second

### Data Refresh
- **Stock Prices**: Real-time during market hours
- **Options Data**: 15-minute delay acceptable
- **Portfolio Metrics**: Real-time updates
- **Risk Calculations**: < 500ms

### Scalability
- **Portfolio Size**: Support 50+ positions
- **Historical Data**: 5 years minimum
- **Concurrent Users**: Designed for single-user sessions
- **Data Storage**: Local state management sufficient

## Integration Requirements

### Navigation Integration
```typescript
// Add to ResponsiveSidebar.tsx navItems array
{ 
  label: "Wheel Wizard", 
  href: "/wheel-wizard", 
  icon: TrendingUp 
}
```

### Dependencies
```json
{
  "cmdk": "^1.1.1",
  "@radix-ui/react-popover": "^1.1.14",
  "@radix-ui/react-slider": "^1.3.5",
  "recharts": "^2.15.3"
}
```

### API Integration Points
- **Stock Data**: Financial data provider API
- **Options Data**: Options chain data provider
- **Portfolio Storage**: Database persistence layer
- **Risk Calculations**: Real-time calculation engine

### Component Dependencies
```typescript
// Required UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

## Implementation Checklist

### Phase 1: Setup and Foundation
- [ ] Create main wizard page at `/app/wheel-wizard/page.tsx`
- [ ] Implement WizardPhase enum and WizardState interface
- [ ] Add navigation integration to ResponsiveSidebar
- [ ] Install required dependencies (cmdk, @radix-ui/react-popover)
- [ ] Create base WheelWizardStep component

### Phase 2: Core Wizard Steps
- [ ] Implement StockSelectionStep with search and validation
- [ ] Create FinancialValidationStep with scoring system
- [ ] Build PremiumAnalysisStep with options analysis
- [ ] Add interactive controls (sliders, tables, charts)
- [ ] Implement validation logic and progression gates

### Phase 3: Portfolio Management
- [ ] Create PortfolioDashboard component
- [ ] Implement RiskManagementDashboard
- [ ] Add real-time portfolio metrics
- [ ] Create position tracking system
- [ ] Implement risk alerts and monitoring

### Phase 4: UI Components
- [ ] Create or verify Command component exists
- [ ] Create or verify Popover component exists
- [ ] Style all components with shadcn/ui system
- [ ] Add responsive design for mobile/tablet
- [ ] Implement loading states and animations

### Phase 5: Integration and Testing
- [ ] Test all phase transitions and validations
- [ ] Verify TypeScript compilation
- [ ] Test responsive design across devices
- [ ] Validate calculation accuracy
- [ ] Test navigation integration

### Phase 6: Data and Persistence
- [ ] Design database schemas for position tracking
- [ ] Implement data persistence layer
- [ ] Add real-time data integration
- [ ] Create backup and recovery systems
- [ ] Implement performance monitoring

### File Structure
```
src/
├── app/
│   └── wheel-wizard/
│       └── page.tsx
├── components/
│   ├── ui/
│   │   ├── command.tsx
│   │   └── popover.tsx
│   └── wheel-wizard/
│       ├── WheelWizardStep.tsx
│       ├── StockSelectionStep.tsx
│       ├── FinancialValidationStep.tsx
│       ├── PremiumAnalysisStep.tsx
│       ├── PortfolioDashboard.tsx
│       └── RiskManagementDashboard.tsx
└── types/
    └── wheel-wizard.ts
```

### Environment Setup
```bash
# Install dependencies
npm install cmdk @radix-ui/react-popover

# Development server
npm run dev

# Build and test
npm run build
npm run lint
```

## Success Criteria

### Functional Requirements
✅ Complete 5-phase wizard with validation gates  
✅ Real-time stock search and fundamental analysis  
✅ Interactive options analysis with return calculations  
✅ Portfolio dashboard with risk monitoring  
✅ Responsive design across all device sizes  

### Quality Requirements
✅ TypeScript compilation with zero errors  
✅ Consistent UI using shadcn/ui design system  
✅ Professional-grade calculations and validations  
✅ Performance optimization for smooth user experience  
✅ Accessibility compliance with WCAG guidelines  

### Business Requirements
✅ Target 15-22% annual returns through systematic approach  
✅ Risk management with automated alerts and limits  
✅ Educational value with guided decision-making  
✅ Scalable architecture for portfolio growth  
✅ Integration with existing property management platform  

This PRD provides complete specifications for recreating the Wheel Strategy Trade Wizard with all features, components, validation logic, and integration requirements.