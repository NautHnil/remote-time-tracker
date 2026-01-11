import React from "react";

/**
 * Performance monitoring utilities for screenshot loading
 */

interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  totalLoadTime: number;
  errors: number;
}

class ScreenshotPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    totalLoadTime: 0,
    errors: 0,
  };

  private loadTimes: number[] = [];
  private enabled: boolean = process.env.NODE_ENV === "development";

  /**
   * Record a cache hit
   */
  recordCacheHit() {
    if (!this.enabled) return;
    this.metrics.totalRequests++;
    this.metrics.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss() {
    if (!this.enabled) return;
    this.metrics.totalRequests++;
    this.metrics.cacheMisses++;
  }

  /**
   * Record image load time
   */
  recordLoadTime(timeMs: number) {
    if (!this.enabled) return;
    this.loadTimes.push(timeMs);
    this.metrics.totalLoadTime += timeMs;
    this.metrics.averageLoadTime =
      this.metrics.totalLoadTime / this.loadTimes.length;
  }

  /**
   * Record an error
   */
  recordError() {
    if (!this.enabled) return;
    this.metrics.errors++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics & {
    cacheHitRate: number;
    medianLoadTime: number;
  } {
    const cacheHitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
        : 0;

    const medianLoadTime = this.calculateMedian(this.loadTimes);

    return {
      ...this.metrics,
      cacheHitRate,
      medianLoadTime,
    };
  }

  /**
   * Print metrics to console
   */
  printMetrics() {
    if (!this.enabled) return;

    const metrics = this.getMetrics();

    console.group("📊 Screenshot Performance Metrics");
    console.log("Total Requests:", metrics.totalRequests);
    console.log("Cache Hits:", metrics.cacheHits);
    console.log("Cache Misses:", metrics.cacheMisses);
    console.log("Cache Hit Rate:", metrics.cacheHitRate.toFixed(2) + "%");
    console.log(
      "Average Load Time:",
      metrics.averageLoadTime.toFixed(2) + "ms"
    );
    console.log("Median Load Time:", metrics.medianLoadTime.toFixed(2) + "ms");
    console.log("Total Load Time:", metrics.totalLoadTime.toFixed(2) + "ms");
    console.log("Errors:", metrics.errors);
    console.groupEnd();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
      errors: 0,
    };
    this.loadTimes = [];
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(arr: number[]): number {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton instance
export const performanceMonitor = new ScreenshotPerformanceMonitor();

/**
 * Hook để measure component render time
 */
export function useMeasureRender(componentName: string) {
  if (process.env.NODE_ENV !== "development") return;

  const startTime = performance.now();

  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (renderTime > 16.67) {
      // Longer than 1 frame (60fps)
      console.warn(
        `⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms (> 16.67ms)`
      );
    }
  });
}

/**
 * Higher-order component để track re-renders
 */
export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  if (process.env.NODE_ENV !== "development") {
    return Component;
  }

  let renderCount = 0;

  return (props: P) => {
    renderCount++;

    React.useEffect(() => {
      console.log(`🔄 ${componentName} rendered ${renderCount} times`);
    });

    return React.createElement(Component, props);
  };
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const startTime = performance.now();
  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`⏱️ ${label} took ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Log component props changes
 */
export function useWhyDidYouUpdate(name: string, props: any) {
  if (process.env.NODE_ENV !== "development") return;

  const previousProps = React.useRef<any>();

  React.useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: any = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`🔍 ${name} props changed:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private samples: number[] = [];
  private intervalId: number | null = null;

  start(intervalMs: number = 1000) {
    const perfWithMemory = performance as any;
    if (typeof perfWithMemory.memory === "undefined") {
      console.warn("Memory API not available");
      return;
    }

    this.intervalId = window.setInterval(() => {
      const usedMemoryMB = perfWithMemory.memory.usedJSHeapSize / 1024 / 1024;
      this.samples.push(usedMemoryMB);
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStats() {
    if (this.samples.length === 0) {
      return null;
    }

    const min = Math.min(...this.samples);
    const max = Math.max(...this.samples);
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;

    return {
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      samples: this.samples.length,
    };
  }

  printStats() {
    const stats = this.getStats();
    if (!stats) {
      console.log("No memory samples collected");
      return;
    }

    console.group("💾 Memory Usage");
    console.log("Min:", stats.min, "MB");
    console.log("Max:", stats.max, "MB");
    console.log("Avg:", stats.avg, "MB");
    console.log("Samples:", stats.samples);
    console.groupEnd();
  }

  reset() {
    this.samples = [];
  }
}

export const memoryTracker = new MemoryTracker();

// Auto-print metrics every 30 seconds in development
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    performanceMonitor.printMetrics();
  }, 30000);
}

// Export for window access in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as any).__PERF_MONITOR__ = performanceMonitor;
  (window as any).__MEMORY_TRACKER__ = memoryTracker;
}
