

/**
 * Enhanced retry handler with exponential backoff and circuit breaker pattern
 */
export class APIRetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second base delay
    this.maxDelay = options.maxDelay || 30000; // 30 seconds max delay
    this.exponentialBase = options.exponentialBase || 2;
    this.jitter = options.jitter !== false; // Add random jitter by default
    
    // Circuit breaker settings
    this.failureThreshold = options.failureThreshold || 10;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 60000; // 1 minute timeout
    
    // Circuit breaker state
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    
    // Statistics
    this.stats = {
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRetries: 0
    };
  }

  /**
   * Execute operation with retry logic and circuit breaker
   * @param {Function} operation - Async function to execute
   * @param {string} operationName - Name for logging
   * @param {Object} context - Additional context for logging
   */
  async execute(operation, operationName = 'API Operation', context = {}) {
    // Check circuit breaker state
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log(`🔄 Circuit breaker transitioning to HALF_OPEN for ${operationName}`);
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${operationName}`);
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
    }

    let lastError;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt++;
      this.stats.totalAttempts++;

      try {
        console.log(`🔄 ${operationName} - Attempt ${attempt}${attempt > 1 ? ` (retry ${attempt - 1})` : ''}`, context);
        
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Operation succeeded
        this.stats.totalSuccesses++;
        this.onSuccess(operationName, duration);
        
        console.log(`✅ ${operationName} succeeded on attempt ${attempt} (${duration}ms)`, context);
        return result;

      } catch (error) {
        lastError = error;
        this.stats.totalFailures++;
        
        console.log(`❌ ${operationName} failed on attempt ${attempt}: ${error.message}`, context);

        // Don't retry for certain types of errors
        if (this.isNonRetryableError(error)) {
          console.log(`🚫 Non-retryable error for ${operationName}, aborting retries`);
          this.onFailure(operationName, error);
          throw error;
        }

        // If not the last attempt, wait before retrying
        if (attempt <= this.maxRetries) {
          this.stats.totalRetries++;
          const delay = this.calculateDelay(attempt);
          console.log(`⏳ Waiting ${delay}ms before retry ${attempt} for ${operationName}`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.onFailure(operationName, lastError);
    console.log(`💥 ${operationName} failed after ${this.maxRetries + 1} attempts`);
    throw lastError;
  }

  /**
   * Handle successful operation
   */
  onSuccess(operationName, duration) {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log(`🟢 Circuit breaker CLOSED for ${operationName}`);
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed operation
   */
  onFailure(operationName, error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🔴 Circuit breaker OPEN for ${operationName} after ${this.failureCount} failures`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log(`🔴 Circuit breaker back to OPEN for ${operationName}`);
    }
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelay * Math.pow(this.exponentialBase, attempt - 1);
    const delay = Math.min(exponentialDelay, this.maxDelay);
    
    if (this.jitter) {
      // Add random jitter (±25% of delay)
      const jitterAmount = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      return Math.max(0, delay + jitter);
    }
    
    return delay;
  }

  /**
   * Check if error should not be retried
   */
  isNonRetryableError(error) {
    // Don't retry authentication errors
    if (error.message?.includes('authentication') || 
        error.message?.includes('unauthorized') ||
        error.message?.includes('Invalid credentials')) {
      return true;
    }

    // Don't retry validation errors
    if (error.message?.includes('validation') ||
        error.message?.includes('invalid format')) {
      return true;
    }

    // Don't retry 4xx client errors (except 429 rate limit)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      state: this.state,
      failureCount: this.failureCount,
      successRate: this.stats.totalAttempts > 0 
        ? (this.stats.totalSuccesses / this.stats.totalAttempts * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset circuit breaker and statistics
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.stats = {
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRetries: 0
    };
  }
}

/**
 * Rate limiter to prevent overwhelming the server
 */
export class RateLimiter {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.requestsPerSecond = options.requestsPerSecond || 10;
    this.requestsPerMinute = options.requestsPerMinute || 300;
    
    this.runningRequests = 0;
    this.requestTimes = [];
    this.queue = [];
  }

  /**
   * Execute operation with rate limiting
   */
  async execute(operation, operationName = 'Operation') {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        operationName,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.queue.length === 0 || this.runningRequests >= this.maxConcurrent) {
      return;
    }

    // Check rate limits
    const now = Date.now();
    
    // Clean old request times (older than 1 minute)
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
    
    // Check per-second rate limit
    const recentRequests = this.requestTimes.filter(time => now - time < 1000);
    if (recentRequests.length >= this.requestsPerSecond) {
      setTimeout(() => this.processQueue(), 100);
      return;
    }

    // Check per-minute rate limit
    if (this.requestTimes.length >= this.requestsPerMinute) {
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    // Execute next request
    const request = this.queue.shift();
    if (!request) return;

    this.runningRequests++;
    this.requestTimes.push(now);

    try {
      const result = await request.operation();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.runningRequests--;
      // Process next request after a small delay
      setTimeout(() => this.processQueue(), 50);
    }
  }

  /**
   * Get current rate limiter status
   */
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < 1000);
    
    return {
      runningRequests: this.runningRequests,
      queueLength: this.queue.length,
      requestsLastSecond: recentRequests.length,
      requestsLastMinute: this.requestTimes.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

/**
 * Enhanced error with additional context
 */
export class APIError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'APIError';
    this.code = options.code;
    this.status = options.status;
    this.response = options.response;
    this.context = options.context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}