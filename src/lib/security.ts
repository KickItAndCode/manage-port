// Security utilities and helpers

// Rate limiting store (in-memory for development, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
export const RATE_LIMITS = {
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
  },
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // limit each IP to 5 auth attempts per windowMs
  },
  // Form submissions
  forms: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 10, // limit each IP to 10 form submissions per minute
  },
} as const;

// Rate limiting implementation
export function checkRateLimit(
  identifier: string,
  limit: typeof RATE_LIMITS.api
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  // Get or create rate limit record
  let record = rateLimitStore.get(key);
  
  // Reset if window has expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + limit.windowMs,
    };
  }
  
  // Check if limit exceeded
  if (record.count >= limit.maxRequests) {
    rateLimitStore.set(key, record);
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: limit.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Clean up expired rate limit records
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for development
    "'unsafe-inline'", // Required for some libraries
    "https://clerk.com",
    "https://*.clerk.accounts.dev",
    "https://js.stripe.com",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS
    "https://fonts.googleapis.com",
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "http:", // Allow HTTP images in development
  ],
  'connect-src': [
    "'self'",
    "https://*.convex.cloud",
    "https://clerk.com",
    "https://*.clerk.accounts.dev",
    "wss://*.convex.cloud",
  ],
  'frame-src': [
    "'self'",
    "https://clerk.com",
    "https://*.clerk.accounts.dev",
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
} as const;

// Generate CSP header value
export function generateCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Input sanitization (enhanced from validation.ts)
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeForDatabase = (input: string): string => {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 10000); // Limit length
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
  /(UNION\s+SELECT)/i,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(--|\#|\/\*|\*\/)/,
  /(\bxp_\w+)/i,
];

export const containsSQLInjection = (input: string): boolean => {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
];

export const containsXSS = (input: string): boolean => {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
};

// Security headers for API responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const;

// Apply security headers to response
export function applySecurityHeaders(headers: Headers): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
}

// Password strength validation
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const;

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else {
    score += 20;
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 20;
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 20;
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 20;
  }

  return {
    isValid: errors.length === 0,
    errors,
    score,
  };
}

// IP address utilities
export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback
  return 'unknown';
}

// Audit logging
interface AuditEvent {
  timestamp: number;
  userId?: string;
  ip: string;
  action: string;
  resource: string;
  success: boolean;
  details?: Record<string, any>;
}

const auditLog: AuditEvent[] = [];

export function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>): void {
  const auditEvent: AuditEvent = {
    ...event,
    timestamp: Date.now(),
  };

  auditLog.push(auditEvent);

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (Sentry, LogRocket, etc.)
    console.log('[AUDIT]', auditEvent);
  } else {
    console.log('[AUDIT]', auditEvent);
  }

  // Keep only last 1000 events in memory
  if (auditLog.length > 1000) {
    auditLog.shift();
  }
}

// Security constants
export const SECURITY_CONFIG = {
  // Session timeouts
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  IDLE_TIMEOUT_MS: 2 * 60 * 60 * 1000, // 2 hours

  // File upload restrictions
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],

  // Input limits
  MAX_INPUT_LENGTH: 10000,
  MAX_QUERY_PARAMS: 100,

  // Rate limiting
  RATE_LIMIT_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

// Start cleanup interval for rate limiting
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimit, SECURITY_CONFIG.RATE_LIMIT_CLEANUP_INTERVAL);
}