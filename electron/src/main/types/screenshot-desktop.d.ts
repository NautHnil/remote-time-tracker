/**
 * Type declarations for screenshot-desktop package
 * https://www.npmjs.com/package/screenshot-desktop
 */

declare module "screenshot-desktop" {
  interface ScreenshotOptions {
    /** The screen to capture. On macOS it's a number (0, 1, 2...), on Windows/Linux it's a string ID */
    screen?: string | number;
    /** Output format: 'jpg' or 'png' */
    format?: "jpg" | "jpeg" | "png";
    /** Absolute or relative path to save output */
    filename?: string;
    /** Linux only: which library to use */
    linuxLibrary?: "scrot" | "imagemagick";
  }

  interface Display {
    /** Display identifier - string on Windows/Linux, number on macOS */
    id: string | number;
    /** Display name */
    name: string;
    /** Whether this is the primary display */
    primary?: boolean;
    /** Display width (Linux/Windows) */
    width?: number;
    /** Display height (Linux/Windows) */
    height?: number;
    /** X offset (Linux) */
    offsetX?: number;
    /** Y offset (Linux) */
    offsetY?: number;
    /** Top position (Windows) */
    top?: number;
    /** Right position (Windows) */
    right?: number;
    /** Bottom position (Windows) */
    bottom?: number;
    /** Left position (Windows) */
    left?: number;
    /** DPI scale (Windows) */
    dpiScale?: number;
    /** Crop region (Linux) */
    crop?: string;
  }

  /**
   * Capture a screenshot
   * @param options Screenshot options
   * @returns Buffer containing the screenshot image, or path if filename was specified
   */
  function screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  function screenshot(
    options: ScreenshotOptions & { filename: string },
  ): Promise<string>;

  namespace screenshot {
    /**
     * List all available displays
     * @returns Array of display information
     */
    function listDisplays(): Promise<Display[]>;

    /**
     * Capture all displays at once
     * @returns Array of buffers, one for each display
     */
    function all(): Promise<Buffer[]>;
  }

  export = screenshot;
}
