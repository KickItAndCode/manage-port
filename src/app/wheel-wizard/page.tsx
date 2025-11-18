"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Search, 
  Calculator, 
  PieChart, 
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Target,
  Sparkles
} from "lucide-react";
import { WheelWizardStep } from "@/components/wheel-wizard/WheelWizardStep";
import { StockSelectionStep } from "@/components/wheel-wizard/StockSelectionStep";
import { FinancialValidationStep } from "@/components/wheel-wizard/FinancialValidationStep";
import { PremiumAnalysisStep } from "@/components/wheel-wizard/PremiumAnalysisStep";
import { PortfolioDashboard } from "@/components/wheel-wizard/PortfolioDashboard";
import { RiskManagementDashboard } from "@/components/wheel-wizard/RiskManagementDashboard";

// Wizard phases corresponding to wheel strategy stages
enum WizardPhase {
  OVERVIEW = "overview",
  STOCK_SELECTION = "stock-selection", 
  FINANCIAL_VALIDATION = "financial-validation",
  PREMIUM_ANALYSIS = "premium-analysis",
  PORTFOLIO_REVIEW = "portfolio-review"
}

// Wizard state interface
interface WizardState {
  phase: WizardPhase;
  selectedStock: string | null;
  stockData: any;
  validationResults: any;
  premiumAnalysis: any;
  portfolioData: any;
  isComplete: boolean;
}

const phases = [
  {
    id: WizardPhase.OVERVIEW,
    title: "Overview",
    description: "Understanding the Wheel Strategy",
    icon: <Sparkles className="h-5 w-5" />,
    color: "blue"
  },
  {
    id: WizardPhase.STOCK_SELECTION,
    title: "Stock Selection",
    description: "Find and validate wheel candidates",
    icon: <Search className="h-5 w-5" />,
    color: "green"
  },
  {
    id: WizardPhase.FINANCIAL_VALIDATION,
    title: "Financial Analysis",
    description: "Validate fundamental criteria",
    icon: <Calculator className="h-5 w-5" />,
    color: "purple"
  },
  {
    id: WizardPhase.PREMIUM_ANALYSIS,
    title: "Premium Analysis",
    description: "Calculate returns and risk",
    icon: <Target className="h-5 w-5" />,
    color: "orange"
  },
  {
    id: WizardPhase.PORTFOLIO_REVIEW,
    title: "Portfolio Review",
    description: "Manage positions and track performance",
    icon: <PieChart className="h-5 w-5" />,
    color: "red"
  }
];

