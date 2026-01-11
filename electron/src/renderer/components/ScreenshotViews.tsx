import React, { memo } from "react";
import { Icons } from "./Icons";

interface Screenshot {
  id: number;
  filePath?: string; // Optional for server mode
  fileName: string;
  capturedAt: string;
  screenNumber: number;
  taskId?: number;
  fileSize: number;
}

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  onSelect: (screenshot: Screenshot) => void;
  onDelete: (screenshot: Screenshot) => void;
  formatDate: (dateString: string, format: string) => string;
  formatFileSize: (bytes: number) => string;
  ImageComponent: React.ComponentType<any>; // Support both OptimizedImage and AuthenticatedImage
  isServerMode?: boolean;
}

/**
 * Grid view component tối ưu với virtualization support
 * Sử dụng React.memo để tránh re-render toàn bộ grid khi chỉ 1 item thay đổi
 */
const ScreenshotGrid: React.FC<ScreenshotGridProps> = memo(
  ({
    screenshots,
    onSelect,
    onDelete,
    formatDate,
    formatFileSize,
    ImageComponent,
    isServerMode = false,
  }) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 p-0.5">
        {screenshots.map((screenshot) => (
          <ScreenshotGridItem
            key={screenshot.id}
            screenshot={screenshot}
            onSelect={onSelect}
            onDelete={onDelete}
            formatDate={formatDate}
            formatFileSize={formatFileSize}
            ImageComponent={ImageComponent}
            isServerMode={isServerMode}
          />
        ))}
      </div>
    );
  }
);

/**
 * Grid item component - memoized để tránh re-render khi screenshot không thay đổi
 */
