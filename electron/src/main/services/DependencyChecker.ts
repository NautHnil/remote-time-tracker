/**
 * DependencyChecker Service
 * Checks and manages system dependencies required for screenshot capture
 * across different platforms (Windows, macOS, Linux)
 */

import { exec, execSync, spawn } from "child_process";
import { dialog, shell } from "electron";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  required: boolean;
  installCommand?: string;
  description: string;
}

export interface DependencyCheckResult {
  platform: NodeJS.Platform;
  allDependenciesMet: boolean;
  dependencies: DependencyStatus[];
  missingRequired: DependencyStatus[];
}

/**
 * Linux package manager detection and commands
 */
const LINUX_PACKAGE_MANAGERS = {
  apt: {
    check: "which apt-get",
    install: "apt-get install -y",
    sudo: true,
  },
  dnf: {
    check: "which dnf",
    install: "dnf install -y",
    sudo: true,
  },
  yum: {
    check: "which yum",
    install: "yum install -y",
    sudo: true,
  },
  pacman: {
    check: "which pacman",
    install: "pacman -S --noconfirm",
    sudo: true,
  },
  zypper: {
    check: "which zypper",
    install: "zypper install -y",
    sudo: true,
  },
};

/**
 * Package names for different Linux distributions
 */
const LINUX_PACKAGES: Record<string, Record<string, string>> = {
  imagemagick: {
    apt: "imagemagick",
    dnf: "ImageMagick",
    yum: "ImageMagick",
    pacman: "imagemagick",
    zypper: "ImageMagick",
  },
  scrot: {
    apt: "scrot",
    dnf: "scrot",
    yum: "scrot",
    pacman: "scrot",
    zypper: "scrot",
  },
  "x11-xserver-utils": {
    apt: "x11-xserver-utils",
    dnf: "xorg-x11-server-utils",
    yum: "xorg-x11-server-utils",
    pacman: "xorg-xrandr",
    zypper: "xrandr",
  },
};

export class DependencyChecker {
  private static instance: DependencyChecker;
  private detectedPackageManager: string | null = null;
  private lastCheckResult: DependencyCheckResult | null = null;

  private constructor() {}

  static getInstance(): DependencyChecker {
    if (!DependencyChecker.instance) {
      DependencyChecker.instance = new DependencyChecker();
    }
    return DependencyChecker.instance;
  }

  /**
   * Check all required dependencies for the current platform
   */
  async checkDependencies(): Promise<DependencyCheckResult> {
    const platform = process.platform;
    const dependencies: DependencyStatus[] = [];

    console.log(`🔍 Checking dependencies for platform: ${platform}`);

    switch (platform) {
      case "linux":
        dependencies.push(...(await this.checkLinuxDependencies()));
        break;
      case "win32":
        dependencies.push(...(await this.checkWindowsDependencies()));
        break;
      case "darwin":
        dependencies.push(...(await this.checkMacOSDependencies()));
        break;
      default:
        console.warn(`⚠️ Unknown platform: ${platform}`);
    }

    const missingRequired = dependencies.filter(
      (d) => d.required && !d.installed,
    );
    const allDependenciesMet = missingRequired.length === 0;

    const result: DependencyCheckResult = {
      platform,
      allDependenciesMet,
      dependencies,
      missingRequired,
    };

    this.lastCheckResult = result;

    if (!allDependenciesMet) {
      console.warn(
        `⚠️ Missing required dependencies:`,
        missingRequired.map((d) => d.name),
      );
    } else {
      console.log(`✅ All required dependencies are installed`);
    }

    return result;
  }

  /**
   * Get the last check result without re-checking
   */
  getLastCheckResult(): DependencyCheckResult | null {
    return this.lastCheckResult;
  }

  /**
   * Check Linux-specific dependencies
   */
  private async checkLinuxDependencies(): Promise<DependencyStatus[]> {
    const dependencies: DependencyStatus[] = [];

    // Detect package manager first
    await this.detectLinuxPackageManager();

    // Check ImageMagick (import command)
    const imageMagick = await this.checkCommand("import", "-version");
    dependencies.push({
      name: "ImageMagick",
      installed: imageMagick.installed,
      version: imageMagick.version,
      required: true,
      installCommand: this.getLinuxInstallCommand("imagemagick"),
      description:
        "Required for capturing screenshots on Linux. Provides the 'import' command.",
    });

    // Check scrot (alternative screenshot tool)
    const scrot = await this.checkCommand("scrot", "--version");
    dependencies.push({
      name: "scrot",
      installed: scrot.installed,
      version: scrot.version,
      required: false, // Optional alternative
      installCommand: this.getLinuxInstallCommand("scrot"),
      description:
        "Alternative screenshot tool for Linux. Optional but can be used if ImageMagick fails.",
    });

    // Check xrandr (for display detection)
    const xrandr = await this.checkCommand("xrandr", "--version");
    dependencies.push({
      name: "xrandr",
      installed: xrandr.installed,
      version: xrandr.version,
      required: true,
      installCommand: this.getLinuxInstallCommand("x11-xserver-utils"),
      description: "Required for detecting multiple displays on Linux.",
    });

    return dependencies;
  }

