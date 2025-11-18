"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Check, 
  ChevronsUpDown, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Building,
  Volume2,
  BarChart3,
  DollarSign
} from "lucide-react";
import { WheelWizardStep } from "./WheelWizardStep";

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

interface WizardState {
  selectedStock: string | null;
  stockData: any;
  [key: string]: any;
}

interface StockSelectionStepProps {
  onNext: () => void;
  onPrevious: () => void;
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
}

// Sample stock data (in production, this would come from an API)
const sampleStocks: StockData[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 195.89,
    marketCap: 3000000000000,
    volume: 52340000,
    beta: 1.2,
    dividend: 0.96,
    sector: "Technology",
    optionsVolume: 850000,
    bidAskSpread: 0.01
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    marketCap: 2800000000000,
    volume: 41250000,
    beta: 0.9,
    dividend: 3.00,
    sector: "Technology",
    optionsVolume: 620000,
    bidAskSpread: 0.02
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    price: 167.23,
    marketCap: 415000000000,
    volume: 6800000,
    beta: 0.7,
    dividend: 4.76,
    sector: "Healthcare",
    optionsVolume: 120000,
    bidAskSpread: 0.03
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co",
    price: 147.92,
    marketCap: 425000000000,
    volume: 15200000,
    beta: 1.1,
    dividend: 4.00,
    sector: "Financial",
    optionsVolume: 180000,
    bidAskSpread: 0.02
  },
  {
    symbol: "KO",
    name: "The Coca-Cola Company",
    price: 62.45,
    marketCap: 269000000000,
    volume: 12500000,
    beta: 0.6,
    dividend: 1.84,
    sector: "Consumer Defensive",
    optionsVolume: 95000,
    bidAskSpread: 0.01
  }
];