const ScreenshotGridItem: React.FC<{
  screenshot: Screenshot;
  onSelect: (screenshot: Screenshot) => void;
  onDelete: (screenshot: Screenshot) => void;
  formatDate: (dateString: string, format: string) => string;
  formatFileSize: (bytes: number) => string;
  ImageComponent: React.ComponentType<any>;
  isServerMode?: boolean;
}> = memo(
  ({
    screenshot,
    onSelect,
    onDelete,
    formatDate,
    formatFileSize,
    ImageComponent,
    isServerMode = false,
  }) => {
    const handleClick = () => onSelect(screenshot);
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(screenshot);
    };

    return (
      <div
        className="group relative bg-dark-800/80 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500/70 hover:bg-dark-800 transition-all duration-200 shadow-sm hover:shadow-lg border border-dark-700/50"
        onClick={handleClick}
      >
        {/* Thumbnail */}
        <div className="aspect-video bg-dark-700/50 flex items-center justify-center relative">
          {isServerMode ? (
            <ImageComponent
              screenshotId={screenshot.id}
              alt={screenshot.fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageComponent
              filePath={screenshot.filePath}
              alt={screenshot.fileName}
              className="w-full h-full object-cover"
            />
          )}
          {/* Screen badge overlay */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md">
            <Icons.Monitor className="w-3 h-3" />
            <span className="font-medium">{screenshot.screenNumber + 1}</span>
          </div>
          {/* View overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Icons.Eye className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-2.5">
          <div className="flex items-center gap-1.5 text-dark-300 text-xs">
            <Icons.Clock className="w-3 h-3 text-primary-400" />
            <span>{formatDate(screenshot.capturedAt, "HH:mm:ss")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-dark-500 text-xs mt-1">
            <Icons.Database className="w-3 h-3" />
            <span>{formatFileSize(screenshot.fileSize)}</span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="absolute top-1.5 right-1.5 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          aria-label="Delete screenshot"
          title="Delete"
        >
          <Icons.Trash className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  },
  (prev, next) => {
    // Custom comparison - only re-render if screenshot data changes
    return (
      prev.screenshot.id === next.screenshot.id &&
      prev.screenshot.capturedAt === next.screenshot.capturedAt &&
      prev.screenshot.fileSize === next.screenshot.fileSize
    );
  }
);

/**
 * List view component tối ưu - compact table style
 */
const ScreenshotList: React.FC<ScreenshotGridProps> = memo(
  ({
    screenshots,
    onSelect,
    onDelete,
    formatDate,
    formatFileSize,
    ImageComponent,
    isServerMode = false,
  }) => {
    return (
      <div className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700/50">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-dark-800 border-b border-dark-700/50 text-xs text-dark-400 font-medium uppercase tracking-wide">
          <div className="col-span-1 flex items-center gap-1.5">
            <Icons.Image className="w-3.5 h-3.5" />
          </div>
          <div className="col-span-4 flex items-center gap-1.5">
            <Icons.File className="w-3.5 h-3.5" />
            <span>Filename</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5">
            <Icons.Monitor className="w-3.5 h-3.5" />
            <span>Screen</span>
          </div>
          <div className="col-span-3 flex items-center gap-1.5">
            <Icons.Calendar className="w-3.5 h-3.5" />
            <span>Captured</span>
          </div>
          <div className="col-span-1 flex items-center gap-1.5">
            <Icons.Database className="w-3.5 h-3.5" />
            <span>Size</span>
          </div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-dark-700/30">
          {screenshots.map((screenshot) => (
            <ScreenshotListItem
              key={screenshot.id}
              screenshot={screenshot}
              onSelect={onSelect}
              onDelete={onDelete}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              ImageComponent={ImageComponent}
              isServerMode={isServerMode}
            />
          ))}
        </div>
      </div>
    );
  }
);

/**
 * List item component - compact row style
 */
const ScreenshotListItem: React.FC<{
  screenshot: Screenshot;
  onSelect: (screenshot: Screenshot) => void;
  onDelete: (screenshot: Screenshot) => void;
  formatDate: (dateString: string, format: string) => string;
  formatFileSize: (bytes: number) => string;
  ImageComponent: React.ComponentType<any>;
  isServerMode?: boolean;
}> = memo(
  ({
    screenshot,
    onSelect,
    onDelete,
    formatDate,
    formatFileSize,
    ImageComponent,
    isServerMode = false,
  }) => {
    const handleClick = () => onSelect(screenshot);
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(screenshot);
    };

    return (
      <div
        className="group grid grid-cols-12 gap-3 px-4 py-2 items-center hover:bg-dark-700/30 cursor-pointer transition-colors duration-150"
        onClick={handleClick}
      >
        {/* Thumbnail */}
        <div className="col-span-1">
          <div className="w-14 h-9 bg-dark-700/50 rounded-md overflow-hidden relative group-hover:ring-2 group-hover:ring-primary-500/50 transition-all">
            {isServerMode ? (
              <ImageComponent
                screenshotId={screenshot.id}
                alt={screenshot.fileName}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageComponent
                filePath={screenshot.filePath}
                alt={screenshot.fileName}
                className="w-full h-full object-cover"
              />
            )}
            {/* View overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icons.Eye className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Filename */}
        <div className="col-span-4 min-w-0">
          <p className="text-dark-200 text-sm font-medium truncate group-hover:text-white transition-colors">
            {screenshot.fileName}
          </p>
        </div>

        {/* Screen */}
        <div className="col-span-2">
          <span className="inline-flex items-center gap-1.5 bg-dark-700/50 text-dark-300 text-xs px-2 py-1 rounded-md">
            <Icons.Monitor className="w-3 h-3 text-primary-400" />
            <span>Screen {screenshot.screenNumber + 1}</span>
          </span>
        </div>

        {/* Captured time */}
        <div className="col-span-3">
          <div className="flex items-center gap-1.5 text-dark-400 text-sm">
            <Icons.Clock className="w-3.5 h-3.5 text-green-400" />
            <span>{formatDate(screenshot.capturedAt, "MMM dd, HH:mm:ss")}</span>
          </div>
        </div>

        {/* Size */}
        <div className="col-span-1">
          <span className="text-dark-500 text-xs font-mono">
            {formatFileSize(screenshot.fileSize)}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(screenshot);
            }}
            className="p-1.5 rounded-md text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="View screenshot"
            title="View"
          >
            <Icons.Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete screenshot"
            title="Delete"
          >
            <Icons.Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.screenshot.id === next.screenshot.id &&
      prev.screenshot.capturedAt === next.screenshot.capturedAt &&
      prev.screenshot.fileSize === next.screenshot.fileSize
    );
  }
);

ScreenshotGrid.displayName = "ScreenshotGrid";
ScreenshotGridItem.displayName = "ScreenshotGridItem";
ScreenshotList.displayName = "ScreenshotList";
ScreenshotListItem.displayName = "ScreenshotListItem";

export { ScreenshotGrid, ScreenshotList };