  /**
   * Check Windows-specific dependencies
   */
  private async checkWindowsDependencies(): Promise<DependencyStatus[]> {
    // Windows doesn't require external dependencies for screenshot-desktop
    // The package uses a built-in batch script with .NET
    return [
      {
        name: ".NET Framework",
        installed: true, // Assumed to be present on modern Windows
        required: true,
        description:
          "Built into Windows. Used by screenshot-desktop for capturing.",
      },
    ];
  }

  /**
   * Check macOS-specific dependencies
   */
  private async checkMacOSDependencies(): Promise<DependencyStatus[]> {
    // macOS uses built-in screencapture command
    const screencapture = await this.checkCommand("screencapture", "-h");
    return [
      {
        name: "screencapture",
        installed: screencapture.installed,
        required: true,
        description:
          "Built-in macOS command for capturing screenshots. Should always be available.",
      },
    ];
  }

  /**
   * Detect which package manager is available on Linux
   */
  private async detectLinuxPackageManager(): Promise<string | null> {
    if (this.detectedPackageManager) {
      return this.detectedPackageManager;
    }

    for (const [name, config] of Object.entries(LINUX_PACKAGE_MANAGERS)) {
      try {
        execSync(config.check, { stdio: "ignore" });
        this.detectedPackageManager = name;
        console.log(`📦 Detected package manager: ${name}`);
        return name;
      } catch {
        // Package manager not found, continue checking
      }
    }

    console.warn("⚠️ No supported package manager detected");
    return null;
  }

  /**
   * Get the install command for a package on Linux
   */
  private getLinuxInstallCommand(packageName: string): string | undefined {
    if (!this.detectedPackageManager) {
      return undefined;
    }

    const pm =
      LINUX_PACKAGE_MANAGERS[
        this.detectedPackageManager as keyof typeof LINUX_PACKAGE_MANAGERS
      ];
    const pkg =
      LINUX_PACKAGES[packageName]?.[this.detectedPackageManager] || packageName;

    if (pm.sudo) {
      return `sudo ${pm.install} ${pkg}`;
    }
    return `${pm.install} ${pkg}`;
  }

  /**
   * Check if a command is available and get its version
   */
  private async checkCommand(
    command: string,
    versionFlag: string,
  ): Promise<{ installed: boolean; version?: string }> {
    try {
      // First check if command exists
      const whichResult = await execAsync(
        process.platform === "win32" ? `where ${command}` : `which ${command}`,
      );

      if (!whichResult.stdout.trim()) {
        return { installed: false };
      }

      // Try to get version
      try {
        const versionResult = await execAsync(`${command} ${versionFlag}`);
        const output = versionResult.stdout || versionResult.stderr;
        // Extract version number from output
        const versionMatch = output.match(/(\d+\.\d+(\.\d+)?)/);
        return {
          installed: true,
          version: versionMatch ? versionMatch[1] : undefined,
        };
      } catch {
        // Command exists but version flag failed, still installed
        return { installed: true };
      }
    } catch {
      return { installed: false };
    }
  }

  /**
   * Show dialog to user about missing dependencies
   */
  async showMissingDependenciesDialog(): Promise<
    "install" | "ignore" | "help"
  > {
    const result = this.lastCheckResult;
    if (!result || result.allDependenciesMet) {
      return "ignore";
    }

    const missing = result.missingRequired;
    const platform = result.platform;

    let message = `Screenshot capture requires the following dependencies that are not installed:\n\n`;
    missing.forEach((dep) => {
      message += `• ${dep.name}: ${dep.description}\n`;
    });

    if (platform === "linux" && missing.length > 0) {
      const installCommands = missing
        .filter((d) => d.installCommand)
        .map((d) => d.installCommand)
        .join("\n");

      if (installCommands) {
        message += `\nTo install, run:\n${installCommands}`;
      }
    }

    const buttons =
      platform === "linux"
        ? ["Install Now", "Ignore", "Show Help"]
        : ["OK", "Show Help"];

    const response = await dialog.showMessageBox({
      type: "warning",
      title: "Missing Dependencies",
      message: "Screenshot capture may not work correctly",
      detail: message,
      buttons,
      defaultId: 0,
      cancelId: platform === "linux" ? 1 : 0,
    });

    if (platform === "linux") {
      switch (response.response) {
        case 0:
          return "install";
        case 1:
          return "ignore";
        case 2:
          return "help";
      }
    } else {
      return response.response === 1 ? "help" : "ignore";
    }

    return "ignore";
  }