export default function WheelWizardPage() {
  const { user } = useUser();
  const [wizardState, setWizardState] = useState<WizardState>({
    phase: WizardPhase.OVERVIEW,
    selectedStock: null,
    stockData: null,
    validationResults: null,
    premiumAnalysis: null,
    portfolioData: null,
    isComplete: false
  });

  const currentPhaseIndex = phases.findIndex(p => p.id === wizardState.phase);
  const progress = ((currentPhaseIndex + 1) / phases.length) * 100;

  const goToNext = () => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < phases.length) {
      setWizardState(prev => ({
        ...prev,
        phase: phases[nextIndex].id
      }));
    }
  };

  const goToPrevious = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setWizardState(prev => ({
        ...prev,
        phase: phases[prevIndex].id
      }));
    }
  };

  const updateWizardState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to access the Wheel Wizard</h2>
          <p className="text-muted-foreground">You need to be signed in to use the options trading tools.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                Wheel Strategy Wizard
              </h1>
              <p className="text-muted-foreground mt-2">
                Professional-grade options trading with systematic risk management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                ${(150000).toLocaleString()} Capital
              </Badge>
              <Badge variant="outline" className="text-sm">
                15-22% Target Returns
              </Badge>
            </div>
          </div>
        </header>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              Step {currentPhaseIndex + 1} of {phases.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Phase Navigation */}
          <div className="flex items-center justify-between mt-6 overflow-x-auto pb-2">
            {phases.map((phase, index) => {
              const isActive = phase.id === wizardState.phase;
              const isCompleted = index < currentPhaseIndex;
              const isAccessible = index <= currentPhaseIndex;
              
              return (
                <button
                  key={phase.id}
                  onClick={() => isAccessible && setWizardState(prev => ({ ...prev, phase: phase.id }))}
                  disabled={!isAccessible}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all min-w-[120px] ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                      : isCompleted
                      ? 'bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : isAccessible
                      ? 'hover:bg-muted/50'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    isActive ? 'bg-primary-foreground/20' : 
                    isCompleted ? 'bg-green-200 dark:bg-green-800' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      phase.icon
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{phase.title}</div>
                    <div className="text-xs opacity-80">{phase.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {wizardState.phase === WizardPhase.OVERVIEW && (
            <WheelWizardStep
              title="Welcome to the Wheel Strategy"
              description="A systematic approach to generating 15-22% annual returns through options trading"
              onNext={goToNext}
              isNextEnabled={true}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategy Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Strategy Overview
                    </CardTitle>
                    <CardDescription>
                      The wheel strategy combines cash-secured puts and covered calls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                          1
                        </div>
                        <div>
                          <div className="font-medium">Sell Cash-Secured Puts</div>
                          <div className="text-sm text-muted-foreground">
                            Collect premium while potentially acquiring quality stocks at discounts
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400">
                          2
                        </div>
                        <div>
                          <div className="font-medium">Own Quality Stocks</div>
                          <div className="text-sm text-muted-foreground">
                            Hold assigned shares and collect dividends during ownership
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
                          3
                        </div>
                        <div>
                          <div className="font-medium">Sell Covered Calls</div>
                          <div className="text-sm text-muted-foreground">
                            Generate additional income on stock positions
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      Expected Performance
                    </CardTitle>
                    <CardDescription>
                      Based on historical backtesting and research
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="text-2xl font-bold text-green-600">15-22%</div>
                        <div className="text-sm text-muted-foreground">Annual Returns</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <div className="text-2xl font-bold text-blue-600">1.08</div>
                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                        <div className="text-2xl font-bold text-purple-600">20-35%</div>
                        <div className="text-sm text-muted-foreground">Max Drawdown</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <div className="text-2xl font-bold text-orange-600">70-80%</div>
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Risk Disclosure</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Options trading involves substantial risk and is not suitable for all investors.
                        Past performance does not guarantee future results.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </WheelWizardStep>
          )}

          {wizardState.phase === WizardPhase.STOCK_SELECTION && (
            <StockSelectionStep
              onNext={goToNext}
              onPrevious={goToPrevious}
              wizardState={wizardState}
              updateWizardState={updateWizardState}
            />
          )}

          {wizardState.phase === WizardPhase.FINANCIAL_VALIDATION && (
            <FinancialValidationStep
              onNext={goToNext}
              onPrevious={goToPrevious}
              wizardState={wizardState}
              updateWizardState={updateWizardState}
            />
          )}

          {wizardState.phase === WizardPhase.PREMIUM_ANALYSIS && (
            <PremiumAnalysisStep
              onNext={goToNext}
              onPrevious={goToPrevious}
              wizardState={wizardState}
              updateWizardState={updateWizardState}
            />
          )}

          {wizardState.phase === WizardPhase.PORTFOLIO_REVIEW && (
            <div className="space-y-6">
              <Tabs defaultValue="portfolio" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="portfolio">Portfolio Dashboard</TabsTrigger>
                  <TabsTrigger value="risk">Risk Management</TabsTrigger>
                </TabsList>
                <TabsContent value="portfolio" className="space-y-4">
                  <PortfolioDashboard userId={user.id} />
                </TabsContent>
                <TabsContent value="risk" className="space-y-4">
                  <RiskManagementDashboard userId={user.id} />
                </TabsContent>
              </Tabs>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={goToPrevious}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => setWizardState(prev => ({ ...prev, phase: WizardPhase.STOCK_SELECTION }))}
                  className="flex items-center gap-2"
                >
                  New Position
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}