import { useState } from "react";
import { Icons } from "../Icons";
import { GeneralTab, StorageTab, SyncTab, UpdatesTab } from "./tabs";

type TabId = "general" | "sync" | "storage" | "updates";

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
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
              onClick={() => setActiveTab(tab.id)}
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
        {activeTab === "updates" && <UpdatesTab />}
      </div>
    </div>
  );
}

export default Settings;
