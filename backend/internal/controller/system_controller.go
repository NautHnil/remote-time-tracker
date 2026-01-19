package controller

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// SystemController handles system-related endpoints
type SystemController struct {
	systemService service.SystemService
}

// NewSystemController creates a new system controller
func NewSystemController(systemService service.SystemService) *SystemController {
	return &SystemController{
		systemService: systemService,
	}
}

// InitializeAdmin creates the first system admin
// @Summary Initialize system admin
// @Description Creates the first system admin. This endpoint only works when no admin exists in the system. Used for initial setup.
// @Tags system
// @Accept json
// @Produce json
// @Param request body dto.InitAdminRequest true "Admin details"
// @Success 201 {object} dto.SuccessResponse{data=dto.InitAdminResponse} "System admin created successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 409 {object} dto.ErrorResponse "Admin already exists"
// @Failure 500 {object} dto.ErrorResponse "Failed to create admin"
// @Router /system/init-admin [post]
func (c *SystemController) InitializeAdmin(ctx *gin.Context) {
	var req dto.InitAdminRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Check if admin already exists
	hasAdmin, err := c.systemService.HasSystemAdmin()
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to check admin status: "+err.Error())
		return
	}

	if hasAdmin {
		utils.ErrorResponse(ctx, http.StatusConflict, "System admin already exists")
		return
	}

	// Create admin
	admin, err := c.systemService.InitializeAdmin(&req)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to create admin: "+err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusCreated, "System admin created successfully", dto.InitAdminResponse{
		Success: true,
		Message: "System admin created successfully",
		User: dto.UserResponse{
			ID:         admin.ID,
			Email:      admin.Email,
			FirstName:  admin.FirstName,
			LastName:   admin.LastName,
			Role:       admin.Role,
			SystemRole: admin.SystemRole,
			IsActive:   admin.IsActive,
			CreatedAt:  admin.CreatedAt,
		},
	})
}

// CheckAdminExists checks if system admin exists
// @Summary Check if system admin exists
// @Description Returns whether a system admin has been created. Used to determine if initial setup is required.
// @Tags system
// @Produce json
// @Success 200 {object} dto.SuccessResponse{data=dto.CheckAdminExistsResponse} "Admin status checked"
// @Failure 500 {object} dto.ErrorResponse "Failed to check admin status"
// @Router /system/admin-exists [get]
func (c *SystemController) CheckAdminExists(ctx *gin.Context) {
	hasAdmin, err := c.systemService.HasSystemAdmin()
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, "Failed to check admin status: "+err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Admin status checked", dto.CheckAdminExistsResponse{
		Exists: hasAdmin,
	})
}

// CheckUploadsFolder verifies upload folder structure and permissions
// @Summary Check uploads folder health
// @Description Verifies that upload and screenshot folders exist and are writable
// @Tags system
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.SuccessResponse "Upload folder check completed"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /system/uploads/check [get]
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
// @Description Creates necessary upload folders (uploads, screenshots) if they don't exist
// @Tags system
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.SuccessResponse "Upload folders ensured"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Failed to create folders"
// @Router /system/uploads/ensure [post]
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
