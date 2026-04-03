import { useEffect, useState } from "react";
import { Icons } from "../Icons";
import { UpdateStep } from "./UpdateSection";
import { GeneralTab, StorageTab, SyncTab, UpdatesTab } from "./tabs";

export type SettingsTabId = "general" | "sync" | "storage" | "updates";

interface SettingsProps {
  activeTab?: SettingsTabId;
  onTabChange?: (tab: SettingsTabId) => void;
  updateState: {
    version: string;
    step: UpdateStep;
    availableVersion: string | null;
    progress: number;
    errorMessage: string;
  };
  onCheckUpdates: () => void | Promise<void>;
  onDownloadUpdate: () => void | Promise<void>;
  onInstallUpdate: () => void | Promise<void>;
}

export function Settings({
  activeTab: controlledTab,
  onTabChange,
  updateState,
  onCheckUpdates,
  onDownloadUpdate,
  onInstallUpdate,
}: SettingsProps) {
  const [internalTab, setInternalTab] = useState<SettingsTabId>("general");
  const activeTab = controlledTab ?? internalTab;

  useEffect(() => {
    if (controlledTab) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  const handleTabChange = (tab: SettingsTabId) => {
    if (controlledTab === undefined) {
      setInternalTab(tab);
    }
    onTabChange?.(tab);
  };

  const tabs: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "general",
      label: "General",
      icon: <Icons.Settings className="w-4 h-4" />,
    },
    {
      id: "sync",
      label: "Sync",
      icon: <Icons.RefreshCw className="w-4 h-4" />,
    },
    {
      id: "storage",
      label: "Storage",
      icon: <Icons.Database className="w-4 h-4" />,
    },
    {
      id: "updates",
      label: "Updates",
      icon: <Icons.Download className="w-4 h-4" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "sync" && <SyncTab />}
        {activeTab === "storage" && <StorageTab />}
        {activeTab === "updates" && (
          <UpdatesTab
            version={updateState.version}
            step={updateState.step}
            availableVersion={updateState.availableVersion}
            progress={updateState.progress}
            errorMessage={updateState.errorMessage}
            onCheck={onCheckUpdates}
            onDownload={onDownloadUpdate}
            onInstall={onInstallUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default Settings;
