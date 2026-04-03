import { Icons } from "../Icons";
import { UpdateStep } from "./UpdateSection";

interface UpdateNoticeProps {
  step: UpdateStep;
  availableVersion: string | null;
  progress: number;
  errorMessage: string;
  onClose: () => void;
  onUpdateNow: () => void | Promise<void>;
}

export function UpdateNotice({
  step,
  availableVersion,
  progress,
  errorMessage,
  onClose,
  onUpdateNow,
}: UpdateNoticeProps) {
  const title =
    step === "downloaded"
      ? "Update is ready to install"
      : step === "downloading" || step === "download-pending"
        ? "Downloading new version"
        : step === "installing"
          ? "Installing update"
          : step === "error"
            ? "Update action failed"
            : "New version available";

  const description =
    step === "downloaded"
      ? "Open the Updates tab and install when you're ready."
      : step === "downloading"
        ? `Download in progress: ${progress}%`
        : step === "download-pending"
          ? "Preparing the download..."
          : step === "installing"
            ? "The app is preparing the installer."
            : step === "error"
              ? errorMessage || "Unable to update right now."
              : `Version ${availableVersion ? `v${availableVersion}` : "new"} is ready to download.`;

  const buttonLabel =
    step === "downloaded"
      ? "Open Update"
      : step === "downloading" || step === "download-pending"
        ? "View Progress"
        : step === "installing"
          ? "Open Update"
          : step === "error"
            ? "Open Update"
            : "Update Now";

  const isBusy =
    step === "download-pending" ||
    step === "downloading" ||
    step === "installing";

  return (
    <div className="fixed right-4 bottom-4 z-[120] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-sky-300/80 bg-gradient-to-br from-sky-50 via-cyan-50 to-white shadow-2xl shadow-sky-900/20 backdrop-blur-xl dark:border-sky-400/40 dark:bg-gradient-to-br dark:from-sky-950 dark:via-cyan-950 dark:to-slate-900">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-sky-700 shadow-sm dark:bg-white/10 dark:text-sky-200">
            {step === "downloaded" ? (
              <Icons.Check className="h-5 w-5" />
            ) : step === "error" ? (
              <Icons.AlertTriangle className="h-5 w-5" />
            ) : isBusy ? (
              <Icons.RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Icons.Download className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {description}
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-100"
                aria-label="Close update notice"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>

            {step === "downloading" && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Downloading</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={onUpdateNow}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-700/25 transition-colors hover:bg-sky-700"
              >
                {isBusy ? (
                  <Icons.RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.Download className="h-4 w-4" />
                )}
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotice;
