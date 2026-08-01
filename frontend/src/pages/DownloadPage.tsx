import React, { useCallback, useEffect, useState } from "react";
import { Icons, type IconProps } from "../components/Icons";
import { apiClient } from "../services/apiClient";

interface PlatformDownload {
  name: string;
  icon: string;
  filename: string;
  url: string;
  size: number;
  content_type: string;
}

interface DownloadInfo {
  version: string;
  release_date: string;
  downloads: Record<string, PlatformDownload>;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function detectOS(): "windows" | "mac-intel" | "mac-arm" | "linux" | "unknown" {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || "";

  if (userAgent.includes("win")) {
    return "windows";
  }
  if (userAgent.includes("mac")) {
    if (platform.includes("arm") || userAgent.includes("arm")) {
      return "mac-arm";
    }
    return "mac-intel";
  }
  if (userAgent.includes("linux")) {
    return "linux";
  }
  return "unknown";
}

function getPlatformIcon(platformKey: string): React.FC<IconProps> {
  switch (platformKey) {
    case "windows":
      return Icons.Windows;
    case "mac-intel":
    case "mac-arm":
      return Icons.Apple;
    case "linux":
      return Icons.Linux;
    default:
      return Icons.Monitor;
  }
}

export default function DownloadPage() {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [detectedOS, setDetectedOS] = useState<string>("unknown");
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDownloadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.publicGet<DownloadInfo>(
        "/public/downloads/latest",
      );
      setDownloadInfo(response.data);
    } catch (err: any) {
      console.error("Failed to fetch download links:", err);
      setError(err?.message || "Failed to load download links");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetectedOS(detectOS());
    fetchDownloadLinks();
  }, [fetchDownloadLinks]);

  const handleDownload = (url: string) => {
    const apiBaseUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1"
    ).replace("/api/v1", "");
    const fullUrl = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
    window.open(fullUrl, "_blank");
  };

  const renderDownloadOptions = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <Icons.Loader className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading download links...</p>
        </div>
      );
    }

    if (error || !downloadInfo) {
      return (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <Icons.XCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-white font-medium mb-2">Downloads unavailable</p>
          <p className="text-gray-400 text-sm mb-5">
            {error || "No download versions are available right now."}
          </p>
          <button
            onClick={fetchDownloadLinks}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
          >
            <Icons.Loader className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-6 text-sm">
          <span className="text-gray-400">Latest Version</span>
          <span className="text-white font-mono bg-slate-700/50 px-2 py-1 rounded">
            v{downloadInfo.version}
          </span>
        </div>

        {downloadInfo.downloads[detectedOS] ? (
          (() => {
            const download = downloadInfo.downloads[detectedOS];
            const IconComponent = getPlatformIcon(detectedOS);
            return (
              <div className="space-y-4">
                <button
                  onClick={() => handleDownload(download.url)}
                  className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-primary-600/20 to-purple-600/20 hover:from-primary-600/30 hover:to-purple-600/30 border border-primary-500/30 rounded-xl transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    <IconComponent className="w-7 h-7 text-primary-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold text-lg">
                      {download.name}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatFileSize(download.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-white transition-colors">
                    <Icons.Download className="w-5 h-5 group-hover:animate-bounce" />
                    <span className="font-medium">Download</span>
                  </div>
                </button>

                <p className="text-center text-sm text-gray-500">
                  Not your OS?{" "}
                  <button
                    onClick={() => setShowAllPlatforms((prev) => !prev)}
                    className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
                  >
                    {showAllPlatforms
                      ? "Hide other platforms"
                      : "View all platforms"}
                  </button>
                </p>

                {showAllPlatforms && (
                  <PlatformGrid
                    downloads={downloadInfo.downloads}
                    detectedOS={detectedOS}
                    onDownload={handleDownload}
                  />
                )}
              </div>
            );
          })()
        ) : (
          <PlatformGrid
            downloads={downloadInfo.downloads}
            detectedOS={detectedOS}
            onDownload={handleDownload}
          />
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="max-w-2xl w-full relative z-10">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
          <div className="relative bg-gradient-to-r from-primary-600/30 via-purple-600/30 to-primary-600/30 px-8 py-8 border-b border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800/80 rounded-2xl mb-4">
                <Icons.Download className="w-8 h-8 text-primary-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Download Remote Time Tracker
              </h1>
              <p className="text-gray-400">
                Choose the latest desktop app version for your operating system.
              </p>
            </div>
          </div>

          <div className="p-8">
            {renderDownloadOptions()}

            <div className="mt-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Icons.CheckCircle className="w-5 h-5 text-green-400" />
                After downloading
              </h3>
              <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                <li>Install and open the Remote Time Tracker app</li>
                <li>Create a new account or sign in</li>
                <li>Start tracking time from the desktop app</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2.5 text-gray-600">
          <div className="w-8 h-8 bg-slate-800/80 rounded-lg flex items-center justify-center">
            <Icons.Clock className="w-4 h-4 text-primary-500" />
          </div>
          <span className="text-sm font-medium">Remote Time Tracker</span>
        </div>
      </div>
    </div>
  );
}

function PlatformGrid({
  downloads,
  detectedOS,
  onDownload,
}: {
  downloads: Record<string, PlatformDownload>;
  detectedOS: string;
  onDownload: (url: string) => void;
}) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
        All platforms
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(downloads).map(([key, download]) => {
          const Icon = getPlatformIcon(key);
          const isCurrentOS = key === detectedOS;
          return (
            <button
              key={key}
              onClick={() => onDownload(download.url)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${
                isCurrentOS
                  ? "bg-primary-500/10 border border-primary-500/30"
                  : "bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCurrentOS ? "bg-primary-500/20" : "bg-slate-600/30"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isCurrentOS
                      ? "text-primary-400"
                      : "text-gray-400 group-hover:text-white"
                  } transition-colors`}
                />
              </div>
              <div className="flex-1 text-left">
                <div
                  className={`text-sm font-medium ${
                    isCurrentOS
                      ? "text-primary-300"
                      : "text-gray-300 group-hover:text-white"
                  } transition-colors`}
                >
                  {download.name}
                  {isCurrentOS && (
                    <span className="ml-2 text-xs text-primary-400">
                      (Current)
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-xs">
                  {formatFileSize(download.size)}
                </div>
              </div>
              <Icons.Download
                className={`w-4 h-4 ${
                  isCurrentOS
                    ? "text-primary-400"
                    : "text-gray-500 group-hover:text-gray-300"
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
