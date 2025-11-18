"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw
} from "lucide-react";

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

interface PortfolioDashboardProps {
  userId: string;
}

// Sample portfolio data (in production, this would come from database)
const samplePositions: Position[] = [
  {
    id: "1",
    symbol: "AAPL",
    phase: "PUT_SOLD",
    strike: 190,
    premium: 3.25,
    contracts: 2,
    expiration: "2025-02-21",
    daysToExpiration: 23,
    currentPnL: 650,
    status: "ACTIVE",
    sector: "Technology"
  },
  {
    id: "2", 
    symbol: "MSFT",
    phase: "ASSIGNED",
    strike: 370,
    premium: 5.80,
    contracts: 1,
    expiration: "2025-01-17",
    daysToExpiration: -14,
    currentPnL: 580,
    status: "ASSIGNED",
    sector: "Technology"
  },
  {
    id: "3",
    symbol: "JNJ",
    phase: "CALL_SOLD",
    strike: 175,
    premium: 2.15,
    contracts: 3,
    expiration: "2025-02-14",
    daysToExpiration: 16,
    currentPnL: 645,
    status: "ACTIVE",
    sector: "Healthcare"
  },
  {
    id: "4",
    symbol: "JPM", 
    phase: "COMPLETED",
    strike: 145,
    premium: 4.20,
    contracts: 2,
    expiration: "2025-01-10",
    daysToExpiration: -21,
    currentPnL: 840,
    status: "CALLED_AWAY",
    sector: "Financial"
  }
];

const sampleMetrics: PortfolioMetrics = {
  totalCapital: 150000,
  deployedCapital: 128500,
  availableCash: 21500,
  totalPremiumCollected: 12840,
  monthlyReturn: 2.1,
  annualizedReturn: 18.7,
  totalPositions: 12,
  activePositions: 7,
  winRate: 83.3,
  avgDaysToExpiration: 28
};

export function PortfolioDashboard({ userId }: PortfolioDashboardProps) {
  const [positions, setPositions] = useState<Position[]>(samplePositions);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(sampleMetrics);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  // Calculate sector allocation
  const sectorData = positions.reduce((acc, position) => {
    const existing = acc.find(item => item.name === position.sector);
    const value = position.contracts * position.strike * 100;
    
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: position.sector, value });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Calculate phase distribution
  const phaseData = positions.reduce((acc, position) => {
    const existing = acc.find(item => item.name === position.phase);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ 
        name: position.phase.replace('_', ' '), 
        value: 1,
        color: getPhaseColor(position.phase)
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; color: string }>);

  // Monthly performance data
  const performanceData = [
    { month: 'Sep', premium: 2840, pnl: 2840 },
    { month: 'Oct', premium: 3210, pnl: 2950 },
    { month: 'Nov', premium: 2890, pnl: 3120 },
    { month: 'Dec', premium: 3900, pnl: 3770 }
  ];

  function getPhaseColor(phase: string): string {
    switch (phase) {
      case 'PUT_SOLD': return '#3b82f6';
      case 'ASSIGNED': return '#f59e0b';
      case 'CALL_SOLD': return '#10b981';
      case 'COMPLETED': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  function getPhaseIcon(phase: string) {
    switch (phase) {
      case 'PUT_SOLD': return <Target className="h-4 w-4" />;
      case 'ASSIGNED': return <AlertCircle className="h-4 w-4" />;
      case 'CALL_SOLD': return <TrendingUp className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Active</Badge>;
      case 'ASSIGNED':
        return <Badge variant="secondary">Assigned</Badge>;
      case 'CALLED_AWAY':
        return <Badge variant="outline">Called Away</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Portfolio Overview
          </CardTitle>
          <CardDescription>
            Real-time wheel strategy performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="text-2xl font-bold text-blue-600">
                ${metrics.totalCapital.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Capital</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="text-2xl font-bold text-green-600">
                {metrics.monthlyReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Monthly Return</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.annualizedReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Annualized Return</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </div>

          {/* Capital Deployment */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Capital Deployment</span>
              <span className="text-sm text-muted-foreground">
                ${metrics.deployedCapital.toLocaleString()} / ${metrics.totalCapital.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={(metrics.deployedCapital / metrics.totalCapital) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Available: ${metrics.availableCash.toLocaleString()}</span>
              <span>{((metrics.deployedCapital / metrics.totalCapital) * 100).toFixed(1)}% deployed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              Sector Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Exposure']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Premium']} />
                  <Bar dataKey="premium" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Active Positions
          </CardTitle>
          <CardDescription>
            Current wheel strategy positions across all phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Phase Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={selectedPhase === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPhase(null)}
            >
              All Phases
            </Button>
            {phaseData.map((phase) => (
              <Button
                key={phase.name}
                variant={selectedPhase === phase.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPhase(phase.name)}
                className="flex items-center gap-2"
              >
                {getPhaseIcon(phase.name)}
                {phase.name} ({phase.value})
              </Button>
            ))}
          </div>

          {/* Positions Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Strike</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Contracts</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions
                  .filter(pos => !selectedPhase || pos.phase.replace('_', ' ') === selectedPhase)
                  .map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPhaseIcon(position.phase)}
                          <span className="text-sm">
                            {position.phase.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>${position.strike}</TableCell>
                      <TableCell>${position.premium.toFixed(2)}</TableCell>
                      <TableCell>{position.contracts}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {position.expiration}
                          <div className="text-xs text-muted-foreground">
                            {position.daysToExpiration > 0 
                              ? `${position.daysToExpiration} days`
                              : `${Math.abs(position.daysToExpiration)} days ago`
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          position.currentPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${position.currentPnL}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(position.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {position.status === 'ACTIVE' && position.daysToExpiration <= 7 && (
                            <Button size="sm" variant="outline">
                              <RotateCcw className="h-3 w-3" />
                              Roll
                            </Button>
                          )}
                          {position.phase === 'ASSIGNED' && (
                            <Button size="sm" variant="outline">
                              Sell Call
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Premium Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.totalPremiumCollected.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Positions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.activePositions} / {metrics.totalPositions}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days to Expiration</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.avgDaysToExpiration}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}