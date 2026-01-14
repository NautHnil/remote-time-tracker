import React, { memo, useEffect, useRef, useState } from "react";
import { screenshotService } from "../services";
import { Icons } from "./Icons";

interface AuthenticatedImageProps {
  screenshotId: number;
  alt: string;
  className?: string;
  onError?: () => void;
  priority?: boolean;
}

/**
 * AuthenticatedImage component for displaying server screenshots
 * Fetches images with authentication token and displays as blob URL
 */
const AuthenticatedImage: React.FC<AuthenticatedImageProps> = memo(
  ({ screenshotId, alt, className = "", onError, priority = false }) => {
    const [src, setSrc] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(priority);
    const imgRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
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
          rootMargin: "200px",
          threshold: 0.01,
        }
      );

      observer.observe(imgRef.current);

      return () => {
        observer.disconnect();
      };
    }, [priority]);

    // Fetch image with authentication
    useEffect(() => {
      if (!shouldLoad) return;

      let mounted = true;

      const loadImage = async () => {
        try {
          setLoading(true);
          setError(false);
          // Priority images (lightbox) get higher priority in queue
          const priorityValue = priority ? 10 : 0;
          const url = await screenshotService.getViewUrl(
            screenshotId,
            priorityValue
          );

          if (mounted) {
            setSrc(url);
            setLoading(false);
          }
        } catch (err) {
          console.error("Failed to load screenshot:", err);
          if (mounted) {
            setError(true);
            setLoading(false);
            onError?.();
          }
        }
      };

      loadImage();

      return () => {
        mounted = false;
      };
    }, [screenshotId, shouldLoad, onError, priority]);

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

    return (
      <div ref={imgRef} className={`${className} relative`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="text-gray-500 dark:text-gray-400 text-xs animate-pulse">
              Loading...
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="text-center">
              <Icons.AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Failed to load
              </p>
            </div>
          </div>
        )}
        {src && (
          <img
            src={src}
            alt={alt}
            className={`${className} ${
              loading || error ? "invisible" : "visible"
            }`}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.screenshotId === nextProps.screenshotId &&
      prevProps.className === nextProps.className &&
      prevProps.priority === nextProps.priority
    );
  }
);

AuthenticatedImage.displayName = "AuthenticatedImage";

export default AuthenticatedImage;
