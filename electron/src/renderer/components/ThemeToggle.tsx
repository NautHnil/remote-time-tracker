/**
 * Theme Toggle Component
 * A button to switch between light and dark themes
 */

import { useTheme } from "../contexts/ThemeContext";
import { Icons } from "./Icons";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 p-2 rounded-lg transition-all duration-200
        bg-gray-100 dark:bg-dark-800 
        hover:bg-gray-200 dark:hover:bg-dark-700
        text-gray-600 dark:text-gray-300
        border border-gray-200 dark:border-dark-700
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        focus:ring-offset-white dark:focus:ring-offset-dark-900
        ${className}
      `}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Icons.Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Icons.Moon className="w-5 h-5 text-indigo-500" />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}

/**
 * Theme Selector Component
 * Allows selecting between light, dark, and system themes
 */
interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className = "" }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  const handleSystemTheme = () => {
    // Remove saved preference to use system theme
    localStorage.removeItem("app-theme");
    // Detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Light Theme */}
      <button
        onClick={() => setTheme("light")}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${
            theme === "light" && localStorage.getItem("app-theme") === "light"
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700"
              : "bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-700 hover:bg-gray-200 dark:hover:bg-dark-700"
          }
          border focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
        title="Light mode"
      >
        <Icons.Sun className="w-4 h-4" />
        <span className="text-sm">Light</span>
      </button>

      {/* Dark Theme */}
      <button
        onClick={() => setTheme("dark")}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${
            theme === "dark" && localStorage.getItem("app-theme") === "dark"
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700"
              : "bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-700 hover:bg-gray-200 dark:hover:bg-dark-700"
          }
          border focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
        title="Dark mode"
      >
        <Icons.Moon className="w-4 h-4" />
        <span className="text-sm">Dark</span>
      </button>

      {/* System Theme */}
      <button
        onClick={handleSystemTheme}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${
            !localStorage.getItem("app-theme")
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700"
              : "bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-700 hover:bg-gray-200 dark:hover:bg-dark-700"
          }
          border focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
        title="Use system theme"
      >
        <Icons.Monitor className="w-4 h-4" />
        <span className="text-sm">System</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
