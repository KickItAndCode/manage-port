"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  Percent,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";

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

interface PositionRisk {
  symbol: string;
  exposure: number;
  sector: string;
  delta: number;
  timeDecay: number;
  assignmentRisk: number;
  daysToExpiration: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface RiskAlert {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  title: string;
  description: string;
  action?: string;
  timestamp: string;
}

interface RiskManagementDashboardProps {
  userId: string;
}

// Sample risk data
const sampleRiskMetrics: RiskMetrics = {
  portfolioDelta: 0.32,
  maxDrawdown: 12.5,
  sharpeRatio: 1.24,
  volatility: 15.8,
  correlationRisk: 0.68,
  concentrationRisk: 28.5,
  cashReserve: 14.3,
  marginUtilization: 45.2
};

const samplePositionRisks: PositionRisk[] = [
  {
    symbol: "AAPL",
    exposure: 38000,
    sector: "Technology",
    delta: 0.25,
    timeDecay: -2.5,
    assignmentRisk: 28.3,
    daysToExpiration: 23,
    riskLevel: "MEDIUM"
  },
  {
    symbol: "MSFT", 
    exposure: 37000,
    sector: "Technology",
    delta: 0.00,
    timeDecay: 0,
    assignmentRisk: 100,
    daysToExpiration: -14,
    riskLevel: "HIGH"
  },
  {
    symbol: "JNJ",
    exposure: 52500,
    sector: "Healthcare", 
    delta: -0.22,
    timeDecay: -1.8,
    assignmentRisk: 15.2,
    daysToExpiration: 16,
    riskLevel: "LOW"
  }
];

const sampleAlerts: RiskAlert[] = [
  {
    id: "1",
    type: "WARNING",
    title: "High Technology Sector Concentration",
    description: "Technology exposure at 52% exceeds recommended 20% sector limit",
    action: "Consider diversifying into other sectors",
    timestamp: "2025-01-31T10:30:00Z"
  },
  {
    id: "2", 
    type: "ERROR",
    title: "MSFT Position Requires Action",
    description: "Assigned position needs covered call setup for income generation",
    action: "Sell covered calls on MSFT shares",
    timestamp: "2025-01-31T09:15:00Z"
  },
  {
    id: "3",
    type: "INFO",
    title: "AAPL Put Approaching Expiration", 
    description: "Position expires in 23 days, monitor for rolling opportunity",
    action: "Review roll vs assignment decision",
    timestamp: "2025-01-31T08:45:00Z"
  }
];

// Historical drawdown data
const drawdownData = [
  { month: 'Jul', drawdown: 0 },
  { month: 'Aug', drawdown: -3.2 },
  { month: 'Sep', drawdown: -1.8 },
  { month: 'Oct', drawdown: -8.5 },
  { month: 'Nov', drawdown: -12.5 },
  { month: 'Dec', drawdown: -4.2 },
  { month: 'Jan', drawdown: -2.1 }
];

// Portfolio delta over time
const deltaData = [
  { week: 'W1', delta: 0.28 },
  { week: 'W2', delta: 0.35 },
  { week: 'W3', delta: 0.31 },
  { week: 'W4', delta: 0.32 }
];

export function RiskManagementDashboard({ userId }: RiskManagementDashboardProps) {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>(sampleRiskMetrics);
  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>(samplePositionRisks);
  const [alerts, setAlerts] = useState<RiskAlert[]>(sampleAlerts);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">High Risk</Badge>;
      default:
        return <Badge>{level}</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'INFO':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getMetricStatus = (value: number, target: number, isReverse: boolean = false) => {
    const threshold = target * 0.1; // 10% threshold
    if (isReverse) {
      return value <= target - threshold ? 'good' : value <= target + threshold ? 'warning' : 'danger';
    }
    return value >= target - threshold ? 'good' : value >= target - (threshold * 2) ? 'warning' : 'danger';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'danger':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Risk Alerts ({alerts.length})
            </CardTitle>
            <CardDescription>
              Active risk warnings and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} className={`${
                alert.type === 'ERROR' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20' :
                alert.type === 'WARNING' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20' :
                'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
              }`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {alert.type}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm mb-2">
                      {alert.description}
                    </AlertDescription>
                    {alert.action && (
                      <div className="text-xs font-medium opacity-80">
                        Action: {alert.action}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Portfolio Risk Metrics
          </CardTitle>
          <CardDescription>
            Real-time risk monitoring and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`text-center p-4 rounded-lg ${getStatusColor(getMetricStatus(riskMetrics.portfolioDelta, 0.3))}`}>
              <div className="text-2xl font-bold">
                {riskMetrics.portfolioDelta.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Portfolio Delta</div>
              <div className="text-xs mt-1">Target: 0.20-0.40</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${getStatusColor(getMetricStatus(riskMetrics.maxDrawdown, 20, true))}`}>
              <div className="text-2xl font-bold">
                {riskMetrics.maxDrawdown.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
              <div className="text-xs mt-1">Target: &lt; 20%</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${getStatusColor(getMetricStatus(riskMetrics.sharpeRatio, 1.2))}`}>
              <div className="text-2xl font-bold">
                {riskMetrics.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
              <div className="text-xs mt-1">Target: &gt; 1.20</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${getStatusColor(getMetricStatus(riskMetrics.cashReserve, 20, true))}`}>
              <div className="text-2xl font-bold">
                {riskMetrics.cashReserve.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Cash Reserve</div>
              <div className="text-xs mt-1">Target: 20-30%</div>
            </div>
          </div>

          {/* Additional Risk Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sector Concentration Risk</span>
                <span className="text-sm text-muted-foreground">{riskMetrics.concentrationRisk.toFixed(1)}%</span>
              </div>
              <Progress 
                value={riskMetrics.concentrationRisk} 
                className={`h-2 ${riskMetrics.concentrationRisk > 50 ? 'bg-red-100' : riskMetrics.concentrationRisk > 30 ? 'bg-yellow-100' : 'bg-green-100'}`}
              />
              <div className="text-xs text-muted-foreground">
                Recommended: Keep sector exposure below 20%
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Portfolio Correlation</span>
                <span className="text-sm text-muted-foreground">{riskMetrics.correlationRisk.toFixed(2)}</span>
              </div>
              <Progress 
                value={riskMetrics.correlationRisk * 100} 
                className={`h-2 ${riskMetrics.correlationRisk > 0.7 ? 'bg-red-100' : riskMetrics.correlationRisk > 0.5 ? 'bg-yellow-100' : 'bg-green-100'}`}
              />
              <div className="text-xs text-muted-foreground">
                Recommended: Keep correlation below 0.50
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drawdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Historical Drawdown
            </CardTitle>
            <CardDescription>Portfolio drawdown over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drawdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Drawdown']} />
                  <Line 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Delta Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Portfolio Delta Trend
            </CardTitle>
            <CardDescription>Weekly delta exposure tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deltaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 0.5]} />
                  <Tooltip formatter={(value) => [value, 'Delta']} />
                  <Bar dataKey="delta" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Position Risk Analysis
          </CardTitle>
          <CardDescription>
            Individual position risk breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Exposure</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Time Decay</TableHead>
                  <TableHead>Assignment Risk</TableHead>
                  <TableHead>DTE</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionRisks.map((position) => (
                  <TableRow key={position.symbol}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>${position.exposure.toLocaleString()}</TableCell>
                    <TableCell>{position.sector}</TableCell>
                    <TableCell>
                      <span className={`${
                        Math.abs(position.delta) > 0.4 ? 'text-red-600' :
                        Math.abs(position.delta) > 0.3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {position.delta.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`${position.timeDecay < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.timeDecay === 0 ? 'N/A' : position.timeDecay.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`${
                        position.assignmentRisk > 50 ? 'text-red-600' :
                        position.assignmentRisk > 30 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {position.assignmentRisk.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`${
                        position.daysToExpiration < 0 ? 'text-red-600' :
                        position.daysToExpiration <= 7 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {position.daysToExpiration < 0 ? 'Expired' : `${position.daysToExpiration}d`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getRiskBadge(position.riskLevel)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Management Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Risk Management Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">✓ Position Limits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Individual stock: Max 10% of portfolio</li>
                <li>• Sector exposure: Max 20% per sector</li>
                <li>• Portfolio delta: Keep between 0.20-0.40</li>
                <li>• Cash reserves: Maintain 20-30%</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-blue-600">📊 Monitoring Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review positions daily for early assignment risk</li>
                <li>• Monitor portfolio delta weekly</li>
                <li>• Rebalance when sector limits exceeded</li>
                <li>• Roll positions 7-21 days before expiration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}