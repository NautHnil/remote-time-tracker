package controller

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// UpdateController handles auto-update API endpoints
type UpdateController struct {
	updateService *service.UpdateService
}

// NewUpdateController creates a new update controller
func NewUpdateController(updateService *service.UpdateService) *UpdateController {
	return &UpdateController{
		updateService: updateService,
	}
}

// CheckForUpdates checks if a new version is available
// POST /api/v1/updates/check
// Request body: { "current_version": "1.0.0", "platform": "darwin", "arch": "arm64" }
func (c *UpdateController) CheckForUpdates(ctx *gin.Context) {
	var req dto.UpdateCheckRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	log.Printf("📱 Update check from client: version=%s, platform=%s, arch=%s",
		req.CurrentVersion, req.Platform, req.Arch)

	result, err := c.updateService.CheckForUpdates(req)
	if err != nil {
		log.Printf("❌ Update check failed: %v", err)
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to check for updates: "+err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Update check completed", result)
}

// GetLatestVersion returns the latest version info
// GET /api/v1/updates/latest?platform=darwin&arch=arm64
func (c *UpdateController) GetLatestVersion(ctx *gin.Context) {
	platform := ctx.DefaultQuery("platform", "darwin")
	arch := ctx.DefaultQuery("arch", "x64")

	req := dto.UpdateCheckRequest{
		CurrentVersion: "0.0.0", // Always return latest
		Platform:       platform,
		Arch:           arch,
	}

	result, err := c.updateService.CheckForUpdates(req)
	if err != nil {
		log.Printf("❌ Failed to get latest version: %v", err)
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to get latest version: "+err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Latest version retrieved", result)
}

// DownloadAsset proxies the download of a release asset from GitHub
// GET /api/v1/updates/download/:version/:filename
// Also used for public downloads: GET /api/v1/public/downloads/file/:version/:filename
func (c *UpdateController) DownloadAsset(ctx *gin.Context) {
	version := ctx.Param("version")
	filename := ctx.Param("filename")

	if version == "" || filename == "" {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Version and filename are required")
		return
	}

	log.Printf("📥 Download request: version=%s, file=%s", version, filename)

	// Get asset info for content length
	assetInfo, err := c.updateService.GetAssetInfo(version, filename)
	if err != nil {
		log.Printf("❌ Asset not found: %v", err)
		utils.ErrorResponse(ctx, http.StatusNotFound, "Asset not found: "+err.Error())
		return
	}

	log.Printf("🔗 Proxying download from GitHub: %s (%d bytes)", filename, assetInfo.Size)

	// Set response headers BEFORE streaming
	ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	ctx.Header("Content-Type", assetInfo.ContentType)
	ctx.Header("Content-Length", strconv.FormatInt(assetInfo.Size, 10))
	ctx.Header("X-Content-Type-Options", "nosniff")

	// Stream the file content
	written, _, err := c.updateService.StreamAssetDownload(version, filename, ctx.Writer)
	if err != nil {
		log.Printf("❌ Download streaming failed: %v", err)
		// Can't send error response if we already started streaming
		if written == 0 {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Download failed: "+err.Error())
		}
		return
	}

	log.Printf("✅ Download complete: %s (%d bytes)", filename, written)
}

// GetYMLFile returns the latest.yml/latest-mac.yml file for electron-updater
// GET /api/v1/updates/yml/:platform
// platform can be: darwin, win32, linux
func (c *UpdateController) GetYMLFile(ctx *gin.Context) {
	platform := ctx.Param("platform")
	if platform == "" {
		platform = "darwin"
	}

	log.Printf("📄 YML file request for platform: %s", platform)

	ymlInfo, err := c.updateService.GetYMLFile(platform)
	if err != nil {
		log.Printf("❌ Failed to get YML file: %v", err)
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to get update info: "+err.Error())
		return
	}

	// Return as YAML
	ctx.Header("Content-Type", "application/x-yaml")
	ctx.YAML(http.StatusOK, ymlInfo)
}

// GetReleaseNotes returns the release notes for a specific version
// GET /api/v1/updates/notes/:version
func (c *UpdateController) GetReleaseNotes(ctx *gin.Context) {
	version := ctx.Param("version")
	if version == "" {
		version = "latest"
	}

	var release *dto.GHRelease
	var err error

	if version == "latest" {
		// Use CheckForUpdates with version 0 to get latest
		req := dto.UpdateCheckRequest{
			CurrentVersion: "0.0.0",
			Platform:       "darwin",
			Arch:           "x64",
		}
		result, err := c.updateService.CheckForUpdates(req)
		if err != nil {
			utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to get release notes: "+err.Error())
			return
		}

		utils.SuccessResponse(ctx, http.StatusOK, "Release notes retrieved", gin.H{
			"version":       result.LatestVersion,
			"release_notes": result.ReleaseNotes,
			"release_date":  result.ReleaseDate,
		})
		return
	}

	release, err = c.updateService.GetReleaseByTag(version)
	if err != nil {
		release, err = c.updateService.GetReleaseByTag("v" + version)
		if err != nil {
			utils.ErrorResponse(ctx, http.StatusNotFound, "Release not found: "+err.Error())
			return
		}
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Release notes retrieved", gin.H{
		"version":       release.TagName,
		"release_notes": release.Body,
		"release_date":  release.PublishedAt,
	})
}

// GetPublicDownloadLinks returns download links for all platforms (public, no auth required)
// GET /api/v1/public/downloads/latest
// This is used by the website to display download links for users who don't have the app
func (c *UpdateController) GetPublicDownloadLinks(ctx *gin.Context) {
	log.Printf("📥 Public download links request")

	downloads, err := c.updateService.GetAllPlatformDownloads()
	if err != nil {
		log.Printf("❌ Failed to get download links: %v", err)
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to get download links: "+err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Download links retrieved", downloads)
}
