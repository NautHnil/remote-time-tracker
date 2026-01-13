/**
 * ImageOptimizer Service
 * Optimizes screenshots after capture and before sync to reduce file size
 * while maintaining acceptable quality for review purposes
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

export interface OptimizationOptions {
  /** Output format: 'jpeg' | 'webp' | 'png' */
  format: "jpeg" | "webp" | "png";
  /** Quality for lossy formats (1-100), default 80 */
  quality: number;
  /** Max width to resize, keeps aspect ratio */
  maxWidth?: number;
  /** Max height to resize, keeps aspect ratio */
  maxHeight?: number;
  /** Whether to strip metadata (EXIF, etc.) */
  stripMetadata: boolean;
}

export interface OptimizationResult {
  success: boolean;
  originalPath: string;
  optimizedPath: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  savedBytes: number;
  format: string;
  error?: string;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  format: "jpeg",
  quality: 75, // Good balance between quality and size
  maxWidth: 1920, // Full HD width - sufficient for screenshot review
  maxHeight: 1080,
  stripMetadata: true,
};

export class ImageOptimizer {
  private options: OptimizationOptions;

  constructor(options?: Partial<OptimizationOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Optimize a single image file
   * @param inputPath Path to the original image
   * @param outputPath Optional output path (defaults to replacing original with new extension)
   * @returns OptimizationResult with details about the optimization
   */
  async optimizeImage(
    inputPath: string,
    outputPath?: string
  ): Promise<OptimizationResult> {
    try {
      // Validate input file exists
      if (!fs.existsSync(inputPath)) {
        return {
          success: false,
          originalPath: inputPath,
          optimizedPath: "",
          originalSize: 0,
          optimizedSize: 0,
          compressionRatio: 0,
          savedBytes: 0,
          format: this.options.format,
          error: `Input file not found: ${inputPath}`,
        };
      }

      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      // Determine output path
      const ext =
        this.options.format === "jpeg" ? ".jpg" : `.${this.options.format}`;
      const finalOutputPath =
        outputPath || inputPath.replace(/\.(png|jpg|jpeg|webp)$/i, ext);

      // Read and process image
      let sharpInstance = sharp(inputPath);

      // Get image metadata for smart resizing
      const metadata = await sharpInstance.metadata();

      // Apply resize if needed (maintain aspect ratio)
      if (this.options.maxWidth || this.options.maxHeight) {
        const shouldResize =
          (this.options.maxWidth &&
            metadata.width &&
            metadata.width > this.options.maxWidth) ||
          (this.options.maxHeight &&
            metadata.height &&
            metadata.height > this.options.maxHeight);

        if (shouldResize) {
          sharpInstance = sharpInstance.resize({
            width: this.options.maxWidth,
            height: this.options.maxHeight,
            fit: "inside", // Maintain aspect ratio, fit within bounds
            withoutEnlargement: true, // Don't upscale
          });
        }
      }

      // Apply format-specific optimizations
      switch (this.options.format) {
        case "jpeg":
          sharpInstance = sharpInstance.jpeg({
            quality: this.options.quality,
            mozjpeg: true, // Use mozjpeg for better compression
            chromaSubsampling: "4:2:0", // Standard chroma subsampling
          });
          break;

        case "webp":
          sharpInstance = sharpInstance.webp({
            quality: this.options.quality,
            effort: 4, // Balanced compression effort (0-6)
            smartSubsample: true,
          });
          break;

        case "png":
          sharpInstance = sharpInstance.png({
            compressionLevel: 9, // Max compression
            palette: true, // Use palette for smaller files when possible
            effort: 7, // Higher effort for better compression
          });
          break;
      }

      // Strip metadata if requested
      if (this.options.stripMetadata) {
        sharpInstance = sharpInstance.withMetadata({});
      }

      // Write optimized image
      await sharpInstance.toFile(finalOutputPath);

      // Get optimized file size
      const optimizedStats = fs.statSync(finalOutputPath);
      const optimizedSize = optimizedStats.size;

      // Calculate compression stats
      const savedBytes = originalSize - optimizedSize;
      const compressionRatio =
        originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;

      // If optimized file is larger than original (rare for JPEG), keep original
      if (optimizedSize >= originalSize && finalOutputPath !== inputPath) {
        // Copy original to output path instead
        if (finalOutputPath !== inputPath) {
          fs.copyFileSync(inputPath, finalOutputPath);
        }
        return {
          success: true,
          originalPath: inputPath,
          optimizedPath: finalOutputPath,
          originalSize,
          optimizedSize: originalSize,
          compressionRatio: 0,
          savedBytes: 0,
          format: this.options.format,
        };
      }

      // Delete original if output path is different
      if (finalOutputPath !== inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      return {
        success: true,
        originalPath: inputPath,
        optimizedPath: finalOutputPath,
        originalSize,
        optimizedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        savedBytes,
        format: this.options.format,
      };
    } catch (error: any) {
      console.error(`Error optimizing image ${inputPath}:`, error);
      return {
        success: false,
        originalPath: inputPath,
        optimizedPath: "",
        originalSize: 0,
        optimizedSize: 0,
        compressionRatio: 0,
        savedBytes: 0,
        format: this.options.format,
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Optimize image from buffer (useful for immediate optimization after capture)
   * @param inputBuffer Buffer containing the image data
   * @param outputPath Path to save the optimized image
   * @returns OptimizationResult with details about the optimization
   */
  async optimizeBuffer(
    inputBuffer: Buffer,
    outputPath: string
  ): Promise<OptimizationResult> {
    try {
      const originalSize = inputBuffer.length;

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Update output path extension based on format
      const ext =
        this.options.format === "jpeg" ? ".jpg" : `.${this.options.format}`;
      const finalOutputPath = outputPath.replace(
        /\.(png|jpg|jpeg|webp)$/i,
        ext
      );

      // Read and process image
      let sharpInstance = sharp(inputBuffer);

      // Get image metadata for smart resizing
      const metadata = await sharpInstance.metadata();

      // Apply resize if needed (maintain aspect ratio)
      if (this.options.maxWidth || this.options.maxHeight) {
        const shouldResize =
          (this.options.maxWidth &&
            metadata.width &&
            metadata.width > this.options.maxWidth) ||
          (this.options.maxHeight &&
            metadata.height &&
            metadata.height > this.options.maxHeight);

        if (shouldResize) {
          sharpInstance = sharpInstance.resize({
            width: this.options.maxWidth,
            height: this.options.maxHeight,
            fit: "inside",
            withoutEnlargement: true,
          });
        }
      }

      // Apply format-specific optimizations
      switch (this.options.format) {
        case "jpeg":
          sharpInstance = sharpInstance.jpeg({
            quality: this.options.quality,
            mozjpeg: true,
            chromaSubsampling: "4:2:0",
          });
          break;

        case "webp":
          sharpInstance = sharpInstance.webp({
            quality: this.options.quality,
            effort: 4,
            smartSubsample: true,
          });
          break;

        case "png":
          sharpInstance = sharpInstance.png({
            compressionLevel: 9,
            palette: true,
            effort: 7,
          });
          break;
      }

      // Strip metadata
      if (this.options.stripMetadata) {
        sharpInstance = sharpInstance.withMetadata({});
      }

      // Write optimized image
      await sharpInstance.toFile(finalOutputPath);

      // Get optimized file size
      const optimizedStats = fs.statSync(finalOutputPath);
      const optimizedSize = optimizedStats.size;

      // Calculate compression stats
      const savedBytes = originalSize - optimizedSize;
      const compressionRatio =
        originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;

      return {
        success: true,
        originalPath: "buffer",
        optimizedPath: finalOutputPath,
        originalSize,
        optimizedSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        savedBytes,
        format: this.options.format,
      };
    } catch (error: any) {
      console.error(`Error optimizing buffer:`, error);
      return {
        success: false,
        originalPath: "buffer",
        optimizedPath: outputPath,
        originalSize: inputBuffer.length,
        optimizedSize: 0,
        compressionRatio: 0,
        savedBytes: 0,
        format: this.options.format,
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Optimize multiple images in a directory
   * @param dirPath Directory containing images to optimize
   * @param pattern File pattern to match (default: *.png)
   * @returns Array of OptimizationResults
   */
  async optimizeDirectory(
    dirPath: string,
    pattern: RegExp = /\.(png|jpg|jpeg)$/i
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];

    if (!fs.existsSync(dirPath)) {
      console.error(`Directory not found: ${dirPath}`);
      return results;
    }

    const files = fs.readdirSync(dirPath).filter((f) => pattern.test(f));

    console.log(`🖼️ Optimizing ${files.length} images in ${dirPath}...`);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const result = await this.optimizeImage(filePath);
      results.push(result);

      if (result.success) {
        console.log(
          `  ✓ ${file}: ${this.formatBytes(
            result.originalSize
          )} → ${this.formatBytes(result.optimizedSize)} (${
            result.compressionRatio
          }% saved)`
        );
      } else {
        console.log(`  ✗ ${file}: ${result.error}`);
      }
    }

    // Summary
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalSaved = totalOriginal - totalOptimized;

    console.log(
      `🖼️ Optimization complete: ${this.formatBytes(
        totalOriginal
      )} → ${this.formatBytes(totalOptimized)} (${this.formatBytes(
        totalSaved
      )} saved)`
    );

    return results;
  }

  /**
   * Get the expected output extension based on format
   */
  getOutputExtension(): string {
    return this.options.format === "jpeg" ? ".jpg" : `.${this.options.format}`;
  }

  /**
   * Get the MIME type based on format
   */
  getMimeType(): string {
    switch (this.options.format) {
      case "jpeg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "png":
        return "image/png";
      default:
        return "image/jpeg";
    }
  }

  /**
   * Update optimization options
   */
  setOptions(options: Partial<OptimizationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current optimization options
   */
  getOptions(): OptimizationOptions {
    return { ...this.options };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}

// Export singleton instance with default options
export const imageOptimizer = new ImageOptimizer();

// Export factory function for custom options
export function createImageOptimizer(
  options?: Partial<OptimizationOptions>
): ImageOptimizer {
  return new ImageOptimizer(options);
}
