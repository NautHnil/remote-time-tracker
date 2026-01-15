import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Icons } from "../Icons";

export function ThemeSection() {
  const { theme, setTheme, isDark } = useTheme();
  const [isSystemTheme, setIsSystemTheme] = useState(() => {
    return !localStorage.getItem("app-theme");
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    if (newTheme === "system") {
      localStorage.removeItem("app-theme");
      setIsSystemTheme(true);
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(prefersDark ? "dark" : "light");
    } else {
      setIsSystemTheme(false);
      setTheme(newTheme);
    }
  };

  const getCurrentSelection = () => {
    if (isSystemTheme) return "system";
    return theme;
  };

  const themes = [
    {
      id: "light" as const,
      label: "Light",
      icon: <Icons.Sun className="w-5 h-5" />,
      iconColor: "text-amber-500",
      preview: (
        <div className="w-full h-20 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="h-4 bg-gray-50 border-b border-gray-200 flex items-center px-2 gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          </div>
          <div className="p-2 space-y-1.5">
            <div className="h-2 w-16 bg-gray-200 rounded" />
            <div className="h-2 w-12 bg-gray-100 rounded" />
            <div className="h-2 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      ),
    },
    {
      id: "dark" as const,
      label: "Dark",
      icon: <Icons.Moon className="w-5 h-5" />,
      iconColor: "text-indigo-400",
      preview: (
        <div className="w-full h-20 bg-gray-900 border border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="h-4 bg-gray-800 border-b border-gray-700 flex items-center px-2 gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          </div>
          <div className="p-2 space-y-1.5">
            <div className="h-2 w-16 bg-gray-700 rounded" />
            <div className="h-2 w-12 bg-gray-800 rounded" />
            <div className="h-2 w-20 bg-gray-800 rounded" />
          </div>
        </div>
      ),
    },
    {
      id: "system" as const,
      label: "System",
      icon: <Icons.Monitor className="w-5 h-5" />,
      iconColor: "text-gray-500 dark:text-gray-400",
      preview: (
        <div className="w-full h-20 rounded-lg shadow-sm overflow-hidden flex">
          <div className="w-1/2 bg-white border-l border-t border-b border-gray-200">
            <div className="h-4 bg-gray-50 border-b border-gray-200 flex items-center px-1.5 gap-0.5">
              <div className="w-1 h-1 rounded-full bg-red-400" />
              <div className="w-1 h-1 rounded-full bg-yellow-400" />
              <div className="w-1 h-1 rounded-full bg-green-400" />
            </div>
            <div className="p-1.5 space-y-1">
              <div className="h-1.5 w-8 bg-gray-200 rounded" />
              <div className="h-1.5 w-6 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="w-1/2 bg-gray-900 border-r border-t border-b border-gray-700">
            <div className="h-4 bg-gray-800 border-b border-gray-700 flex items-center px-1.5 gap-0.5">
              <div className="w-1 h-1 rounded-full bg-red-400" />
              <div className="w-1 h-1 rounded-full bg-yellow-400" />
              <div className="w-1 h-1 rounded-full bg-green-400" />
            </div>
            <div className="p-1.5 space-y-1">
              <div className="h-1.5 w-8 bg-gray-700 rounded" />
              <div className="h-1.5 w-6 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {themes.map((themeOption) => {
          const isSelected = getCurrentSelection() === themeOption.id;
          return (
            <button
              key={themeOption.id}
              onClick={() => handleThemeChange(themeOption.id)}
              className={`relative p-3 rounded-xl border-2 transition-all duration-200 group ${
                isSelected
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 ring-2 ring-primary-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="mb-3">{themeOption.preview}</div>
              <div className="flex items-center justify-center gap-2">
                <span className={themeOption.iconColor}>
                  {themeOption.icon}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isSelected
                      ? "text-primary-700 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {themeOption.label}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Icons.Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 bg-gray-100/80 dark:bg-gray-900/50 rounded-xl">
        <div
          className={`w-2 h-2 rounded-full ${
            isDark ? "bg-indigo-500" : "bg-amber-500"
          }`}
        />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {isSystemTheme ? (
            <>
              Following system preference:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {isDark ? "Dark" : "Light"} mode
              </span>
            </>
          ) : (
            <>
              Manual selection:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {theme === "dark" ? "Dark" : "Light"} mode
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
