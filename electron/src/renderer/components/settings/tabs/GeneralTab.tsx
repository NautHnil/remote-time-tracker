import { useEffect, useState } from "react";
import {
  formatDurationFull,
  formatDurationMinimal,
} from "../../../utils/timeFormat";
import { Icons } from "../../Icons";
import { ThemeSection } from "../ThemeSection";
import { Card, SectionHeader } from "../ui";

const SCREENSHOT_INTERVAL_MIN = 60 * 1000;
const SCREENSHOT_INTERVAL_MAX = 15 * 60 * 1000;
const SCREENSHOT_INTERVAL_DEFAULT = 5 * 60 * 1000;

const SYNC_INTERVAL_MIN = 5 * 1000;
const SYNC_INTERVAL_MAX = 30 * 60 * 1000;
const SYNC_INTERVAL_DEFAULT = 60 * 1000;
const MS_PER_SECOND = 1000;
const SCREENSHOT_INTERVAL_MIN_SECONDS = SCREENSHOT_INTERVAL_MIN / MS_PER_SECOND;
const SCREENSHOT_INTERVAL_MAX_SECONDS = SCREENSHOT_INTERVAL_MAX / MS_PER_SECOND;
const SCREENSHOT_INTERVAL_DEFAULT_SECONDS =
  SCREENSHOT_INTERVAL_DEFAULT / MS_PER_SECOND;
const SYNC_INTERVAL_MIN_SECONDS = SYNC_INTERVAL_MIN / MS_PER_SECOND;
const SYNC_INTERVAL_MAX_SECONDS = SYNC_INTERVAL_MAX / MS_PER_SECOND;
const SYNC_INTERVAL_DEFAULT_SECONDS = SYNC_INTERVAL_DEFAULT / MS_PER_SECOND;

type IntervalKey = "screenshotInterval" | "syncInterval";

