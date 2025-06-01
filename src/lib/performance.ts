// Performance optimization utilities

import { useCallback, useRef, useMemo, useEffect, useState } from 'react';

// Debounce hook for search inputs and API calls
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRunRef.current >= delay) {
        callback(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, delay - (now - lastRunRef.current));
      }
    }) as T,
    [callback, delay]
  );
}

// Memoized value with custom comparison
export function useMemoWithComparator<T>(
  factory: () => T,
  deps: React.DependencyList,
  compare?: (a: React.DependencyList, b: React.DependencyList) => boolean
): T {
  const ref = useRef<{
    deps: React.DependencyList;
    value: T;
  }>();

  if (!ref.current || !compare || !compare(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

// Virtual scrolling utilities
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    
    return {
      totalHeight,
      visibleCount,
      getVisibleRange: (scrollTop: number) => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
          start + visibleCount + overscan,
          items.length
        );
        
        return {
          start: Math.max(0, start - overscan),
          end,
          items: items.slice(
            Math.max(0, start - overscan),
            end
          ),
        };
      },
    };
  }, [items, itemHeight, containerHeight, overscan]);
}

// Image lazy loading with intersection observer
export function useLazyImage(src: string, options?: IntersectionObserverInit) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [options]);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = src;
  }, [isInView, src]);

  return {
    imgRef,
    isLoaded,
    shouldLoad: isInView,
  };
}

// Bundle size analysis helper
export function analyzeBundle() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Bundle analysis not available in production');
    return;
  }

  // Dynamic import for bundle analyzer
  import('webpack-bundle-analyzer')
    .then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer available');
    })
    .catch(() => {
      console.log('Bundle analyzer not installed');
    });
}

// Performance monitoring
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  startTiming(name: string): () => void {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      this.addMetric(name, duration);
    };
  }

  addMetric(name: string, value: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name}: ${value.toFixed(2)}ms`);
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React component performance helper
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const endTiming = useRef<(() => void) | null>(null);

    useEffect(() => {
      endTiming.current = performanceMonitor.startTiming(`${componentName} render`);
      
      return () => {
        if (endTiming.current) {
          endTiming.current();
        }
      };
    });

    return <Component {...props} />;
  };
}

// Cache utilities
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Automatically cleanup cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000);
}

// React Query-like hook for data fetching with caching
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
) {
  const { ttl, enabled = true, refetchOnMount = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = cache.get(key);
    if (cached && !refetchOnMount) {
      setData(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      cache.set(key, result, ttl);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, enabled, refetchOnMount, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// Web Vitals monitoring
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Dynamic import to avoid bundling in SSR
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(metric => performanceMonitor.addMetric('CLS', metric.value));
    getFID(metric => performanceMonitor.addMetric('FID', metric.value));
    getFCP(metric => performanceMonitor.addMetric('FCP', metric.value));
    getLCP(metric => performanceMonitor.addMetric('LCP', metric.value));
    getTTFB(metric => performanceMonitor.addMetric('TTFB', metric.value));
  }).catch(() => {
    // web-vitals not available
  });
}

// Resource preloading
export function preloadResource(href: string, as: string, type?: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;

  document.head.appendChild(link);
}

// Critical resource hints
export function addResourceHints(): void {
  if (typeof document === 'undefined') return;

  // DNS prefetch for external domains
  const dnsPrefetchDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'images.unsplash.com',
  ];

  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });

  // Preconnect to critical origins
  const preconnectOrigins = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  preconnectOrigins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Performance configuration
export const PERFORMANCE_CONFIG = {
  // Debounce delays
  SEARCH_DEBOUNCE: 300,
  FORM_DEBOUNCE: 500,
  RESIZE_DEBOUNCE: 100,

  // Throttle delays
  SCROLL_THROTTLE: 16, // ~60fps
  MOUSEMOVE_THROTTLE: 32, // ~30fps

  // Cache TTLs
  CACHE_TTL_SHORT: 30 * 1000, // 30 seconds
  CACHE_TTL_MEDIUM: 5 * 60 * 1000, // 5 minutes
  CACHE_TTL_LONG: 30 * 60 * 1000, // 30 minutes

  // Virtual scrolling
  VIRTUAL_ITEM_HEIGHT: 60,
  VIRTUAL_OVERSCAN: 5,

  // Image loading
  IMAGE_INTERSECTION_MARGIN: '50px',
  IMAGE_INTERSECTION_THRESHOLD: 0.1,
} as const;