/**
 * Join Organization Page
 *
 * A Discord/Telegram-style invite link page that allows users to join organizations
 * via invite code. This page is PUBLIC and accessible without authentication.
 *
 * Flow:
 * 1. Display organization info
 * 2. When user clicks "Join":
 *    - Try to open the desktop app via deep link (timetracker://join/CODE)
 *    - If app is not installed, show download options
 * 3. User downloads app, registers, and joins organization via the invite code
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icons, type IconProps } from "../components/Icons";
import { organizationService, type OrganizationPublicInfo } from "../services";
import { apiClient } from "../services/apiClient";

// ============================================================================
// TYPES
// ============================================================================

type PageState = "loading" | "valid" | "invalid" | "expired" | "error";
type JoinState = "idle" | "opening-app" | "app-not-found" | "downloading";

interface JoinError {
  message: string;
  code?: string;
}

interface PlatformDownload {
  name: string;
  icon: string;
  filename: string;
  url: string; // Proxied download URL through backend API
  size: number;
  content_type: string;
}

interface DownloadInfo {
  version: string;
  release_date: string;
  downloads: Record<string, PlatformDownload>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Deep link protocol for the desktop app
const APP_PROTOCOL = "timetracker";
const DEEP_LINK_TIMEOUT = 2500; // Time to wait before assuming app is not installed

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Detect current operating system
 */