export function GeneralTab() {
  const [config, setConfig] = useState<any>({});
  const [inputValues, setInputValues] = useState<Record<IntervalKey, string>>({
    screenshotInterval: String(SCREENSHOT_INTERVAL_DEFAULT_SECONDS),
    syncInterval: String(SYNC_INTERVAL_DEFAULT_SECONDS),
  });
  const [errors, setErrors] = useState<Partial<Record<IntervalKey, string>>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    setInputValues({
      screenshotInterval: String(
        config.screenshotInterval ?? SCREENSHOT_INTERVAL_DEFAULT_SECONDS,
      ),
      syncInterval: String(config.syncInterval ?? SYNC_INTERVAL_DEFAULT_SECONDS),
    });
  }, [config.screenshotInterval, config.syncInterval]);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.config.get();
      setConfig(result);
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      await window.electronAPI.config.set(key, value);
      await loadConfig();
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const getIntervalMeta = (key: IntervalKey) =>
    key === "screenshotInterval"
      ? {
          min: SCREENSHOT_INTERVAL_MIN_SECONDS,
          max: SCREENSHOT_INTERVAL_MAX_SECONDS,
          fallback: SCREENSHOT_INTERVAL_DEFAULT_SECONDS,
          label: "Screenshot interval",
        }
      : {
          min: SYNC_INTERVAL_MIN_SECONDS,
          max: SYNC_INTERVAL_MAX_SECONDS,
          fallback: SYNC_INTERVAL_DEFAULT_SECONDS,
          label: "Sync interval",
        };

  const handleInputChange = (key: IntervalKey, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const commitInterval = async (key: IntervalKey) => {
    const { min, max, fallback, label } = getIntervalMeta(key);
    const parsed = parseInt(inputValues[key], 10);

    if (!Number.isFinite(parsed)) {
      setErrors((prev) => ({
        ...prev,
        [key]: `${label} must be a number between ${min}s and ${max}s.`,
      }));
      setInputValues((prev) => ({
        ...prev,
        [key]: String(config[key] ?? fallback),
      }));
      return;
    }

    const clampedValue = Math.min(Math.max(parsed, min), max);
    if (clampedValue !== parsed) {
      setErrors((prev) => ({
        ...prev,
        [key]: `${label} was adjusted to stay between ${min}s and ${max}s.`,
      }));
    } else {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    setInputValues((prev) => ({ ...prev, [key]: String(clampedValue) }));
    await updateConfig(key, clampedValue);
  };

  return (
    <>
      <Card className="p-6">
        <SectionHeader
          icon={<Icons.Sun className="w-5 h-5" />}
          title="Appearance"
          description="Choose your preferred theme"
        />
        <ThemeSection />
      </Card>

      <Card className="p-6">
        <SectionHeader
          icon={<Icons.Monitor className="w-5 h-5" />}
          title="Startup"
          description="Control how the desktop app opens"
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-gray-900/30">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-100">
              Launch when computer starts
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
              Open Remote Time Tracker automatically after signing in.
            </p>
          </div>
          <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={Boolean(config.launchAtLogin)}
              onChange={(e) => updateConfig("launchAtLogin", e.target.checked)}
              className="peer sr-only"
              aria-label="Launch when computer starts"
            />
            <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary-600 dark:bg-dark-600" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          icon={<Icons.Sliders className="w-5 h-5" />}
          title="Intervals"
          description="Configure capture and sync timing"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              <span className="flex items-center gap-2">
                <Icons.Camera className="w-4 h-4 text-gray-400" />
                Screenshot Interval
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={SCREENSHOT_INTERVAL_MIN_SECONDS}
                max={SCREENSHOT_INTERVAL_MAX_SECONDS}
                value={inputValues.screenshotInterval}
                onChange={(e) =>
                  handleInputChange("screenshotInterval", e.target.value)
                }
                onBlur={() => commitInterval("screenshotInterval")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void commitInterval("screenshotInterval");
                  }
                }}
                className="input-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-dark-500 pointer-events-none">
                sec
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Current:{" "}
              <span className="font-medium text-gray-700 dark:text-dark-300">
                {formatDurationMinimal(
                  config.screenshotIntervalMs ?? SCREENSHOT_INTERVAL_DEFAULT,
                )}
              </span>
              {" · "}Allowed: {formatDurationFull(SCREENSHOT_INTERVAL_MIN)} to{" "}
              {formatDurationFull(SCREENSHOT_INTERVAL_MAX)}
              {" · "}Default: {formatDurationFull(SCREENSHOT_INTERVAL_DEFAULT)}
            </p>
            {errors.screenshotInterval && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {errors.screenshotInterval}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-dark-300 mb-1">
              <span className="flex items-center gap-2">
                <Icons.RefreshCw className="w-4 h-4 text-gray-400" />
                Sync Interval
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={SYNC_INTERVAL_MIN_SECONDS}
                max={SYNC_INTERVAL_MAX_SECONDS}
                value={inputValues.syncInterval}
                onChange={(e) =>
                  handleInputChange("syncInterval", e.target.value)
                }
                onBlur={() => commitInterval("syncInterval")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void commitInterval("syncInterval");
                  }
                }}
                className="input-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-dark-500 pointer-events-none">
                sec
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Current:{" "}
              <span className="font-medium text-gray-700 dark:text-dark-300">
                {formatDurationMinimal(
                  config.syncIntervalMs ?? SYNC_INTERVAL_DEFAULT,
                )}
              </span>
              {" · "}Allowed: {formatDurationFull(SYNC_INTERVAL_MIN)} to{" "}
              {formatDurationFull(SYNC_INTERVAL_MAX)}
              {" · "}Default: {formatDurationFull(SYNC_INTERVAL_DEFAULT)}
            </p>
            {errors.syncInterval && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {errors.syncInterval}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          icon={<Icons.Info className="w-5 h-5" />}
          title="How It Works"
          description="Understanding the app behavior"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: <Icons.Camera className="w-4 h-4" />,
              text: "Screenshots are captured automatically while tracking",
            },
            {
              icon: <Icons.Database className="w-4 h-4" />,
              text: "Data is stored locally and synced automatically",
            },
            {
              icon: <Icons.Trash className="w-4 h-4" />,
              text: "Synced screenshots are cleaned up to save space",
            },
            {
              icon: <Icons.Wifi className="w-4 h-4" />,
              text: "Works offline and syncs when connected",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                {item.icon}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default GeneralTab;
