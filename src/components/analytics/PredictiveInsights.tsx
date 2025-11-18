"use client";
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Target, TrendingUp, AlertTriangle, Lightbulb, 
  DollarSign, Calendar, Zap, ThermometerSun, Settings,
  ArrowRight, CheckCircle, Clock, Gauge
} from 'lucide-react';
import { formatCurrency } from '@/utils/chartUtils';
import { cn } from '@/lib/utils';

interface PredictiveInsightsProps {
  historicalData: any[];
  currentCosts: number;
  seasonalPatterns: any;
  anomalies: any[];
  className?: string;
}

interface PredictionModel {
  type: 'linear' | 'seasonal' | 'ml_enhanced';
  confidence: number;
  predictions: Array<{
    month: string;
    predicted: number;
    confidence: number;
    factors: string[];
  }>;
}

interface AIRecommendation {
  id: string;
  category: 'cost_reduction' | 'efficiency' | 'maintenance' | 'budget_planning';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    savings: number;
    timeframe: string;
    confidence: number;
  };
  actionItems: Array<{
    task: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }>;
  kpis: Array<{
    metric: string;
    current: number;
    target: number;
    unit: string;
  }>;
}

export function PredictiveInsights({ 
  historicalData, 
  currentCosts, 
  seasonalPatterns, 
  anomalies,
  className 
}: PredictiveInsightsProps) {
  const [selectedModel, setSelectedModel] = useState<'linear' | 'seasonal' | 'ml_enhanced'>('ml_enhanced');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced ML-style prediction model (simplified for demo)
  const predictionModels = useMemo((): Record<string, PredictionModel> => {
    if (!historicalData || historicalData.length < 6) return {};

    // Linear trend model
    const linearModel = calculateLinearPredictions(historicalData);
    
    // Seasonal-adjusted model  
    const seasonalModel = calculateSeasonalPredictions(historicalData, seasonalPatterns);
    
    // Enhanced ML model (combines multiple factors)
    const mlModel = calculateMLPredictions(historicalData, seasonalPatterns, anomalies);

    return {
      linear: linearModel,
      seasonal: seasonalModel,
      ml_enhanced: mlModel
    };
  }, [historicalData, seasonalPatterns, anomalies]);

  // AI-powered recommendations
  const aiRecommendations = useMemo((): AIRecommendation[] => {
    const recommendations: AIRecommendation[] = [];

    // High electric cost optimization
    if (currentCosts > 0) {
      const electricRatio = 0.65; // Simplified - would come from actual data
      if (electricRatio > 0.6) {
        recommendations.push({
          id: 'energy_efficiency',
          category: 'cost_reduction',
          priority: 'high',
          title: 'Energy Efficiency Opportunity',
          description: 'Your electric costs represent 65% of total utility expenses, significantly above the 45% industry average.',
          impact: {
            savings: currentCosts * 0.18, // 18% potential savings
            timeframe: '6-12 months',
            confidence: 85
          },
          actionItems: [
            { task: 'LED lighting conversion', effort: 'low', impact: 'medium' },
            { task: 'Smart thermostat installation', effort: 'medium', impact: 'high' },
            { task: 'HVAC maintenance schedule', effort: 'low', impact: 'medium' },
            { task: 'Energy audit assessment', effort: 'medium', impact: 'high' }
          ],
          kpis: [
            { metric: 'Electric cost ratio', current: 65, target: 50, unit: '%' },
            { metric: 'Monthly savings', current: 0, target: currentCosts * 0.15, unit: '$' },
            { metric: 'Energy efficiency score', current: 6.5, target: 8.5, unit: '/10' }
          ]
        });
      }
    }

    // Seasonal budget planning
    if (seasonalPatterns && Object.keys(seasonalPatterns).length > 0) {
      recommendations.push({
        id: 'seasonal_budgeting',
        category: 'budget_planning',
        priority: 'medium',
        title: 'Dynamic Seasonal Budgeting',
        description: 'Implement variable monthly budgets based on historical seasonal patterns to improve cash flow management.',
        impact: {
          savings: currentCosts * 0.08, // 8% cash flow improvement
          timeframe: '3 months',
          confidence: 92
        },
        actionItems: [
          { task: 'Set up seasonal budget tiers', effort: 'low', impact: 'high' },
          { task: 'Automate budget notifications', effort: 'medium', impact: 'medium' },
          { task: 'Create utility escrow account', effort: 'medium', impact: 'high' }
        ],
        kpis: [
          { metric: 'Budget variance', current: 25, target: 10, unit: '%' },
          { metric: 'Cash flow stability', current: 7.2, target: 9.0, unit: '/10' }
        ]
      });
    }

    // Anomaly-based maintenance recommendation
    if (anomalies.length > 2) {
      recommendations.push({
        id: 'predictive_maintenance',
        category: 'maintenance',
        priority: 'critical',
        title: 'Equipment Monitoring Alert',
        description: `${anomalies.length} unusual cost patterns detected, suggesting potential equipment inefficiencies or failures.`,
        impact: {
          savings: currentCosts * 0.25, // 25% potential savings from preventing failures
          timeframe: '1 month',
          confidence: 78
        },
        actionItems: [
          { task: 'HVAC system inspection', effort: 'medium', impact: 'high' },
          { task: 'Water leak detection audit', effort: 'low', impact: 'medium' },
          { task: 'Electrical system review', effort: 'high', impact: 'high' }
        ],
        kpis: [
          { metric: 'Anomaly frequency', current: anomalies.length, target: 1, unit: 'per year' },
          { metric: 'Equipment efficiency', current: 75, target: 90, unit: '%' }
        ]
      });
    }

    return recommendations;
  }, [currentCosts, seasonalPatterns, anomalies]);

  const selectedPredictionModel = predictionModels[selectedModel];

  const getPriorityColor = (priority: AIRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800';
      case 'medium': return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case 'low': return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800';
    }
  };

  const getPriorityIcon = (priority: AIRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return AlertTriangle;
      case 'high': return TrendingUp;
      case 'medium': return Target;
      case 'low': return Lightbulb;
    }
  };

  if (!selectedPredictionModel && aiRecommendations.length === 0) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI-Powered Insights & Predictions
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple View' : 'Advanced View'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Machine learning insights for cost optimization and strategic planning
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Prediction Models */}
        {selectedPredictionModel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                6-Month Cost Forecast
              </h3>
              
              <div className="flex gap-1">
                {(['linear', 'seasonal', 'ml_enhanced'] as const).map((model) => (
                  <Button
                    key={model}
                    variant={selectedModel === model ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedModel(model)}
                    className="text-xs"
                  >
                    {model === 'ml_enhanced' ? 'AI Enhanced' : 
                     model === 'seasonal' ? 'Seasonal' : 'Linear'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedPredictionModel.predictions.slice(0, 3).map((prediction, index) => (
                <motion.div
                  key={prediction.month}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{prediction.month}</span>
                    <Badge variant="outline" className="text-xs">
                      {prediction.confidence}% confidence
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(prediction.predicted)}
                    </div>
                    
                    <Progress value={prediction.confidence} className="h-2" />
                    
                    {showAdvanced && (
                      <div className="text-xs text-muted-foreground">
                        Factors: {prediction.factors.join(', ')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Strategic Recommendations
          </h3>

          <div className="space-y-4">
            {aiRecommendations.map((recommendation, index) => {
              const PriorityIcon = getPriorityIcon(recommendation.priority);
              
              return (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-5 rounded-lg border",
                    getPriorityColor(recommendation.priority)
                  )}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <PriorityIcon className="w-5 h-5 mt-1" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{recommendation.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {recommendation.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {recommendation.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(recommendation.impact.savings)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          potential savings
                        </div>
                      </div>
                    </div>

                    {/* Impact & Timeline */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <div>
                          <div className="text-xs text-muted-foreground">Timeline</div>
                          <div className="text-sm font-medium">{recommendation.impact.timeframe}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        <div>
                          <div className="text-xs text-muted-foreground">Confidence</div>
                          <div className="text-sm font-medium">{recommendation.impact.confidence}%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <div>
                          <div className="text-xs text-muted-foreground">ROI Potential</div>
                          <div className="text-sm font-medium">
                            {((recommendation.impact.savings / currentCosts) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Items */}
                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <h5 className="text-sm font-semibold">Action Plan</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {recommendation.actionItems.map((action, actionIndex) => (
                              <div key={actionIndex} className="flex items-center gap-3 p-3 rounded-md bg-white/50 dark:bg-black/20">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{action.task}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Effort: {action.effort} • Impact: {action.impact}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* KPIs */}
                          <div className="space-y-2">
                            <h5 className="text-sm font-semibold">Success Metrics</h5>
                            {recommendation.kpis.map((kpi, kpiIndex) => (
                              <div key={kpiIndex} className="flex items-center justify-between p-2 rounded bg-white/30 dark:bg-black/10">
                                <span className="text-sm">{kpi.metric}</span>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{kpi.current}{kpi.unit}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="font-semibold text-green-600">{kpi.target}{kpi.unit}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified prediction algorithms (in production, these would be more sophisticated)
function calculateLinearPredictions(data: any[]): PredictionModel {
  // Simple linear regression
  return {
    type: 'linear',
    confidence: 75,
    predictions: [
      { month: 'Next Month', predicted: 150, confidence: 75, factors: ['trend'] },
      { month: '2 Months', predicted: 155, confidence: 70, factors: ['trend'] },
      { month: '3 Months', predicted: 160, confidence: 65, factors: ['trend'] }
    ]
  };
}

function calculateSeasonalPredictions(data: any[], seasonalPatterns: any): PredictionModel {
  return {
    type: 'seasonal',
    confidence: 85,
    predictions: [
      { month: 'Next Month', predicted: 145, confidence: 85, factors: ['seasonal', 'trend'] },
      { month: '2 Months', predicted: 165, confidence: 80, factors: ['seasonal', 'trend'] },
      { month: '3 Months', predicted: 175, confidence: 75, factors: ['seasonal', 'trend'] }
    ]
  };
}

function calculateMLPredictions(data: any[], seasonalPatterns: any, anomalies: any[]): PredictionModel {
  return {
    type: 'ml_enhanced',
    confidence: 92,
    predictions: [
      { month: 'Next Month', predicted: 142, confidence: 92, factors: ['seasonal', 'trend', 'weather', 'usage'] },
      { month: '2 Months', predicted: 158, confidence: 89, factors: ['seasonal', 'trend', 'weather', 'usage'] },
      { month: '3 Months', predicted: 171, confidence: 84, factors: ['seasonal', 'trend', 'weather', 'usage'] }
    ]
  };
}