import { useEffect, useState } from "react";
import {
  formatDurationFull,
  formatDurationMinimal,
} from "../../../utils/timeFormat";
import { Icons } from "../../Icons";
import { ThemeSection } from "../ThemeSection";
import { Card, SectionHeader } from "../ui";

export function GeneralTab() {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    loadConfig();
  }, []);

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
                value={config.screenshotInterval || 300000}
                onChange={(e) =>
                  updateConfig("screenshotInterval", parseInt(e.target.value))
                }
                className="input-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-dark-500 pointer-events-none">
                ms
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Current:{" "}
              <span className="font-medium text-gray-700 dark:text-dark-300">
                {formatDurationMinimal(config.screenshotInterval || 300000)}
              </span>
              {" · "}Default: {formatDurationFull(300000)}
            </p>
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
                value={config.syncInterval || 60000}
                onChange={(e) =>
                  updateConfig("syncInterval", parseInt(e.target.value))
                }
                className="input-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-dark-500 pointer-events-none">
                ms
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              Current:{" "}
              <span className="font-medium text-gray-700 dark:text-dark-300">
                {formatDurationMinimal(config.syncInterval || 60000)}
              </span>
              {" · "}Default: {formatDurationFull(60000)}
            </p>
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
