/**
 * TrayIconHelper - Cross-platform tray icon management
 *
 * Handles tray icon creation for Windows, macOS, and Linux with proper
 * icon formats, sizes, and fallbacks.
 *
 * Platform-specific requirements:
 * - Windows: ICO format preferred, PNG supported. Size: 16x16 or 32x32
 * - macOS: PNG with @2x variant for Retina. Template images for dark/light mode
 * - Linux: PNG format. Size: 22x22 or 24x24 recommended
 */

import { app, nativeImage, NativeImage } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface TrayIconResult {
  icon: NativeImage;
  source: "file" | "embedded" | "fallback";
  path?: string;
  error?: string;
}

export class TrayIconHelper {
  private static resourcesPath: string;

  /**
   * Get the correct resources path based on whether app is packaged or in development
   */
  static getResourcesPath(): string {
    if (this.resourcesPath) {
      return this.resourcesPath;
    }

    // In production (packaged app), resources are in app.getPath('exe')/../Resources
    // In development, resources are relative to the electron folder
    if (app.isPackaged) {
      // Production: Use process.resourcesPath which points to the Resources folder
      this.resourcesPath = process.resourcesPath;
    } else {
      // Development: __dirname is electron/dist/main (compiled output)
      // Go up 3 levels to get to electron folder: main -> dist -> electron
      this.resourcesPath = path.join(__dirname, "../../..");
    }

    console.log("📁 Resources path:", this.resourcesPath);
    console.log("📁 App is packaged:", app.isPackaged);
    console.log("📁 __dirname:", __dirname);

    return this.resourcesPath;
  }

  /**
   * Get the assets folder path
   */
  static getAssetsPath(): string {
    const resourcesPath = this.getResourcesPath();

    // In packaged app, assets are in Resources/assets
    // In development, assets are in electron/assets
    const assetsPath = app.isPackaged
      ? path.join(resourcesPath, "assets")
      : path.join(resourcesPath, "assets");

    console.log("📁 Assets path:", assetsPath);
    return assetsPath;
  }

  /**
   * Create a platform-appropriate tray icon
   */
  static createTrayIcon(): TrayIconResult {
    const platform = process.platform;
    console.log(`🎯 Creating tray icon for platform: ${platform}`);

    try {
      switch (platform) {
        case "darwin":
          return this.createMacOSTrayIcon();
        case "win32":
          return this.createWindowsTrayIcon();
        case "linux":
          return this.createLinuxTrayIcon();
        default:
          console.warn(`⚠️ Unknown platform: ${platform}, using fallback`);
          return this.createFallbackIcon();
      }
    } catch (error) {
      console.error("❌ Failed to create tray icon:", error);
      return this.createFallbackIcon();
    }
  }

  /**
   * macOS tray icon creation
   * - Uses template images for proper dark/light mode support
   * - Supports @2x retina variant
   * - Size: 16x16 (or 22x22 for template)
   */
  private static createMacOSTrayIcon(): TrayIconResult {
    const assetsPath = this.getAssetsPath();

    // Try different icon files in order of preference
    const iconCandidates = [
      { name: "tray-iconTemplate.png", isTemplate: true }, // Best for macOS
      { name: "tray-iconTemplate@2x.png", isTemplate: true },
      { name: "tray-icon.png", isTemplate: false },
      { name: "tray-icon@2x.png", isTemplate: false },
      { name: "icon-16.png", isTemplate: false },
      { name: "icon-32.png", isTemplate: false },
    ];

    for (const candidate of iconCandidates) {
      const iconPath = path.join(assetsPath, candidate.name);
      console.log(`📁 Trying icon: ${iconPath}`);

      if (fs.existsSync(iconPath)) {
        try {
          let icon = nativeImage.createFromPath(iconPath);

          if (!icon.isEmpty()) {
            // Resize for tray (16x16 for macOS)
            icon = icon.resize({ width: 16, height: 16 });

            // Set as template image for proper dark/light mode support
            if (candidate.isTemplate || candidate.name.includes("tray")) {
              icon.setTemplateImage(true);
            }

            console.log(
              `✅ macOS: Loaded tray icon from ${candidate.name}, template: ${icon.isTemplateImage}`,
            );
            return { icon, source: "file", path: iconPath };
          }
        } catch (err) {
          console.warn(`⚠️ Failed to load ${candidate.name}:`, err);
        }
      }
    }

    // Fallback to embedded icon
    console.log("⚠️ macOS: Using embedded fallback icon");
    return this.createEmbeddedMacOSIcon();
  }

  /**
   * Windows tray icon creation
   * - Prefers ICO format but supports PNG
   * - Size: 16x16 or 32x32
   */
  private static createWindowsTrayIcon(): TrayIconResult {
    const assetsPath = this.getAssetsPath();

    // Try different icon files in order of preference
    const iconCandidates = [
      "tray-icon.ico", // Best for Windows
      "icon.ico",
      "tray-icon.png",
      "icon-32.png",
      "icon-16.png",
      "icon.png",
    ];

    for (const iconName of iconCandidates) {
      const iconPath = path.join(assetsPath, iconName);
      console.log(`📁 Trying icon: ${iconPath}`);

      if (fs.existsSync(iconPath)) {
        try {
          let icon = nativeImage.createFromPath(iconPath);

          if (!icon.isEmpty()) {
            // Windows tray icons work best at 16x16 or 32x32
            const size = icon.getSize();
            if (size.width > 32 || size.height > 32) {
              icon = icon.resize({ width: 32, height: 32 });
            }

            console.log(
              `✅ Windows: Loaded tray icon from ${iconName}, size: ${icon.getSize().width}x${icon.getSize().height}`,
            );
            return { icon, source: "file", path: iconPath };
          }
        } catch (err) {
          console.warn(`⚠️ Failed to load ${iconName}:`, err);
        }
      }
    }

    // Fallback to embedded icon
    console.log("⚠️ Windows: Using embedded fallback icon");
    return this.createEmbeddedIcon();
  }