  /**
   * Attempt to install missing dependencies on Linux
   * Returns true if installation was successful
   */
  async installMissingDependencies(): Promise<{
    success: boolean;
    message: string;
  }> {
    if (process.platform !== "linux") {
      return {
        success: false,
        message: "Automatic installation is only supported on Linux",
      };
    }

    const result = this.lastCheckResult;
    if (!result || result.allDependenciesMet) {
      return {
        success: true,
        message: "All dependencies are already installed",
      };
    }

    const missing = result.missingRequired.filter((d) => d.installCommand);
    if (missing.length === 0) {
      return {
        success: false,
        message: "No install commands available for missing dependencies",
      };
    }

    // Show confirmation dialog
    const confirmResult = await dialog.showMessageBox({
      type: "question",
      title: "Install Dependencies",
      message: "Administrator privileges required",
      detail: `The following commands will be run with sudo:\n\n${missing
        .map((d) => d.installCommand)
        .join("\n")}\n\nYou may be prompted for your password.`,
      buttons: ["Continue", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });

    if (confirmResult.response === 1) {
      return { success: false, message: "Installation cancelled by user" };
    }

    // Try to install each missing dependency
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const dep of missing) {
      if (!dep.installCommand) continue;

      try {
        console.log(`📦 Installing ${dep.name}...`);

        // Use pkexec for graphical sudo prompt
        const installCmd = dep.installCommand.replace("sudo ", "");
        await this.runWithPrivileges(installCmd);

        results.push({ name: dep.name, success: true });
        console.log(`✅ Successfully installed ${dep.name}`);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.push({ name: dep.name, success: false, error: errorMsg });
        console.error(`❌ Failed to install ${dep.name}:`, errorMsg);
      }
    }

    const allSuccess = results.every((r) => r.success);
    const message = results
      .map((r) =>
        r.success
          ? `✅ ${r.name} installed`
          : `❌ ${r.name} failed: ${r.error}`,
      )
      .join("\n");

    // Re-check dependencies after installation
    if (allSuccess) {
      await this.checkDependencies();
    }

    return { success: allSuccess, message };
  }

  /**
   * Run a command with elevated privileges
   * Uses pkexec on Linux for graphical sudo prompt
   */
  private runWithPrivileges(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try pkexec first (works with most desktop environments)
      const child = spawn("pkexec", ["sh", "-c", command], {
        stdio: "inherit",
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        // If pkexec fails, try with terminal
        console.warn(
          "pkexec failed, trying alternative method:",
          error.message,
        );
        this.runInTerminal(command).then(resolve).catch(reject);
      });
    });
  }

  /**
   * Run command in a terminal window (fallback for pkexec)
   */
  private runInTerminal(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try common terminal emulators
      const terminals = [
        { cmd: "gnome-terminal", args: ["--", "sudo", "sh", "-c", command] },
        { cmd: "konsole", args: ["-e", "sudo", "sh", "-c", command] },
        { cmd: "xfce4-terminal", args: ["-e", `sudo sh -c "${command}"`] },
        { cmd: "xterm", args: ["-e", `sudo sh -c "${command}"`] },
      ];

      const tryTerminal = (index: number) => {
        if (index >= terminals.length) {
          reject(new Error("No suitable terminal emulator found"));
          return;
        }

        const terminal = terminals[index];
        const child = spawn(terminal.cmd, terminal.args, { stdio: "ignore" });

        child.on("error", () => {
          tryTerminal(index + 1);
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Installation failed with code ${code}`));
          }
        });
      };

      tryTerminal(0);
    });
  }

  /**
   * Open help documentation for installing dependencies
   */
  openHelpDocumentation(): void {
    const platform = process.platform;
    let url = "https://github.com/NautHnil/remote-time-tracker#readme";

    if (platform === "linux") {
      // Could link to specific Linux documentation
      url =
        "https://github.com/bencevans/screenshot-desktop#linux-requirements";
    }

    shell.openExternal(url);
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(): string {
    if (!this.lastCheckResult) {
      return "Dependencies have not been checked yet";
    }

    if (this.lastCheckResult.allDependenciesMet) {
      return "All screenshot dependencies are installed";
    }

    const missing = this.lastCheckResult.missingRequired.map((d) => d.name);
    return `Missing dependencies: ${missing.join(", ")}`;
  }
}

// Export singleton instance
export const dependencyChecker = DependencyChecker.getInstance();
