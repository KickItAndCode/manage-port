"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Calculator,
  Shield,
  DollarSign,
  Percent
} from "lucide-react";
import { WheelWizardStep } from "./WheelWizardStep";

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
    position: number; // percentage position in range
  };
  creditRating: string;
  revenue: Array<{ year: string; value: number }>;
  earnings: Array<{ year: string; value: number }>;
}

interface ValidationCriteria {
  debtToEquity: {
    value: number;
    target: number;
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
  profitability: {
    value: number;
    target: number;
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
  dividendYield: {
    value: number;
    target: [number, number];
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
  payoutRatio: {
    value: number;
    target: number;
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
  ivRank: {
    value: number;
    target: number;
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
  pricePosition: {
    value: number;
    target: [number, number];
    status: 'pass' | 'warning' | 'fail';
    label: string;
    weight: number;
  };
}

interface WizardState {
  selectedStock: string | null;
  stockData: any;
  validationResults: any;
  [key: string]: any;
}

interface FinancialValidationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

// Sample financial data (in production, this would come from financial APIs)
const getFinancialData = (symbol: string): FinancialData => {
  const sampleData: Record<string, FinancialData> = {
    AAPL: {
      debtToEquity: 0.32,
      profitability: { years: 5, consistent: true, avgROE: 28.5 },
      dividendYield: 0.49,
      payoutRatio: 15.8,
      ivRank: 45,
      priceVs52Week: { current: 195.89, low: 164.08, high: 199.62, position: 89.3 },
      creditRating: "AA+",
      revenue: [
        { year: "2019", value: 260.2 },
        { year: "2020", value: 274.5 },
        { year: "2021", value: 365.8 },
        { year: "2022", value: 394.3 },
        { year: "2023", value: 383.3 }
      ],
      earnings: [
        { year: "2019", value: 55.3 },
        { year: "2020", value: 57.4 },
        { year: "2021", value: 94.7 },
        { year: "2022", value: 99.8 },
        { year: "2023", value: 97.0 }
      ]
    },
    MSFT: {
      debtToEquity: 0.35,
      profitability: { years: 5, consistent: true, avgROE: 42.1 },
      dividendYield: 0.79,
      payoutRatio: 25.2,
      ivRank: 38,
      priceVs52Week: { current: 378.85, low: 309.45, high: 384.30, position: 92.7 },
      creditRating: "AAA",
      revenue: [
        { year: "2019", value: 125.8 },
        { year: "2020", value: 143.0 },
        { year: "2021", value: 168.1 },
        { year: "2022", value: 198.3 },
        { year: "2023", value: 211.9 }
      ],
      earnings: [
        { year: "2019", value: 39.2 },
        { year: "2020", value: 44.3 },
        { year: "2021", value: 61.3 },
        { year: "2022", value: 72.7 },
        { year: "2023", value: 72.4 }
      ]
    },
    JNJ: {
      debtToEquity: 0.42,
      profitability: { years: 5, consistent: true, avgROE: 24.8 },
      dividendYield: 2.85,
      payoutRatio: 52.3,
      ivRank: 62,
      priceVs52Week: { current: 167.23, low: 143.13, high: 179.47, position: 66.3 },
      creditRating: "AAA",
      revenue: [
        { year: "2019", value: 82.1 },
        { year: "2020", value: 82.6 },
        { year: "2021", value: 93.8 },
        { year: "2022", value: 94.9 },
        { year: "2023", value: 85.2 }
      ],
      earnings: [
        { year: "2019", value: 15.1 },
        { year: "2020", value: 14.7 },
        { year: "2021", value: 20.9 },
        { year: "2022", value: 17.9 },
        { year: "2023", value: 16.8 }
      ]
    }
  };

  return sampleData[symbol] || sampleData.AAPL;
};

export function FinancialValidationStep({ 
  onNext, 
  onPrevious, 
  wizardState, 
  updateWizardState 
}: FinancialValidationStepProps) {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [validationCriteria, setValidationCriteria] = useState<ValidationCriteria | null>(null);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    if (wizardState.selectedStock) {
      const data = getFinancialData(wizardState.selectedStock);
      setFinancialData(data);
      
      // Validate against criteria
      const validation = validateFinancials(data);
      setValidationCriteria(validation);
      
      // Calculate weighted score
      const score = calculateOverallScore(validation);
      setOverallScore(score);
      
      // Update wizard state
      updateWizardState({
        financialData: data,
        financialValidation: validation,
        financialScore: score
      });
    }
  }, [wizardState.selectedStock]);

  const validateFinancials = (data: FinancialData): ValidationCriteria => {
    return {
      debtToEquity: {
        value: data.debtToEquity,
        target: 0.5,
        status: data.debtToEquity <= 0.5 ? 'pass' : data.debtToEquity <= 0.75 ? 'warning' : 'fail',
        label: 'Debt-to-Equity Ratio',
        weight: 20
      },
      profitability: {
        value: data.profitability.years,
        target: 3,
        status: data.profitability.consistent && data.profitability.years >= 5 ? 'pass' : 
                data.profitability.consistent && data.profitability.years >= 3 ? 'warning' : 'fail',
        label: 'Consistent Profitability',
        weight: 25
      },
      dividendYield: {
        value: data.dividendYield,
        target: [2, 4],
        status: data.dividendYield >= 2 && data.dividendYield <= 4 ? 'pass' :
                data.dividendYield > 0 && data.dividendYield < 6 ? 'warning' : 'fail',
        label: 'Dividend Yield',
        weight: 15
      },
      payoutRatio: {
        value: data.payoutRatio,
        target: 60,
        status: data.payoutRatio <= 60 ? 'pass' : data.payoutRatio <= 80 ? 'warning' : 'fail',
        label: 'Payout Ratio',
        weight: 15
      },
      ivRank: {
        value: data.ivRank,
        target: 50,
        status: data.ivRank >= 50 ? 'pass' : data.ivRank >= 30 ? 'warning' : 'fail',
        label: 'IV Rank (Options Premium)',
        weight: 15
      },
      pricePosition: {
        value: data.priceVs52Week.position,
        target: [25, 75],
        status: data.priceVs52Week.position >= 25 && data.priceVs52Week.position <= 75 ? 'pass' :
                data.priceVs52Week.position >= 15 && data.priceVs52Week.position <= 85 ? 'warning' : 'fail',
        label: '52-Week Price Position',
        weight: 10
      }
    };
  };

  const calculateOverallScore = (criteria: ValidationCriteria): number => {
    let totalWeight = 0;
    let weightedScore = 0;

    Object.values(criteria).forEach(criterion => {
      totalWeight += criterion.weight;
      const points = criterion.status === 'pass' ? 100 : criterion.status === 'warning' ? 70 : 30;
      weightedScore += (points * criterion.weight);
    });

    return weightedScore / totalWeight;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20';
      case 'fail':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      default:
        return '';
    }
  };

  const isNextEnabled = overallScore >= 70;

  if (!wizardState.selectedStock) {
    return (
      <WheelWizardStep
        title="Financial Validation"
        description="Please select a stock first"
        onPrevious={onPrevious}
        showNavigation={false}
      >
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No stock selected. Please go back and select a stock for analysis.</p>
          </CardContent>
        </Card>
      </WheelWizardStep>
    );
  }

  return (
    <WheelWizardStep
      title="Financial Analysis"
      description={`Detailed fundamental analysis for ${wizardState.selectedStock}`}
      onNext={onNext}
      onPrevious={onPrevious}
      isNextEnabled={isNextEnabled}
    >
      <div className="space-y-6">
        {/* Overall Score */}
        {overallScore > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Financial Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold">
                  {overallScore.toFixed(0)}%
                </div>
                <Progress value={overallScore} className="h-3" />
                <Badge
                  variant={overallScore >= 85 ? "default" : 
                         overallScore >= 70 ? "secondary" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {overallScore >= 85 ? "Excellent" :
                   overallScore >= 70 ? "Good" : 
                   overallScore >= 50 ? "Fair" : "Poor"}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Based on weighted analysis of fundamental criteria
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Criteria */}
        {validationCriteria && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Fundamental Criteria Analysis
              </CardTitle>
              <CardDescription>
                Validation against wheel strategy requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(validationCriteria).map(([key, criterion]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(criterion.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(criterion.status)}
                      <span className="font-medium">{criterion.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {criterion.weight}% weight
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {key === 'dividendYield' ? `${criterion.value.toFixed(2)}%` :
                         key === 'debtToEquity' ? criterion.value.toFixed(2) :
                         key === 'payoutRatio' ? `${criterion.value.toFixed(1)}%` :
                         key === 'ivRank' ? `${criterion.value}` :
                         key === 'pricePosition' ? `${criterion.value.toFixed(1)}%` :
                         key === 'profitability' ? `${criterion.value} years` :
                         criterion.value}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Target: {Array.isArray(criterion.target) 
                      ? `${criterion.target[0]}-${criterion.target[1]}${key === 'dividendYield' ? '%' : key === 'pricePosition' ? '%' : ''}`
                      : key === 'debtToEquity' ? `≤ ${criterion.target}`
                      : key === 'payoutRatio' ? `≤ ${criterion.target}%`
                      : key === 'ivRank' ? `≥ ${criterion.target}`
                      : key === 'profitability' ? `≥ ${criterion.target} years`
                      : criterion.target}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Financial Charts */}
        {financialData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Revenue Trend
                </CardTitle>
                <CardDescription>5-year revenue history ($ billions)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={financialData.revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}B`, 'Revenue']} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 0, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Earnings Trend
                </CardTitle>
                <CardDescription>5-year earnings history ($ billions)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData.earnings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}B`, 'Earnings']} />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Metrics */}
        {financialData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-purple-600" />
                Key Financial Ratios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">
                    {financialData.profitability.avgROE.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg ROE</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">
                    {financialData.creditRating}
                  </div>
                  <div className="text-sm text-muted-foreground">Credit Rating</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="text-2xl font-bold text-purple-600">
                    ${financialData.priceVs52Week.current}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="text-2xl font-bold text-orange-600">
                    {financialData.priceVs52Week.position.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">52W Position</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {overallScore > 0 && (
          <Card>
            <CardContent className="pt-6">
              {overallScore >= 85 ? (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Excellent Candidate</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    This stock meets or exceeds all fundamental criteria for the wheel strategy. 
                    Strong balance sheet, consistent profitability, and good options premiums.
                  </p>
                </div>
              ) : overallScore >= 70 ? (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Good Candidate</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This stock meets most criteria for the wheel strategy. Consider position sizing 
                    and monitor any warning areas carefully.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Proceed with Caution</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This stock has some financial concerns. Consider reducing position size or 
                    selecting a higher-quality alternative.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </WheelWizardStep>
  );
}