package controller

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// SystemController handles system-related endpoints
type SystemController struct{}

// NewSystemController creates a new system controller
func NewSystemController() *SystemController {
	return &SystemController{}
}

// CheckUploadsFolder verifies upload folder structure and permissions
// @Summary Check uploads folder health
// @Tags system
// @Accept json
// @Produce json
// @Success 200 {object} utils.SuccessResponse
// @Router /api/v1/system/uploads/check [get]
func (c *SystemController) CheckUploadsFolder(ctx *gin.Context) {
	uploadPath := config.AppConfig.Upload.Path
	screenshotsPath := filepath.Join(uploadPath, "screenshots")

	checks := map[string]interface{}{
		"upload_path":               uploadPath,
		"screenshots_path":          screenshotsPath,
		"upload_path_exists":        false,
		"screenshots_path_exists":   false,
		"upload_path_writable":      false,
		"screenshots_path_writable": false,
		"files_count":               0,
	}

	// Check if upload path exists
	if stat, err := os.Stat(uploadPath); err == nil {
		checks["upload_path_exists"] = true
		checks["upload_path_is_dir"] = stat.IsDir()

		// Check if writable
		testFile := filepath.Join(uploadPath, ".write_test")
		if err := os.WriteFile(testFile, []byte("test"), 0644); err == nil {
			checks["upload_path_writable"] = true
			os.Remove(testFile)
		}
	} else {
		checks["upload_path_error"] = err.Error()
	}

	// Check if screenshots path exists
	if stat, err := os.Stat(screenshotsPath); err == nil {
		checks["screenshots_path_exists"] = true
		checks["screenshots_path_is_dir"] = stat.IsDir()

		// Check if writable
		testFile := filepath.Join(screenshotsPath, ".write_test")
		if err := os.WriteFile(testFile, []byte("test"), 0644); err == nil {
			checks["screenshots_path_writable"] = true
			os.Remove(testFile)
		}

		// Count files
		files, err := os.ReadDir(screenshotsPath)
		if err == nil {
			checks["files_count"] = len(files)

			// Sample first 5 files
			samples := []string{}
			for i, file := range files {
				if i >= 5 {
					break
				}
				if !file.IsDir() {
					samples = append(samples, file.Name())
				}
			}
			checks["sample_files"] = samples
		}
	} else {
		checks["screenshots_path_error"] = err.Error()
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Upload folder check completed", checks)
}

// EnsureUploadsFolders creates necessary upload folders if they don't exist
// @Summary Ensure upload folders exist
// @Tags system
// @Accept json
// @Produce json
// @Success 200 {object} utils.SuccessResponse
// @Router /api/v1/system/uploads/ensure [post]
func (c *SystemController) EnsureUploadsFolders(ctx *gin.Context) {
	uploadPath := config.AppConfig.Upload.Path
	screenshotsPath := filepath.Join(uploadPath, "screenshots")

	results := map[string]interface{}{
		"upload_path_created":      false,
		"screenshots_path_created": false,
	}

	// Create upload path
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to create upload path: "+err.Error())
		return
	}
	results["upload_path_created"] = true

	// Create screenshots path
	if err := os.MkdirAll(screenshotsPath, 0755); err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to create screenshots path: "+err.Error())
		return
	}
	results["screenshots_path_created"] = true

	utils.SuccessResponse(ctx, http.StatusOK, "Upload folders ensured", results)
}