export function StockSelectionStep({ 
  onNext, 
  onPrevious, 
  wizardState, 
  updateWizardState 
}: StockSelectionStepProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredStocks, setFilteredStocks] = useState<StockData[]>(sampleStocks);
  const [selectedStockData, setSelectedStockData] = useState<StockData | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Filter stocks based on search
  useEffect(() => {
    if (searchValue) {
      const filtered = sampleStocks.filter(stock =>
        stock.symbol.toLowerCase().includes(searchValue.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(sampleStocks);
    }
  }, [searchValue]);

  // Validate selected stock against wheel strategy criteria
  const validateStock = (stock: StockData) => {
    const results = {
      marketCap: {
        value: stock.marketCap,
        target: 10000000000, // $10B
        status: stock.marketCap >= 10000000000 ? 'pass' : 'fail',
        label: 'Market Cap > $10B'
      },
      volume: {
        value: stock.volume,
        target: 1000000, // 1M shares
        status: stock.volume >= 1000000 ? 'pass' : 'fail',
        label: 'Daily Volume > 1M'
      },
      beta: {
        value: stock.beta,
        target: [0.7, 1.2],
        status: stock.beta >= 0.7 && stock.beta <= 1.2 ? 'pass' : 'warning',
        label: 'Beta 0.7-1.2'
      },
      optionsVolume: {
        value: stock.optionsVolume || 0,
        target: 5000,
        status: (stock.optionsVolume || 0) >= 5000 ? 'pass' : 'warning',
        label: 'Options Volume > 5K'
      },
      bidAskSpread: {
        value: stock.bidAskSpread || 0.1,
        target: 0.05,
        status: (stock.bidAskSpread || 0.1) <= 0.05 ? 'pass' : 'warning',
        label: 'Bid-Ask Spread < $0.05'
      }
    };

    const passCount = Object.values(results).filter(r => r.status === 'pass').length;
    const overallScore = (passCount / Object.keys(results).length) * 100;

    return { ...results, overallScore };
  };

  const handleStockSelect = (stock: StockData) => {
    setSelectedStockData(stock);
    setOpen(false);
    
    // Validate the selected stock
    const validation = validateStock(stock);
    setValidationResults(validation);
    
    // Update wizard state
    updateWizardState({
      selectedStock: stock.symbol,
      stockData: stock,
      validationResults: validation
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'fail':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'fail':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default:
        return '';
    }
  };

  const isNextEnabled = selectedStockData && validationResults && validationResults.overallScore >= 60;

  return (
    <WheelWizardStep
      title="Stock Selection & Screening"
      description="Find and validate wheel strategy candidates"
      onNext={onNext}
      onPrevious={onPrevious}
      isNextEnabled={isNextEnabled}
    >
      <div className="space-y-6">
        {/* Stock Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search Stocks
            </CardTitle>
            <CardDescription>
              Find quality stocks suitable for the wheel strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-search">Stock Symbol or Company Name</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedStockData
                      ? `${selectedStockData.symbol} - ${selectedStockData.name}`
                      : "Select a stock..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search stocks..." 
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandEmpty>No stocks found.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {filteredStocks.map((stock) => (
                          <CommandItem
                            key={stock.symbol}
                            value={stock.symbol}
                            onSelect={() => handleStockSelect(stock)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedStockData?.symbol === stock.symbol
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div>
                                <div className="font-medium">{stock.symbol}</div>
                                <div className="text-sm text-muted-foreground">
                                  {stock.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${stock.price}</div>
                              <div className="text-sm text-muted-foreground">
                                {stock.sector}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Selected Stock Details */}
        {selectedStockData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-purple-600" />
                Stock Analysis: {selectedStockData.symbol}
              </CardTitle>
              <CardDescription>
                {selectedStockData.name} - {selectedStockData.sector}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">
                    ${selectedStockData.price}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedStockData.marketCap)}
                  </div>
                  <div className="text-sm text-muted-foreground">Market Cap</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatVolume(selectedStockData.volume)}
                  </div>
                  <div className="text-sm text-muted-foreground">Daily Volume</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedStockData.beta}
                  </div>
                  <div className="text-sm text-muted-foreground">Beta</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Results */}
        {validationResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Wheel Strategy Validation
              </CardTitle>
              <CardDescription>
                Screening against professional criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Score */}
              <div className="text-center p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
                <div className="text-3xl font-bold">
                  {validationResults.overallScore.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                <Badge
                  variant={validationResults.overallScore >= 80 ? "default" : 
                         validationResults.overallScore >= 60 ? "secondary" : "destructive"}
                  className="mt-2"
                >
                  {validationResults.overallScore >= 80 ? "Excellent" :
                   validationResults.overallScore >= 60 ? "Good" : "Poor"}
                </Badge>
              </div>

              {/* Detailed Criteria */}
              <div className="space-y-3">
                {Object.entries(validationResults).map(([key, result]: [string, any]) => {
                  if (key === 'overallScore') return null;
                  
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-3 rounded-lg ${getStatusColor(result.status)}`}
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.label}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {key === 'marketCap' ? formatCurrency(result.value) :
                           key === 'volume' ? formatVolume(result.value) :
                           key === 'optionsVolume' ? formatVolume(result.value) :
                           key === 'bidAskSpread' ? `$${result.value.toFixed(3)}` :
                           key === 'beta' ? result.value.toFixed(1) :
                           result.value}
                        </div>
                        <div className="text-sm opacity-75">
                          Target: {Array.isArray(result.target) 
                            ? `${result.target[0]}-${result.target[1]}`
                            : key === 'marketCap' ? formatCurrency(result.target)
                            : key === 'volume' || key === 'optionsVolume' ? formatVolume(result.target)
                            : key === 'bidAskSpread' ? `< $${result.target}`
                            : result.target}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {validationResults.overallScore < 60 && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Recommendation</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This stock may not meet optimal wheel strategy criteria. Consider selecting a different stock with better fundamentals and options liquidity.
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