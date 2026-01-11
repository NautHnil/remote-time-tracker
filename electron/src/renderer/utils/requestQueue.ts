/**
 * Request Queue Manager for Electron
 * Limits concurrent requests to prevent 429 errors
 */

interface QueuedRequest<T> {
  id: string | number;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority?: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private maxConcurrent: number;
  private cache = new Map<string | number, any>();
  private pendingRequests = new Map<string | number, Promise<any>>();
  private delayBetweenRequests: number;

  constructor(maxConcurrent = 3, delayBetweenRequests = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(
    id: string | number,
    executor: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    // Check cache first and validate blob URLs
    if (this.cache.has(id)) {
      const cached = this.cache.get(id);

      // Validate blob URLs before returning from cache
      if (typeof cached === "string" && cached.startsWith("blob:")) {
        const isValid = await this.isBlobValid(cached);
        if (!isValid) {
          // Remove invalid blob from cache and re-fetch
          this.removeFromCache(id);
        } else {
          return Promise.resolve(cached as T);
        }
      } else {
        return Promise.resolve(cached as T);
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(id)) {
      return this.pendingRequests.get(id);
    }

    // Create new promise for this request
    const promise = new Promise<T>((resolve, reject) => {
      this.queue.push({ id, executor, resolve, reject, priority });
      this.sortQueue();
    });

    this.pendingRequests.set(id, promise);
    this.processQueue();

    return promise;
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueue() {
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;

      this.activeRequests++;

      try {
        // Add delay between requests to avoid rate limiting
        if (this.activeRequests > 1) {
          await this.delay(this.delayBetweenRequests);
        }

        const result = await request.executor();

        // Cache the result
        this.cache.set(request.id, result);
        this.pendingRequests.delete(request.id);

        request.resolve(result);
      } catch (error) {
        this.pendingRequests.delete(request.id);
        request.reject(error);
      } finally {
        this.activeRequests--;
        this.processQueue();
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate if a blob URL is still valid
   */
  private async isBlobValid(blobUrl: string): Promise<boolean> {
    if (!blobUrl.startsWith("blob:")) return true;

    try {
      const response = await fetch(blobUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Remove invalid blob URLs from cache
   */
  private removeFromCache(id: string | number) {
    const value = this.cache.get(id);
    if (value && typeof value === "string" && value.startsWith("blob:")) {
      URL.revokeObjectURL(value);
    }
    this.cache.delete(id);
  }

  /**
   * Clear cache
   */
  clearCache() {
    // Revoke object URLs before clearing
    this.cache.forEach((value) => {
      if (typeof value === "string" && value.startsWith("blob:")) {
        URL.revokeObjectURL(value);
      }
    });
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active requests count
   */
  getActiveCount(): number {
    return this.activeRequests;
  }
}

// Create singleton instance
// Max 3 concurrent requests with 100ms delay between requests
export const screenshotQueue = new RequestQueue(3, 100);

export default RequestQueue;
