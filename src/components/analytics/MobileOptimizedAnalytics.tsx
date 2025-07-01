"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, Tablet, Monitor, Eye, EyeOff, 
  ChevronLeft, ChevronRight, MoreHorizontal,
  TrendingUp, DollarSign, Zap, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/chartUtils';

interface MobileOptimizedAnalyticsProps {
  data: any;
  className?: string;
}

interface ViewportConfig {
  type: 'mobile' | 'tablet' | 'desktop';
  breakpoint: number;
  chartHeight: number;
  showSecondaryData: boolean;
  cardLayout: 'compact' | 'standard' | 'expanded';
}

export function MobileOptimizedAnalytics({ data, className }: MobileOptimizedAnalyticsProps) {
  const [currentViewport, setCurrentViewport] = useState<ViewportConfig['type']>('desktop');
  const [activeCard, setActiveCard] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  // Responsive viewport detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCurrentViewport('mobile');
      } else if (width < 1024) {
        setCurrentViewport('tablet');
      } else {
        setCurrentViewport('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewportConfig: ViewportConfig = {
    type: currentViewport,
    breakpoint: currentViewport === 'mobile' ? 768 : currentViewport === 'tablet' ? 1024 : 1440,
    chartHeight: currentViewport === 'mobile' ? 250 : currentViewport === 'tablet' ? 300 : 400,
    showSecondaryData: currentViewport !== 'mobile',
    cardLayout: currentViewport === 'mobile' ? 'compact' : currentViewport === 'tablet' ? 'standard' : 'expanded'
  };

  // Mobile-optimized summary cards
  const summaryCards = [
    {
      title: 'Total Cost',
      value: formatCurrency(data?.insights?.totalSpent || 0),
      icon: DollarSign,
      trend: data?.insights?.monthOverMonth || 0,
      color: 'green',
      description: 'This month'
    },
    {
      title: 'Average Monthly',
      value: formatCurrency(data?.insights?.averageMonthly || 0),
      icon: Calendar,
      trend: data?.insights?.yearOverYear || 0,
      color: 'blue',
      description: '6-month avg'
    },
    {
      title: 'Efficiency Score',
      value: `${data?.insights?.consistencyScore || 0}%`,
      icon: TrendingUp,
      trend: 12,
      color: 'purple',
      description: 'Cost stability'
    },
    {
      title: 'Savings Opportunity',
      value: formatCurrency(data?.insights?.potentialSavings || 0),
      icon: Zap,
      trend: 0,
      color: 'orange',
      description: 'Next 6 months'
    }
  ];

  // Touch gesture handlers
  const handlePanEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && activeCard > 0) {
      setActiveCard(activeCard - 1);
    } else if (info.offset.x < -threshold && activeCard < summaryCards.length - 1) {
      setActiveCard(activeCard + 1);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return '📈';
    if (trend < -5) return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-red-500';
    if (trend < -5) return 'text-green-500';
    return 'text-gray-500';
  };

  if (currentViewport === 'mobile') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Analytics</h2>
            <p className="text-sm text-muted-foreground">Swipe to navigate</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {/* Mobile Carousel */}
        <div className="relative overflow-hidden">
          <motion.div
            className="flex"
            animate={{ x: -activeCard * 100 + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {summaryCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={index}
                  className="w-full flex-shrink-0 px-2"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onPanEnd={handlePanEnd}
                >
                  <Card className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("p-2 rounded-lg", `bg-${card.color}-100 dark:bg-${card.color}-900/20`)}>
                          <Icon className={cn("w-5 h-5", `text-${card.color}-600`)} />
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{card.description}</div>
                          <div className={cn("text-sm font-medium", getTrendColor(card.trend))}>
                            {getTrendIcon(card.trend)} {Math.abs(card.trend).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{card.title}</h3>
                        <div className="text-2xl font-bold">{card.value}</div>
                      </div>

                      {/* Progress indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Carousel indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {summaryCards.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveCard(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  activeCard === index ? "bg-primary" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* Mobile Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cost Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: viewportConfig.chartHeight }} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Mobile-optimized chart</p>
                <p className="text-xs">Tap to drill down</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expandable Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" className="h-12 flex-col gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">View Bills</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-12 flex-col gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Compare</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <Zap className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">High Electric Costs</p>
                        <p className="text-xs text-muted-foreground">Consider energy efficiency upgrades</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Tablet and Desktop layouts would be similar to existing implementation
  // but with enhanced responsive behaviors
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Responsive grid layout for tablet/desktop */}
      <div className={cn(
        "grid gap-4",
        currentViewport === 'tablet' ? "grid-cols-2" : "grid-cols-4"
      )}>
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-xl font-bold">{card.value}</p>
                    </div>
                    <Icon className={cn("w-8 h-8", `text-${card.color}-600`)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Responsive chart */}
      <Card>
        <CardContent className="p-6">
          <div style={{ height: viewportConfig.chartHeight }} className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg">Enhanced Responsive Chart</p>
              <p className="text-sm">Optimized for {currentViewport} viewing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}