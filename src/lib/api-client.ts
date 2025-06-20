/**
 * Generic HTTP API Client with retry logic, rate limiting, and error handling
 * Designed for listing platform integrations (Apartments.com, Zillow, etc.)
 */

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number; // milliseconds
  retries?: number;
  retryDelay?: number; // milliseconds
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
  retryable: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private rateLimitDelay: number = 1000; // 1 second between requests
  private lastRequestTime: number = 0;

  constructor(
    baseUrl: string, 
    defaultHeaders: Record<string, string> = {},
    rateLimitDelay: number = 1000
  ) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'ManagePort-Listing-Integration/1.0',
      ...defaultHeaders,
    };
    this.rateLimitDelay = rateLimitDelay;
  }

  /**
   * Make HTTP request with retry logic and rate limiting
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    await this.enforceRateLimit();

    const maxRetries = config.retries ?? 3;
    const retryDelay = config.retryDelay ?? 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest<T>(config);
        return response;
      } catch (error) {
        const apiError = error as ApiError;
        
        // Don't retry on final attempt or non-retryable errors
        if (attempt === maxRetries || !apiError.retryable) {
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, apiError.message);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Convenient HTTP method shortcuts
   */
  async get<T = any>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  async post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  async put<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }

  async patch<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PATCH', body, headers });
  }

  /**
   * Core request implementation
   */
  private async makeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = config.url.startsWith('http') ? config.url : `${this.baseUrl}${config.url}`;
    const timeout = config.timeout ?? 30000; // 30 second default timeout

    const headers = {
      ...this.defaultHeaders,
      ...config.headers,
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchConfig: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (config.body && config.method !== 'GET') {
        if (typeof config.body === 'object') {
          fetchConfig.body = JSON.stringify(config.body);
        } else {
          fetchConfig.body = config.body;
        }
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      // Convert response headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let data: T;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = (await response.text()) as unknown as T;
      } else {
        data = (await response.blob()) as unknown as T;
      }

      // Handle HTTP errors
      if (!response.ok) {
        throw this.createApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          this.getErrorCode(response.status),
          data,
          this.isRetryableStatus(response.status)
        );
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createApiError(
          'Request timeout',
          408,
          'TIMEOUT',
          null,
          true
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createApiError(
          'Network error - unable to connect to server',
          0,
          'NETWORK_ERROR',
          null,
          true
        );
      }

      // Re-throw if already an ApiError
      if (this.isApiError(error)) {
        throw error;
      }

      // Wrap other errors
      throw this.createApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0,
        'UNKNOWN_ERROR',
        error,
        false
      );
    }
  }

  /**
   * Rate limiting - ensure minimum delay between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await this.sleep(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create standardized API error
   */
  private createApiError(
    message: string,
    status?: number,
    code?: string,
    details?: any,
    retryable: boolean = false
  ): ApiError {
    return {
      message,
      status,
      code,
      details,
      retryable,
    };
  }

  /**
   * Check if error is retryable based on HTTP status
   */
  private isRetryableStatus(status: number): boolean {
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'TIMEOUT',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    
    return codes[status] || 'HTTP_ERROR';
  }

  /**
   * Type guard for ApiError
   */
  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'retryable' in error;
  }

  /**
   * Update authentication headers
   */
  setAuthHeader(token: string, type: 'Bearer' | 'Basic' | 'ApiKey' = 'Bearer'): void {
    if (type === 'Bearer') {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else if (type === 'Basic') {
      this.defaultHeaders['Authorization'] = `Basic ${token}`;
    } else if (type === 'ApiKey') {
      this.defaultHeaders['X-API-Key'] = token;
    }
  }

  /**
   * Remove authentication headers
   */
  clearAuthHeader(): void {
    delete this.defaultHeaders['Authorization'];
    delete this.defaultHeaders['X-API-Key'];
  }

  /**
   * Update rate limiting settings
   */
  setRateLimit(delayMs: number): void {
    this.rateLimitDelay = delayMs;
  }
}