  /**
   * Linux tray icon creation
   * - Uses PNG format
   * - Size: 22x22 or 24x24 recommended
   */
  private static createLinuxTrayIcon(): TrayIconResult {
    const assetsPath = this.getAssetsPath();

    // Try different icon files in order of preference
    const iconCandidates = [
      "tray-icon.png",
      "icon-32.png",
      "icon-64.png",
      "icon.png",
    ];

    for (const iconName of iconCandidates) {
      const iconPath = path.join(assetsPath, iconName);
      console.log(`📁 Trying icon: ${iconPath}`);

      if (fs.existsSync(iconPath)) {
        try {
          let icon = nativeImage.createFromPath(iconPath);

          if (!icon.isEmpty()) {
            // Linux tray icons work best at 22x22 or 24x24
            const size = icon.getSize();
            if (size.width !== 22 && size.width !== 24) {
              icon = icon.resize({ width: 22, height: 22 });
            }

            console.log(
              `✅ Linux: Loaded tray icon from ${iconName}, size: ${icon.getSize().width}x${icon.getSize().height}`,
            );
            return { icon, source: "file", path: iconPath };
          }
        } catch (err) {
          console.warn(`⚠️ Failed to load ${iconName}:`, err);
        }
      }
    }

    // Fallback to embedded icon
    console.log("⚠️ Linux: Using embedded fallback icon");
    return this.createEmbeddedIcon();
  }

  /**
   * Create embedded macOS template icon (monochrome for dark/light mode)
   */
  private static createEmbeddedMacOSIcon(): TrayIconResult {
    // Create a simple monochrome template icon for macOS
    // Template icons should be black with alpha channel
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="black" fill-opacity="0.8"/>
        <text x="8" y="11" font-size="8" font-family="Arial, sans-serif" text-anchor="middle" fill="white" font-weight="bold">T</text>
      </svg>
    `.trim();

    const icon = nativeImage.createFromDataURL(
      "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"),
    );

    const resizedIcon = icon.resize({ width: 16, height: 16 });
    resizedIcon.setTemplateImage(true);

    return { icon: resizedIcon, source: "embedded" };
  }

  /**
   * Create embedded fallback icon (for Windows/Linux)
   */
  private static createEmbeddedIcon(): TrayIconResult {
    // Blue circle with white "T" letter
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#3B82F6"/>
        <text x="16" y="22" font-size="18" font-family="Arial, sans-serif" text-anchor="middle" fill="white" font-weight="bold">T</text>
      </svg>
    `.trim();

    const icon = nativeImage.createFromDataURL(
      "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"),
    );

    const resizedIcon = icon.resize({ width: 32, height: 32 });

    return { icon: resizedIcon, source: "embedded" };
  }

  /**
   * Create a simple fallback icon when all else fails
   */
  private static createFallbackIcon(): TrayIconResult {
    const platform = process.platform;

    if (platform === "darwin") {
      return this.createEmbeddedMacOSIcon();
    }

    return this.createEmbeddedIcon();
  }

  /**
   * Create tracking state icons (optional, for showing active/paused/stopped states)
   */
  static createStateIcon(
    state: "idle" | "tracking" | "paused",
  ): TrayIconResult {
    const colors: Record<string, string> = {
      idle: "#6B7280", // Gray
      tracking: "#10B981", // Green
      paused: "#F59E0B", // Yellow/Orange
    };

    const color = colors[state] || colors.idle;
    const platform = process.platform;

    if (platform === "darwin") {
      // For macOS, use template image (monochrome)
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="black" fill-opacity="0.8"/>
          <circle cx="8" cy="8" r="3" fill="${state === "tracking" ? "black" : "transparent"}" fill-opacity="0.5"/>
        </svg>
      `.trim();

      const icon = nativeImage.createFromDataURL(
        "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"),
      );
      const resizedIcon = icon.resize({ width: 16, height: 16 });
      resizedIcon.setTemplateImage(true);
      return { icon: resizedIcon, source: "embedded" };
    }

    // Windows/Linux - colored icons
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="${color}"/>
        <text x="16" y="22" font-size="18" font-family="Arial, sans-serif" text-anchor="middle" fill="white" font-weight="bold">T</text>
      </svg>
    `.trim();

    const icon = nativeImage.createFromDataURL(
      "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64"),
    );
    const resizedIcon = icon.resize({ width: 32, height: 32 });

    return { icon: resizedIcon, source: "embedded" };
  }

  /**
   * Debug: List all files in assets folder
   */
  static debugListAssets(): void {
    const assetsPath = this.getAssetsPath();
    console.log("\n📂 Debug: Assets folder contents:");
    console.log("   Path:", assetsPath);

    try {
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        files.forEach((file) => {
          const fullPath = path.join(assetsPath, file);
          const stats = fs.statSync(fullPath);
          console.log(
            `   - ${file} (${stats.isDirectory() ? "DIR" : stats.size + " bytes"})`,
          );
        });
      } else {
        console.log("   ⚠️ Assets folder does not exist!");
      }
    } catch (err) {
      console.error("   ❌ Error reading assets folder:", err);
    }
    console.log("");
  }
}