function detectOS(): "windows" | "mac-intel" | "mac-arm" | "linux" | "unknown" {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || "";

  if (userAgent.includes("win")) {
    return "windows";
  }
  if (userAgent.includes("mac")) {
    // Try to detect Apple Silicon vs Intel
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

/**
 * Get platform icon component
 */
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function JoinOrganizationPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [organization, setOrganization] =
    useState<OrganizationPublicInfo | null>(null);
  const [error, setError] = useState<JoinError | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [detectedOS, setDetectedOS] = useState<string>("unknown");
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Copy invite code to clipboard
  const copyInviteCode = useCallback(async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [inviteCode]);

  // Fetch organization info by invite code
  const fetchOrganization = useCallback(async () => {
    if (!inviteCode) {
      setPageState("invalid");
      setError({ message: "Invalid invite link", code: "INVALID_CODE" });
      return;
    }

    try {
      setPageState("loading");
      const orgInfo = await organizationService.getByInviteCode(inviteCode);
      setOrganization(orgInfo);
      setPageState("valid");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        "Invalid or expired invite link";

      if (errorMessage.toLowerCase().includes("expired")) {
        setPageState("expired");
        setError({ message: "This invite link has expired", code: "EXPIRED" });
      } else if (
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("invalid")
      ) {
        setPageState("invalid");
        setError({ message: "Invalid invite link", code: "INVALID" });
      } else {
        setPageState("error");
        setError({ message: errorMessage, code: "ERROR" });
      }
    }
  }, [inviteCode]);

  // Fetch download links
  const fetchDownloadLinks = useCallback(async () => {
    try {
      const response = await apiClient.publicGet<DownloadInfo>(
        "/public/downloads/latest",
      );
      setDownloadInfo(response.data);
    } catch (err) {
      console.error("Failed to fetch download links:", err);
    }
  }, []);

  // Try to open the desktop app via deep link
  const tryOpenApp = useCallback(() => {
    if (!inviteCode) return;

    setJoinState("opening-app");

    // Create the deep link URL
    const deepLink = `${APP_PROTOCOL}://join/${inviteCode}`;

    // Track if the page becomes hidden (app opened)
    let appOpened = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Try to open the deep link
    const startTime = Date.now();
    window.location.href = deepLink;

    // Check after timeout if app was opened
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      const elapsed = Date.now() - startTime;

      // If page didn't become hidden and enough time passed, app is not installed
      if (!appOpened && elapsed >= DEEP_LINK_TIMEOUT - 500) {
        setJoinState("app-not-found");
        // Fetch download links when we know app is not installed
        fetchDownloadLinks();
      }
    }, DEEP_LINK_TIMEOUT);
  }, [inviteCode, fetchDownloadLinks]);

  // Initialize
  useEffect(() => {
    fetchOrganization();
    setDetectedOS(detectOS());
  }, [fetchOrganization]);

  // Get organization initials for avatar
  const getOrgInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle download click - use full backend API URL
  const handleDownload = (url: string) => {
    setJoinState("downloading");
    // URL from API is a relative path like /api/v1/public/downloads/file/1.0.0/filename.dmg
    // We need to prepend the API base URL (without /api/v1 since URL already includes it)
    const apiBaseUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1"
    ).replace("/api/v1", "");
    const fullUrl = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
    window.open(fullUrl, "_blank");
  };

  // Go back to invite view
  const handleBackToInvite = () => {
    setJoinState("idle");
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  // Loading state
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="text-center relative z-10">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Icons.Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
            <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full border-2 border-primary-500/30 animate-ping" />
          </div>
          <p className="text-gray-400 font-medium">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Invalid/Expired/Error states
  if (
    pageState === "invalid" ||
    pageState === "expired" ||
    pageState === "error"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 text-center shadow-2xl">
            <div className="relative mb-6">
              <div
                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                  pageState === "expired"
                    ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20"
                    : "bg-gradient-to-br from-red-500/20 to-pink-500/20"
                }`}
              >
                {pageState === "expired" ? (
                  <Icons.Clock className="w-12 h-12 text-yellow-400" />
                ) : (
                  <Icons.XCircle className="w-12 h-12 text-red-400" />
                )}
              </div>
              <div
                className={`absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 ${
                  pageState === "expired"
                    ? "border-yellow-500/20"
                    : "border-red-500/20"
                } animate-pulse`}
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              {pageState === "expired" ? "Invite Expired" : "Invalid Invite"}
            </h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              {error?.message ||
                "This invite link is no longer valid. Please ask for a new invite from the organization admin."}
            </p>

            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-slate-700/50 hover:bg-slate-700 text-gray-300 font-medium rounded-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <Icons.Home className="w-5 h-5" />
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // App not found - Show download options
  if (joinState === "app-not-found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="max-w-2xl w-full relative z-10">
          {/* Back button */}
          <button
            onClick={handleBackToInvite}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <Icons.ArrowLeft className="w-4 h-4" />
            <span>Back to invite</span>
          </button>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Header */}
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
                  Install the desktop app to join{" "}
                  <span className="text-white font-medium">
                    {organization?.name}
                  </span>
                </p>
              </div>
            </div>

            {/* Organization info mini card */}
            {organization && (
              <div className="px-8 py-4 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center gap-4">
                  {organization.logo_url ? (
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-lg font-bold">
                      {getOrgInitials(organization.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {organization.name}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Icons.Users className="w-4 h-4" />
                      <span>{organization.member_count || 0} members</span>
                    </div>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded transition-colors"
                    title="Click to copy invite code"
                  >
                    {codeCopied ? (
                      <>
                        <Icons.Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy className="w-3.5 h-3.5" />
                        <span>Code: {inviteCode}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Download options */}
            <div className="p-8">
              {downloadInfo ? (
                <>
                  {/* Version info */}
                  <div className="flex items-center justify-between mb-6 text-sm">
                    <span className="text-gray-400">Latest Version</span>
                    <span className="text-white font-mono bg-slate-700/50 px-2 py-1 rounded">
                      v{downloadInfo.version}
                    </span>
                  </div>

                  {/* Download for detected OS */}
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

                          {/* Other platforms link */}
                          <p className="text-center text-sm text-gray-500">
                            Not your OS?{" "}
                            <button
                              onClick={() =>
                                setShowAllPlatforms((prev) => !prev)
                              }
                              className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
                            >
                              {showAllPlatforms
                                ? "Hide other platforms"
                                : "View all platforms"}
                            </button>
                          </p>

                          {/* All platforms (collapsed by default) */}
                          {showAllPlatforms && (
                            <div className="mt-4 pt-4 border-t border-slate-700/50">
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                                All platforms
                              </p>
                              <div className="grid sm:grid-cols-2 gap-3">
                                {Object.entries(downloadInfo.downloads).map(
                                  ([key, dl]) => {
                                    const Icon = getPlatformIcon(key);
                                    const isCurrentOS = key === detectedOS;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => handleDownload(dl.url)}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${
                                          isCurrentOS
                                            ? "bg-primary-500/10 border border-primary-500/30"
                                            : "bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50"
                                        }`}
                                      >
                                        <div
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            isCurrentOS
                                              ? "bg-primary-500/20"
                                              : "bg-slate-600/30"
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
                                            {dl.name}
                                            {isCurrentOS && (
                                              <span className="ml-2 text-xs text-primary-400">
                                                (Current)
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-gray-500 text-xs">
                                            {formatFileSize(dl.size)}
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
                                  },
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    // Fallback: show all platforms if OS not detected
                    <div className="grid sm:grid-cols-2 gap-3">
                      {Object.entries(downloadInfo.downloads).map(
                        ([key, download]) => {
                          const IconComponent = getPlatformIcon(key);
                          return (
                            <button
                              key={key}
                              onClick={() => handleDownload(download.url)}
                              className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl transition-all duration-300 group"
                            >
                              <div className="w-10 h-10 bg-slate-600/30 rounded-lg flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                                  {download.name}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {formatFileSize(download.size)}
                                </div>
                              </div>
                              <Icons.Download className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Icons.Loader className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
                  <p className="text-gray-400">Loading download links...</p>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Icons.CheckCircle className="w-5 h-5 text-green-400" />
                  After downloading
                </h3>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                  <li>Install and open the Remote Time Tracker app</li>
                  <li>Create a new account or sign in</li>
                  <li className="flex flex-wrap items-center gap-1">
                    <span>Use invite code</span>
                    <button
                      onClick={copyInviteCode}
                      className="inline-flex items-center gap-1 bg-slate-700/50 hover:bg-slate-600/50 px-1.5 py-0.5 rounded text-primary-400 font-mono transition-colors"
                      title="Click to copy"
                    >
                      {codeCopied ? (
                        <>
                          <Icons.Check className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <span>{inviteCode}</span>
                          <Icons.Copy className="w-3 h-3" />
                        </>
                      )}
                    </button>
                    <span>to join the organization</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Branding */}
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

  // Opening app state
  if (joinState === "opening-app") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 text-center shadow-2xl">
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
                <Icons.ExternalLink className="w-10 h-10 text-primary-400" />
              </div>
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-2 border-primary-500/30 animate-ping" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Opening App...
            </h1>
            <p className="text-gray-400 mb-6">
              Looking for Remote Time Tracker on your device
            </p>

            <div className="flex items-center justify-center gap-2">
              <Icons.Loader className="w-5 h-5 animate-spin text-primary-400" />
              <span className="text-gray-500 text-sm">Please wait...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid state - Show join invitation (main view)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-r from-primary-600/30 via-purple-600/30 to-primary-600/30 px-8 py-8 border-b border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <div className="flex items-center justify-center gap-2 text-primary-300 mb-2">
                <Icons.Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Invitation
                </span>
                <Icons.Sparkles className="w-4 h-4" />
              </div>
              <p className="text-center text-gray-300">
                You've been invited to join
              </p>
            </div>
          </div>

          {/* Organization Info */}
          <div className="px-8 py-10">
            {organization && (
              <>
                {/* Organization Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    {organization.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="w-28 h-28 rounded-2xl object-cover border-2 border-slate-600/50 shadow-2xl group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-500 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl group-hover:scale-105 transition-transform duration-300">
                        {getOrgInitials(organization.name)}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-xl -z-10 group-hover:bg-primary-500/30 transition-all duration-300" />
                  </div>
                </div>

                {/* Organization Name */}
                <h1 className="text-3xl font-bold text-white text-center mb-3">
                  {organization.name}
                </h1>

                {/* Description */}
                {organization.description && (
                  <p className="text-gray-400 text-center text-sm mb-6 line-clamp-3 leading-relaxed max-w-sm mx-auto">
                    {organization.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center gap-8 mb-8 py-4 border-y border-slate-700/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Icons.Users className="w-5 h-5 text-primary-400" />
                      <span className="text-2xl font-bold text-white">
                        {organization.member_count || 0}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Members
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Join Button */}
            <button
              onClick={tryOpenApp}
              disabled={joinState !== "idle"}
              className="relative flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-[length:200%_100%] hover:bg-right text-white font-semibold rounded-xl transition-all duration-500 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <span>Open App to Join</span>
              <Icons.ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Alternative action */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Don't have the app?{" "}
              <button
                onClick={() => {
                  setJoinState("app-not-found");
                  fetchDownloadLinks();
                }}
                className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                Download it here
              </button>
            </p>
          </div>
        </div>

        {/* Branding */}
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
