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

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
// ICONS
// ============================================================================

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const Icons = {
  Users: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" strokeWidth={2} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      />
    </svg>
  ),
  CheckCircle: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  XCircle: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Clock: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Loader: ({ className }: IconProps) => (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  ),
  ArrowRight: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  ),
  ArrowLeft: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
  Home: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  Sparkles: ({ className, style }: IconProps) => (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  ),
  Download: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  ),
  ExternalLink: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  ),
  Windows: ({ className }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  ),
  Apple: ({ className }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  Linux: ({ className }: IconProps) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.117-.468.32-.753.692-.92.025-.009.046-.018.071-.027zm-1.442 4.894c-.143.534.109.954.336 1.368.265.479.541.846.146 1.425-.176.264-.605.46-1.135.46h.001c-.47 0-1.023-.151-1.582-.469-.758-.43-1.647-.603-2.415-.736-.566-.098-.937-.268-1.122-.534-.187-.267-.189-.601-.036-1.069a.96.96 0 01.053-.132 2.4 2.4 0 00.28.065c.347.07.753.043 1.167-.102.414-.145.83-.396 1.223-.738.394-.334.749-.733 1.038-1.137l.003-.003.274-.334a.96.96 0 00.097.07c-.015.209-.04.468-.04.736-.015.94.09 2.074.703 2.894-.135.202-.19.468-.178.735z" />
    </svg>
  ),
  Monitor: ({ className }: IconProps) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
};

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
                  <div className="text-xs text-gray-500 bg-slate-700/50 px-2 py-1 rounded">
                    Code: {inviteCode}
                  </div>
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
                  <li>
                    Use invite code{" "}
                    <code className="bg-slate-700/50 px-1.5 py-0.5 rounded text-primary-400 font-mono">
                      {inviteCode}
                    </code>{" "}
                    to join the organization
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
