// ============================================================
// Build-time configuration
// This file is updated during CI/CD build process
// DO NOT commit sensitive values to git
// ============================================================

/**
 * GitHub token for accessing private repo releases
 * This is injected during build by CI/CD workflow
 * For local development, use .env file instead
 */
export const BUILD_GH_TOKEN = process.env.GH_TOKEN || "";

/**
 * Build timestamp for debugging
 */
export const BUILD_TIMESTAMP = new Date().toISOString();

/**
 * Build environment
 */
export const BUILD_ENV = process.env.NODE_ENV || "development";
