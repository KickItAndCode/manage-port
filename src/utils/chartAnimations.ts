// Chart animation utilities and configurations

// Animation timing constants
export const ANIMATION_TIMING = {
  micro: 150,        // Hover effects, small state changes
  transition: 300,   // Data updates, filter changes
  loading: 500,      // Initial load animations
  drill: 400,        // Drill-down transitions
} as const;

// Easing functions
export const EASING = {
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// Animation keyframes for CSS animations
export const keyframes = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideUp: `
    @keyframes slideUp {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { 
        opacity: 0; 
        transform: scale(0.9); 
      }
      to { 
        opacity: 1; 
        transform: scale(1); 
      }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1); 
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.05); 
      }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -200px 0;
      }
      100% {
        background-position: calc(200px + 100%) 0;
      }
    }
  `
};

// Animation class generators
export const getAnimationClasses = (type: keyof typeof keyframes, duration?: number) => {
  const animationDuration = duration || ANIMATION_TIMING.transition;
  return {
    animationName: type,
    animationDuration: `${animationDuration}ms`,
    animationTimingFunction: EASING.easeOut,
    animationFillMode: 'both',
  };
};

// Chart-specific animation configurations
export const chartAnimationConfig = {
  // Recharts animation configuration
  recharts: {
    line: {
      animationDuration: ANIMATION_TIMING.loading,
      animationEasing: 'ease-out'
    },
    bar: {
      animationDuration: ANIMATION_TIMING.loading,
      animationEasing: 'ease-out'
    },
    pie: {
      animationDuration: ANIMATION_TIMING.loading,
      animationEasing: 'ease-out'
    }
  },
  
  // Data update animations
  dataUpdate: {
    duration: ANIMATION_TIMING.transition,
    easing: EASING.easeInOut
  },
  
  // Hover animations
  hover: {
    duration: ANIMATION_TIMING.micro,
    easing: EASING.easeOut
  }
};

// Staggered animation utility
export function createStaggeredAnimation(
  items: any[],
  baseDelay: number = 100,
  animationType: keyof typeof keyframes = 'fadeIn'
) {
  return items.map((_, index) => ({
    ...getAnimationClasses(animationType),
    animationDelay: `${index * baseDelay}ms`
  }));
}

// Loading skeleton animation
export const skeletonAnimation = {
  backgroundImage: 'linear-gradient(90deg, #f0f0f0 0px, #e0e0e0 40px, #f0f0f0 80px)',
  backgroundSize: '200px',
  animation: `${keyframes.shimmer} 1.5s ease-in-out infinite`
};

// Chart entrance animations
export const chartEntranceAnimation = (delay: number = 0) => ({
  ...getAnimationClasses('slideUp', ANIMATION_TIMING.loading),
  animationDelay: `${delay}ms`
});

// Data point highlight animation
export const dataPointHighlight = {
  animation: `${keyframes.pulse} 2s ease-in-out 3`,
  animationDelay: '500ms'
};

// Interactive element animations
export const interactiveAnimations = {
  hover: {
    transition: `all ${ANIMATION_TIMING.micro}ms ${EASING.easeOut}`,
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }
  },
  
  active: {
    transition: `all ${ANIMATION_TIMING.micro}ms ${EASING.easeOut}`,
    '&:active': {
      transform: 'scale(0.98)'
    }
  },
  
  focus: {
    transition: `all ${ANIMATION_TIMING.micro}ms ${EASING.easeOut}`,
    '&:focus': {
      outline: '2px solid hsl(var(--primary))',
      outlineOffset: '2px'
    }
  }
};

// CSS class names for animations
export const animationClasses = {
  fadeIn: 'animate-in fade-in-0 duration-300',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-300',
  slideUpStagger: (index: number) => 
    `animate-in slide-in-from-bottom-4 duration-300 delay-${index * 100}`,
  
  // Loading states
  skeleton: 'animate-pulse bg-muted rounded',
  shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
  
  // Interactive states
  interactive: 'transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
  clickable: 'cursor-pointer transition-opacity duration-200 hover:opacity-80',
  
  // Chart specific
  chartContainer: 'animate-in slide-in-from-bottom-4 duration-500',
  chartData: 'animate-in fade-in-0 duration-300 delay-200',
  newDataPoint: 'animate-pulse bg-primary/20 rounded-full',
};

// Performance optimization helpers
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getReducedMotionStyles = () => {
  if (shouldReduceMotion()) {
    return {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important'
    };
  }
  return {};
};

// Animation event handlers
export const createAnimationEventHandlers = (
  onAnimationStart?: () => void,
  onAnimationEnd?: () => void
) => ({
  onAnimationStart: (e: React.AnimationEvent) => {
    onAnimationStart?.();
  },
  onAnimationEnd: (e: React.AnimationEvent) => {
    onAnimationEnd?.();
  }
});

// Chart transition helpers
export const chartTransitionConfig = {
  // Smooth data updates
  dataChange: {
    duration: ANIMATION_TIMING.transition,
    property: 'all',
    easing: EASING.easeInOut
  },
  
  // Filter animations
  filter: {
    duration: ANIMATION_TIMING.transition,
    property: 'opacity, transform',
    easing: EASING.easeOut
  },
  
  // Drill-down animations
  drillDown: {
    duration: ANIMATION_TIMING.drill,
    property: 'transform, opacity',
    easing: EASING.easeInOut
  }
};