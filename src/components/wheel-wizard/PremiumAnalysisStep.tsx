"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Target, 
  Calculator, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { WheelWizardStep } from "./WheelWizardStep";

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

interface WizardState {
  selectedStock: string | null;
  stockData: any;
  financialData: any;
  [key: string]: any;
}

interface PremiumAnalysisStepProps {
  onNext: () => void;
  onPrevious: () => void;
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

// Sample options data (in production, this would come from options data API)
const generateOptionsChain = (stockPrice: number, volatility: number): OptionsChain[] => {
  const strikes = [];
  const baseStrike = Math.floor(stockPrice / 5) * 5; // Round to nearest $5
  
  // Generate strikes from 15% below to 5% above current price
  for (let i = -6; i <= 2; i++) {
    const strike = baseStrike + (i * 5);
    if (strike > 0) {
      // Simple Black-Scholes approximation for demo
      const moneyness = strike / stockPrice;
      const delta = moneyness > 1 ? 0.05 + (1 - moneyness) * 0.4 : 0.5 - (moneyness - 1) * 0.4;
      const adjustedDelta = Math.max(0.05, Math.min(0.45, delta));
      
      // Premium calculation (simplified)
      const timeValue = (stockPrice * volatility * 0.3 * adjustedDelta) / 100;
      const intrinsicValue = Math.max(0, stockPrice - strike);
      const premium = timeValue + intrinsicValue;
      
      strikes.push({
        strike,
        delta: adjustedDelta,
        premium: premium,
        bid: premium * 0.98,
        ask: premium * 1.02,
        volume: Math.floor(Math.random() * 5000) + 100,
        openInterest: Math.floor(Math.random() * 10000) + 500,
        iv: volatility + (Math.random() * 10 - 5),
        assignmentProbability: adjustedDelta * 100
      });
    }
  }
  
  return strikes.sort((a, b) => b.strike - a.strike);
};

export function PremiumAnalysisStep({ 
  onNext, 
  onPrevious, 
  wizardState, 
  updateWizardState 
}: PremiumAnalysisStepProps) {
  const [positionSize, setPositionSize] = useState([10000]); // $10,000 default
  const [targetDelta, setTargetDelta] = useState([0.20]); // 20% delta default
  const [daysToExpiration, setDaysToExpiration] = useState([35]); // 35 DTE default
  const [optionsChain, setOptionsChain] = useState<OptionsChain[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionsChain | null>(null);
  const [analysis, setAnalysis] = useState<PremiumAnalysis | null>(null);

  useEffect(() => {
    if (wizardState.stockData) {
      // Generate options chain based on stock data
      const chain = generateOptionsChain(wizardState.stockData.price, 25); // 25% volatility assumption
      setOptionsChain(chain);
      
      // Auto-select optimal option based on target delta
      const optimal = chain.find(option => 
        option.delta >= targetDelta[0] * 0.9 && option.delta <= targetDelta[0] * 1.1
      );
      
      if (optimal) {
        setSelectedOption(optimal);
        calculateAnalysis(optimal, positionSize[0]);
      }
    }
  }, [wizardState.stockData, targetDelta, positionSize]);

  const calculateAnalysis = (option: OptionsChain, capital: number) => {
    const contracts = Math.floor(capital / (option.strike * 100));
    const premiumCollected = option.premium * contracts * 100;
    const capitalRequired = option.strike * contracts * 100;
    const monthlyReturn = (premiumCollected / capitalRequired) * 100;
    const annualizedReturn = monthlyReturn * 12; // Assuming monthly cycles
    
    const analysisData: PremiumAnalysis = {
      optimalStrike: option.strike,
      premiumCollected,
      monthlyReturn,
      annualizedReturn,
      costBasis: option.strike - option.premium,
      assignmentRisk: option.assignmentProbability,
      maxProfit: premiumCollected,
      breakeven: option.strike - option.premium,
      daysToExpiration: daysToExpiration[0]
    };
    
    setAnalysis(analysisData);
    
    // Update wizard state
    updateWizardState({
      premiumAnalysis: analysisData,
      selectedOption: option,
      positionSize: capital,
      contracts
    });
  };

  const handleOptionSelect = (option: OptionsChain) => {
    setSelectedOption(option);
    calculateAnalysis(option, positionSize[0]);
  };

  const isNextEnabled = selectedOption && analysis && analysis.monthlyReturn >= 1.0;

  if (!wizardState.selectedStock || !wizardState.stockData) {
    return (
      <WheelWizardStep
        title="Premium Analysis"
        description="Please complete stock selection and financial validation first"
        onPrevious={onPrevious}
        showNavigation={false}
      >
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Complete the previous steps to proceed with premium analysis.
            </p>
          </CardContent>
        </Card>
      </WheelWizardStep>
    );
  }

  return (
    <WheelWizardStep
      title="Premium Analysis & Strike Selection"
      description={`Optimize your wheel strategy for ${wizardState.selectedStock}`}
      onNext={onNext}
      onPrevious={onPrevious}
      isNextEnabled={isNextEnabled}
    >
      <div className="space-y-6">
        {/* Position Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Position Configuration
            </CardTitle>
            <CardDescription>
              Set your capital allocation and risk parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Position Size */}
              <div className="space-y-2">
                <Label>Position Size</Label>
                <div className="space-y-2">
                  <Slider
                    value={positionSize}
                    onValueChange={setPositionSize}
                    max={50000}
                    min={5000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>$5,000</span>
                    <span className="font-medium">${positionSize[0].toLocaleString()}</span>
                    <span>$50,000</span>
                  </div>
                </div>
              </div>

              {/* Target Delta */}
              <div className="space-y-2">
                <Label>Target Delta</Label>
                <div className="space-y-2">
                  <Slider
                    value={targetDelta}
                    onValueChange={setTargetDelta}
                    max={0.35}
                    min={0.10}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>0.10</span>
                    <span className="font-medium">{targetDelta[0].toFixed(2)}</span>
                    <span>0.35</span>
                  </div>
                </div>
              </div>

              {/* Days to Expiration */}
              <div className="space-y-2">
                <Label>Days to Expiration</Label>
                <div className="space-y-2">
                  <Slider
                    value={daysToExpiration}
                    onValueChange={setDaysToExpiration}
                    max={60}
                    min={21}
                    step={7}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>21</span>
                    <span className="font-medium">{daysToExpiration[0]} days</span>
                    <span>60</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options Chain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Put Options Chain
            </CardTitle>
            <CardDescription>
              Cash-secured put options for {wizardState.selectedStock} (${wizardState.stockData.price})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strike</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Bid/Ask</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Assignment %</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optionsChain.map((option) => {
                    const isOptimal = option.delta >= 0.15 && option.delta <= 0.30;
                    const isSelected = selectedOption?.strike === option.strike;
                    
                    return (
                      <TableRow 
                        key={option.strike}
                        className={`${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''} 
                                   ${isOptimal ? 'border-l-4 border-green-500' : ''}`}
                      >
                        <TableCell className="font-medium">
                          ${option.strike}
                          {isOptimal && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Optimal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{option.delta.toFixed(2)}</TableCell>
                        <TableCell>${option.premium.toFixed(2)}</TableCell>
                        <TableCell>
                          ${option.bid.toFixed(2)} / ${option.ask.toFixed(2)}
                        </TableCell>
                        <TableCell>{option.volume.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {option.assignmentProbability.toFixed(1)}%
                            <div className={`w-2 h-2 rounded-full ${
                              option.assignmentProbability <= 25 ? 'bg-green-500' :
                              option.assignmentProbability <= 35 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => handleOptionSelect(option)}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && selectedOption && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Trade Analysis
              </CardTitle>
              <CardDescription>
                Detailed analysis for ${selectedOption.strike} put option
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">
                    ${analysis.premiumCollected.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Premium Collected</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.monthlyReturn.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Return</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.annualizedReturn.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Annualized Return</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysis.assignmentRisk.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Assignment Risk</div>
                </div>
              </div>

              {/* Trade Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Strike Price:</span>
                      <span className="font-medium">${selectedOption.strike}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Premium per Contract:</span>
                      <span className="font-medium">${selectedOption.premium.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contracts:</span>
                      <span className="font-medium">{Math.floor(positionSize[0] / (selectedOption.strike * 100))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capital Required:</span>
                      <span className="font-medium">${(selectedOption.strike * Math.floor(positionSize[0] / (selectedOption.strike * 100)) * 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Cost Basis if Assigned:</span>
                      <span className="font-bold">${analysis.costBasis.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risk/Reward Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Profit:</span>
                      <span className="font-medium text-green-600">${analysis.maxProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Breakeven:</span>
                      <span className="font-medium">${analysis.breakeven.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Decay:</span>
                      <span className="font-medium text-green-600">Beneficial</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility Impact:</span>
                      <span className="font-medium">Negative (Good for seller)</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Overall Risk Level:</span>
                      <span className={`font-bold ${
                        analysis.assignmentRisk <= 25 ? 'text-green-600' :
                        analysis.assignmentRisk <= 35 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {analysis.assignmentRisk <= 25 ? 'Low' :
                         analysis.assignmentRisk <= 35 ? 'Moderate' : 'High'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardContent className="pt-6">
                  {analysis.monthlyReturn >= 2.0 ? (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Excellent Premium Opportunity</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        This trade offers strong premium income with {analysis.monthlyReturn.toFixed(1)}% monthly returns. 
                        The {analysis.assignmentRisk.toFixed(1)}% assignment probability provides good balance of income and risk.
                      </p>
                    </div>
                  ) : analysis.monthlyReturn >= 1.0 ? (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Good Premium Opportunity</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        This trade meets the 1% monthly premium target. Consider the assignment risk 
                        and ensure you're comfortable owning the stock at ${analysis.costBasis.toFixed(2)}.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Below Target Premium</span>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        The current premium of {analysis.monthlyReturn.toFixed(1)}% is below the 1% monthly target. 
                        Consider waiting for higher volatility or selecting a different strike.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

        {/* Strategy Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Wheel Strategy Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✓ Optimal Criteria</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Delta: 0.15-0.30 (15-30% assignment probability)</li>
                  <li>• Premium: 1-3% monthly target</li>
                  <li>• DTE: 30-45 days optimal</li>
                  <li>• High volume and open interest</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">⚠ Risk Considerations</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Be willing to own the stock</li>
                  <li>• Assignment risk increases near expiration</li>
                  <li>• Consider rolling if needed</li>
                  <li>• Monitor earnings and ex-dividend dates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WheelWizardStep>
  );
}