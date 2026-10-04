import { Injectable } from '@angular/core';
import { Observable, throwError, timer, of } from 'rxjs';
import { mergeMap, retryWhen, catchError, delay, take, concatMap, tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { NetworkService, ConnectionQuality } from './network.service';

export interface ErrorInfo {
  type: 'network' | 'server' | 'timeout' | 'authorization' | 'validation' | 'unknown';
  status?: number;
  message: string;
  userMessage: string;
  retryable: boolean;
  actionRequired?: 'login' | 'refresh' | 'contact_support' | 'check_network';
  context?: string; // Additional context about where the error occurred
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: number[];
  useNetworkBasedDelays: boolean;
}

export interface OperationQueue {
  id: string;
  operation: () => Observable<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  context: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [0, 408, 429, 500, 502, 503, 504], // Network timeout, rate limit, server errors
    useNetworkBasedDelays: true
  };

  private operationQueue: OperationQueue[] = [];
  private isProcessingQueue = false;

  constructor(private networkService: NetworkService) {}

  /**
   * Analyze error and return structured error information
   */
  public analyzeError(error: any, context?: string): ErrorInfo {
    let errorInfo: ErrorInfo;

    if (error instanceof HttpErrorResponse) {
      errorInfo = this.analyzeHttpError(error, context);
    } else if (error instanceof Error) {
      errorInfo = this.analyzeGenericError(error, context);
    } else {
      errorInfo = {
        type: 'unknown',
        message: 'An unexpected error occurred',
        userMessage: 'Something went wrong. Please try again.',
        retryable: true,
        context
      };
    }

    return errorInfo;
  }

  /**
   * Analyze HTTP errors and categorize them
   */
  private analyzeHttpError(error: HttpErrorResponse, context?: string): ErrorInfo {
    const status = error.status;
    
    switch (status) {
      case 0:
        return {
          type: 'network',
          status,
          message: 'Network connection failed',
          userMessage: 'Unable to connect to the server. Please check your internet connection.',
          retryable: true,
          actionRequired: 'check_network',
          context
        };

      case 400:
        return {
          type: 'validation',
          status,
          message: error.error?.message || 'Invalid request',
          userMessage: error.error?.message || 'Please check your input and try again.',
          retryable: false,
          context
        };

      case 401:
        return {
          type: 'authorization',
          status,
          message: 'Authentication required',
          userMessage: 'Please log in to continue.',
          retryable: false,
          actionRequired: 'login',
          context
        };

      case 403:
        return {
          type: 'authorization',
          status,
          message: 'Access denied',
          userMessage: 'You do not have permission to perform this action.',
          retryable: false,
          context
        };

      case 404:
        return {
          type: 'server',
          status,
          message: 'Resource not found',
          userMessage: 'The requested resource was not found.',
          retryable: false,
          context
        };

      case 408:
        return {
          type: 'timeout',
          status,
          message: 'Request timeout',
          userMessage: 'The request took too long. Please try again.',
          retryable: true,
          actionRequired: 'refresh',
          context
        };

      case 409:
        return {
          type: 'validation',
          status,
          message: error.error?.message || 'Conflict with current state',
          userMessage: error.error?.message || 'This action conflicts with the current state. Please refresh and try again.',
          retryable: true,
          actionRequired: 'refresh',
          context
        };

      case 429:
        return {
          type: 'server',
          status,
          message: 'Too many requests',
          userMessage: 'Too many requests. Please wait a moment and try again.',
          retryable: true,
          context
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'server',
          status,
          message: 'Server error',
          userMessage: 'Server is experiencing issues. Please try again in a moment.',
          retryable: true,
          actionRequired: 'contact_support',
          context
        };

      default:
        return {
          type: 'server',
          status,
          message: error.error?.message || `HTTP ${status} error`,
          userMessage: error.error?.message || 'An error occurred. Please try again.',
          retryable: status >= 500,
          context
        };
    }
  }

  /**
   * Analyze generic JavaScript errors
   */
  private analyzeGenericError(error: Error, context?: string): ErrorInfo {
    if (error.name === 'TimeoutError') {
      return {
        type: 'timeout',
        message: 'Operation timed out',
        userMessage: 'The operation took too long. Please try again.',
        retryable: true,
        actionRequired: 'refresh',
        context
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        type: 'network',
        message: error.message,
        userMessage: 'Network connection issue. Please check your internet connection.',
        retryable: true,
        actionRequired: 'check_network',
        context
      };
    }

    return {
      type: 'unknown',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      context
    };
  }

  /**
   * Apply retry logic with exponential backoff to an Observable
   */
  public withRetry<T>(
    source: Observable<T>,
    context: string,
    customConfig?: Partial<RetryConfig>
  ): Observable<T> {
    const config = { ...this.defaultRetryConfig, ...customConfig };
    let retryCount = 0;

    return source.pipe(
      retryWhen(errors =>
        errors.pipe(
          concatMap((error, index) => {
            retryCount = index + 1;
            const errorInfo = this.analyzeError(error, context);

            // Don't retry if not retryable or max retries exceeded
            if (!errorInfo.retryable || retryCount > config.maxRetries) {
              return throwError(error);
            }

            // Don't retry certain status codes
            if (errorInfo.status && !config.retryableErrors.includes(errorInfo.status)) {
              return throwError(error);
            }

            // Calculate retry delay
            const delay = this.calculateRetryDelay(retryCount, config);
            
            console.warn(`Retrying ${context} (attempt ${retryCount}/${config.maxRetries}) after ${delay}ms:`, errorInfo.message);
            
            return timer(delay);
          })
        )
      ),
      catchError(error => {
        const errorInfo = this.analyzeError(error, context);
        console.error(`Failed ${context} after ${retryCount} retries:`, errorInfo);
        return throwError(errorInfo);
      })
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    if (config.useNetworkBasedDelays) {
      const networkDelays = this.networkService.getRetryIntervals();
      if (attempt <= networkDelays.length) {
        return networkDelays[attempt - 1];
      }
    }

    // Standard exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply jitter (randomness) to prevent thundering herd
    const jitter = Math.random() * 0.3 - 0.15; // ±15% jitter
    delay = delay * (1 + jitter);
    
    // Cap the delay
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Queue operations for retry when network comes back online
   */
  public queueOperation<T>(
    operationFactory: () => Observable<T>,
    context: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operation: OperationQueue = {
        id: `${context}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: operationFactory,
        resolve,
        reject,
        context,
        timestamp: Date.now()
      };

      this.operationQueue.push(operation);
      console.log(`Queued operation: ${context}`);

      // Start processing if network is back online
      if (this.networkService.isOnline()) {
        this.processQueue();
      } else {
        // Wait for network to come back online
        this.networkService.networkStatus.pipe(
          take(1),
          tap(status => {
            if (status.online) {
              this.processQueue();
            }
          })
        ).subscribe();
      }
    });
  }

  /**
   * Process queued operations when network is available
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.networkService.isOnline() || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`Processing ${this.operationQueue.length} queued operations`);

    // Process operations in order
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift()!;
      
      try {
        // Check if operation is too old (older than 10 minutes)
        const maxAge = 10 * 60 * 1000; // 10 minutes
        if (Date.now() - operation.timestamp > maxAge) {
          console.warn(`Discarding stale operation: ${operation.context}`);
          operation.reject(new Error('Operation expired'));
          continue;
        }

        // Execute the operation with retry logic
        const result = await this.withRetry(
          operation.operation(),
          `Queued: ${operation.context}`
        ).toPromise();
        
        operation.resolve(result);
        console.log(`Successfully executed queued operation: ${operation.context}`);
        
      } catch (error) {
        console.error(`Failed to execute queued operation: ${operation.context}`, error);
        operation.reject(error);
      }

      // Small delay between operations to avoid overwhelming the server
      await this.delay(500);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear the operation queue (useful for cleanup)
   */
  public clearQueue(): void {
    this.operationQueue.forEach(operation => {
      operation.reject(new Error('Operation queue cleared'));
    });
    this.operationQueue = [];
    console.log('Operation queue cleared');
  }

  /**
   * Get current queue length
   */
  public getQueueLength(): number {
    return this.operationQueue.length;
  }

  /**
   * Helper method to create a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create an enhanced error message with suggestions
   */
  public createErrorMessage(errorInfo: ErrorInfo): string {
    let message = errorInfo.userMessage;

    if (errorInfo.actionRequired) {
      switch (errorInfo.actionRequired) {
        case 'check_network':
          message += ' Please check your internet connection and try again.';
          break;
        case 'login':
          message += ' Please log in to continue.';
          break;
        case 'refresh':
          message += ' Please refresh the page and try again.';
          break;
        case 'contact_support':
          message += ' If the problem persists, please contact support.';
          break;
      }
    }

    return message;
  }

  /**
   * Check if an error should show a retry button
   */
  public shouldShowRetry(errorInfo: ErrorInfo): boolean {
    return errorInfo.retryable && errorInfo.type !== 'authorization';
  }

  /**
   * Get appropriate icon for error type
   */
  public getErrorIcon(errorInfo: ErrorInfo): string {
    switch (errorInfo.type) {
      case 'network':
        return 'cloud-offline-outline';
      case 'server':
        return 'server-outline';
      case 'timeout':
        return 'time-outline';
      case 'authorization':
        return 'lock-closed-outline';
      case 'validation':
        return 'warning-outline';
      default:
        return 'alert-circle-outline';
    }
  }

  /**
   * Get appropriate color for error type
   */
  public getErrorColor(errorInfo: ErrorInfo): string {
    switch (errorInfo.type) {
      case 'network':
        return 'warning';
      case 'server':
        return 'danger';
      case 'timeout':
        return 'warning';
      case 'authorization':
        return 'medium';
      case 'validation':
        return 'warning';
      default:
        return 'danger';
    }
  }
}