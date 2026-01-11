import { format, parseISO } from "date-fns";
import React, { useCallback, useEffect } from "react";
import AuthenticatedImage from "./AuthenticatedImage";
import { Icons } from "./Icons";
import OptimizedImage from "./OptimizedImage";

export interface LightboxScreenshot {
  id: number;
  filePath?: string;
  fileName: string;
  capturedAt: string;
  screenNumber: number;
  fileSize: number;
}

interface LightboxProps {
  screenshot: LightboxScreenshot;
  screenshots: LightboxScreenshot[];
  onClose: () => void;
  onNavigate: (screenshot: LightboxScreenshot) => void;
  isServerMode?: boolean;
  zIndex?: number;
}

/**
 * Reusable Lightbox component for viewing screenshots in a gallery-style overlay.
 * Supports keyboard navigation (Left/Right arrows, Escape to close).
 */
const Lightbox: React.FC<LightboxProps> = ({
  screenshot,
  screenshots,
  onClose,
  onNavigate,
  isServerMode = false,
  zIndex = 50,
}) => {
  const currentIndex = screenshots.findIndex((s) => s.id === screenshot.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < screenshots.length - 1;

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }, []);

  const handlePrevious = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (hasPrevious) {
        onNavigate(screenshots[currentIndex - 1]);
      }
    },
    [hasPrevious, currentIndex, screenshots, onNavigate]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (hasNext) {
        onNavigate(screenshots[currentIndex + 1]);
      }
    },
    [hasNext, currentIndex, screenshots, onNavigate]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (hasPrevious) {
            onNavigate(screenshots[currentIndex - 1]);
          }
          break;
        case "ArrowRight":
          if (hasNext) {
            onNavigate(screenshots[currentIndex + 1]);
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrevious, hasNext, currentIndex, screenshots, onNavigate, onClose]);

  return (
    <div
      className={`fixed inset-0 bg-black/95 flex items-center justify-center`}
      style={{ zIndex }}
      onClick={onClose}
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
        title="Close (Esc)"
      >
        <Icons.X className="w-7 h-7" />
      </button>

      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={!hasPrevious}
        className="absolute z-10 left-4 text-white/80 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed p-3 rounded-full hover:bg-white/10 transition-colors"
        title="Previous (←)"
      >
        <Icons.ChevronLeft className="w-10 h-10" />
      </button>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={!hasNext}
        className="absolute z-10 right-4 text-white/80 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed p-3 rounded-full hover:bg-white/10 transition-colors"
        title="Next (→)"
      >
        <Icons.ChevronRight className="w-10 h-10" />
      </button>

      {/* Image Container */}
      <div
        className="max-w-7xl max-h-screen p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isServerMode ? (
          <AuthenticatedImage
            screenshotId={screenshot.id}
            alt={screenshot.fileName}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            priority={true}
          />
        ) : (
          <OptimizedImage
            filePath={screenshot.filePath!}
            alt={screenshot.fileName}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            priority={true}
          />
        )}

        {/* Image Info */}
        <div className="flex justify-center">
          <div className="mt-4 text-center bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 inline-block mx-auto">
            <p className="text-white font-medium">{screenshot.fileName}</p>
            <div className="flex items-center justify-center gap-4 text-gray-400 text-sm mt-2">
              <span className="flex items-center gap-1.5">
                <Icons.Monitor className="w-4 h-4 text-blue-400" />
                Screen {screenshot.screenNumber + 1}
              </span>
              <span className="flex items-center gap-1.5">
                <Icons.Clock className="w-4 h-4 text-green-400" />
                {formatDate(screenshot.capturedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icons.Database className="w-4 h-4 text-purple-400" />
                {formatFileSize(screenshot.fileSize)}
              </span>
            </div>
            <div className="text-gray-600 text-xs mt-2">
              {currentIndex + 1} / {screenshots.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;
