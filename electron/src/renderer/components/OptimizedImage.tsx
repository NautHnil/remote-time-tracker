import React, { memo, useEffect, useRef, useState } from "react";
import { performanceMonitor } from "../utils/performance";

interface OptimizedImageProps {
  filePath: string;
  alt: string;
  className?: string;
  onError?: () => void;
  priority?: boolean; // Load immediately instead of lazy
}

// Global image cache shared between component instances
const imageCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

/**
 * Component tối ưu để hiển thị screenshot
 *
 * Features:
 * - Image caching để tránh re-fetch
 * - Lazy loading với Intersection Observer
 * - Deduplicate concurrent requests
 * - Memory cleanup khi unmount
 * - React.memo để tránh re-render không cần thiết
 */
const OptimizedImage: React.FC<OptimizedImageProps> = memo(
  ({ filePath, alt, className = "", onError, priority = false }) => {
    const [src, setSrc] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(priority);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading images
    useEffect(() => {
      if (priority || !imgRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: "50px", // Load 50px before visible
          threshold: 0.01,
        }
      );

      observer.observe(imgRef.current);

      return () => {
        observer.disconnect();
      };
    }, [priority]);

    // Load image khi shouldLoad = true
    useEffect(() => {
      if (!shouldLoad) return;

      let mounted = true;

      const loadImage = async () => {
        const startTime = performance.now();

        try {
          // Check cache first
          if (imageCache.has(filePath)) {
            performanceMonitor.recordCacheHit();
            const cachedSrc = imageCache.get(filePath)!;
            if (mounted) {
              setSrc(cachedSrc);
              setLoading(false);
            }
            return;
          }

          performanceMonitor.recordCacheMiss();

          // Check if request is already in progress (deduplicate)
          if (pendingRequests.has(filePath)) {
            const dataUrl = await pendingRequests.get(filePath)!;
            if (mounted) {
              setSrc(dataUrl);
              setLoading(false);
            }
            return;
          }

          // Start new request
          const requestPromise =
            window.electronAPI.getScreenshotImage(filePath);
          pendingRequests.set(filePath, requestPromise);

          const dataUrl = await requestPromise;

          // Clean up pending request
          pendingRequests.delete(filePath);

          if (mounted) {
            // Store in cache
            imageCache.set(filePath, dataUrl);
            setSrc(dataUrl);
            setLoading(false);

            // Record load time
            const endTime = performance.now();
            performanceMonitor.recordLoadTime(endTime - startTime);
          }
        } catch (err) {
          console.error("Failed to load image:", filePath, err);
          pendingRequests.delete(filePath);
          performanceMonitor.recordError();

          if (mounted) {
            setLoading(false);
            setError(true);
            onError?.();
          }
        }
      };

      loadImage();

      return () => {
        mounted = false;
      };
    }, [filePath, shouldLoad, onError]);

    if (!shouldLoad) {
      return (
        <div
          ref={imgRef}
          className={`${className} flex items-center justify-center bg-gray-200 dark:bg-gray-700`}
        >
          <div className="text-gray-500 dark:text-gray-400 text-xs">⏳</div>
        </div>
      );
    }

    if (loading) {
      return (
        <div
          ref={imgRef}
          className={`${className} flex items-center justify-center bg-gray-200 dark:bg-gray-700`}
        >
          <div className="text-gray-500 dark:text-gray-400 text-xs animate-pulse">
            Loading...
          </div>
        </div>
      );
    }

    if (error || !src) {
      return (
        <div
          className={`${className} flex items-center justify-center bg-gray-200 dark:bg-gray-700`}
        >
          <div className="text-gray-500 dark:text-gray-500 text-xs">
            ❌ Failed
          </div>
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to avoid re-render if props haven't changed
    return (
      prevProps.filePath === nextProps.filePath &&
      prevProps.className === nextProps.className &&
      prevProps.priority === nextProps.priority
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

// Function to clear cache if needed
export const clearImageCache = () => {
  imageCache.clear();
  pendingRequests.clear();
};

// Function to preload images
export const preloadImage = async (filePath: string): Promise<void> => {
  if (imageCache.has(filePath)) return;

  try {
    const dataUrl = await window.electronAPI.getScreenshotImage(filePath);
    imageCache.set(filePath, dataUrl);
  } catch (error) {
    console.error("Failed to preload image:", filePath, error);
  }
};

export default OptimizedImage;
