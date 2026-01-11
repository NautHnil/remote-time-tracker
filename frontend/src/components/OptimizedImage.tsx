import React, { memo, useEffect, useRef, useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  priority?: boolean; // Load immediately instead of lazy
}

/**
 * Component tối ưu để hiển thị screenshot từ server
 *
 * Features:
 * - Lazy loading với Intersection Observer
 * - Memory efficient image loading
 * - Error handling
 * - React.memo để tránh re-render không cần thiết
 * - Native browser caching (không cần manual cache vì browser đã cache)
 */
const OptimizedImage: React.FC<OptimizedImageProps> = memo(
  ({ src, alt, className = "", onError, priority = false }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(priority);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading images
    useEffect(() => {
      if (priority || !imgRef.current) {
        setShouldLoad(true);
        return;
      }

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
          rootMargin: "100px", // Load 100px before visible
          threshold: 0.01,
        }
      );

      observer.observe(imgRef.current);

      return () => {
        observer.disconnect();
      };
    }, [priority]);

    const handleLoad = () => {
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      setLoading(false);
      setError(true);
      onError?.();
    };

    if (!shouldLoad) {
      return (
        <div
          ref={imgRef}
          className={`${className} flex items-center justify-center bg-gray-200`}
        >
          <div className="text-gray-400 text-xs">⏳</div>
        </div>
      );
    }

    return (
      <div ref={imgRef} className={`${className} relative`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-gray-400 text-xs animate-pulse">
              Loading...
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-gray-500 text-xs">❌ Failed</div>
          </div>
        )}
        <img
          src={src}
          alt={alt}
          className={`${className} ${
            loading || error ? "invisible" : "visible"
          }`}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to avoid re-render if props haven't changed
    return (
      prevProps.src === nextProps.src &&
      prevProps.className === nextProps.className &&
      prevProps.priority === nextProps.priority
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
