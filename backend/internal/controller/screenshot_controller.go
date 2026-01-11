package controller

import (
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// ScreenshotController handles screenshot-related HTTP requests
type ScreenshotController struct {
	screenshotService service.ScreenshotService
}

// NewScreenshotController creates a new screenshot controller
func NewScreenshotController(screenshotService service.ScreenshotService) *ScreenshotController {
	return &ScreenshotController{
		screenshotService: screenshotService,
	}
}

// GetScreenshot retrieves a single screenshot
// @Summary Get screenshot by ID
// @Tags screenshots
// @Accept json
// @Produce json
// @Param id path int true "Screenshot ID"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/{id} [get]
func (c *ScreenshotController) GetScreenshot(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid screenshot ID")
		return
	}

	screenshot, err := c.screenshotService.GetScreenshot(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshot retrieved successfully", screenshot)
}

// ListScreenshots retrieves screenshots with pagination
// @Summary List screenshots
// @Tags screenshots
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots [get]
func (c *ScreenshotController) ListScreenshots(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(ctx.DefaultQuery("per_page", "20"))

	screenshots, total, err := c.screenshotService.GetScreenshotsByUser(userID, page, perPage)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	response := dto.PaginationResponse{
		Data:       screenshots,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshots retrieved successfully", response)
}

// GetScreenshotsByTimeLog retrieves screenshots for a specific timelog
// @Summary Get screenshots by timelog ID
// @Tags screenshots
// @Accept json
// @Produce json
// @Param timelog_id path int true "TimeLog ID"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/timelog/{timelog_id} [get]
func (c *ScreenshotController) GetScreenshotsByTimeLog(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")
	timeLogIDStr := ctx.Param("timelog_id")
	timeLogID, err := strconv.ParseUint(timeLogIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid timelog ID")
		return
	}

	screenshots, err := c.screenshotService.GetScreenshotsByTimeLog(uint(timeLogID), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshots retrieved successfully", screenshots)
}

// GetScreenshotsByTaskID retrieves all screenshots for a specific task
// @Summary Get screenshots by task ID
// @Tags screenshots
// @Accept json
// @Produce json
// @Param task_id path int true "Task ID"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/task/{task_id} [get]
func (c *ScreenshotController) GetScreenshotsByTaskID(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")

	taskIDStr := ctx.Param("task_id")
	taskID, err := strconv.ParseUint(taskIDStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid task ID")
		return
	}

	screenshots, err := c.screenshotService.GetScreenshotsByTaskID(uint(taskID), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshots retrieved successfully", screenshots)
}

// GetScreenshotsByDateRange retrieves screenshots within a date range
// @Summary Get screenshots by date range
// @Tags screenshots
// @Accept json
// @Produce json
// @Param start_date query string true "Start date (YYYY-MM-DD)"
// @Param end_date query string true "End date (YYYY-MM-DD)"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/range [get]
func (c *ScreenshotController) GetScreenshotsByDateRange(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")

	startDateStr := ctx.Query("start_date")
	endDateStr := ctx.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "start_date and end_date are required")
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid start_date format (use YYYY-MM-DD)")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid end_date format (use YYYY-MM-DD)")
		return
	}

	// Set end date to end of day
	endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	screenshots, err := c.screenshotService.GetScreenshotsByDateRange(userID, startDate, endDate)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshots retrieved successfully", screenshots)
}

// DeleteScreenshot deletes a screenshot
// @Summary Delete screenshot
// @Tags screenshots
// @Accept json
// @Produce json
// @Param id path int true "Screenshot ID"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/{id} [delete]
func (c *ScreenshotController) DeleteScreenshot(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid screenshot ID")
		return
	}

	err = c.screenshotService.DeleteScreenshot(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Screenshot deleted successfully", nil)
}

// GetScreenshotStats retrieves screenshot statistics
// @Summary Get screenshot statistics
// @Tags screenshots
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} utils.SuccessResponse
// @Failure 400 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/stats [get]
func (c *ScreenshotController) GetScreenshotStats(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")

	// Default to last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	if startDateStr := ctx.Query("start_date"); startDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startDate = parsed
		}
	}

	if endDateStr := ctx.Query("end_date"); endDateStr != "" {
		if parsed, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endDate = parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	stats, err := c.screenshotService.GetScreenshotStats(userID, startDate, endDate)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Statistics retrieved successfully", stats)
}

// DownloadScreenshot serves the screenshot file
// @Summary Download screenshot file
// @Tags screenshots
// @Accept json
// @Produce application/octet-stream
// @Param id path int true "Screenshot ID"
// @Success 200 {file} file
// @Failure 404 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/{id}/download [get]
func (c *ScreenshotController) DownloadScreenshot(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid screenshot ID")
		return
	}

	screenshot, err := c.screenshotService.GetScreenshot(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, err.Error())
		return
	}

	// Set appropriate headers
	ctx.Header("Content-Description", "File Transfer")
	ctx.Header("Content-Transfer-Encoding", "binary")
	ctx.Header("Content-Disposition", "attachment; filename="+screenshot.FileName)
	ctx.Header("Content-Type", screenshot.MimeType)

	// Serve the file
	ctx.File(screenshot.FilePath)
}

// ViewScreenshot serves the screenshot file for viewing
// @Summary View screenshot file
// @Tags screenshots
// @Accept json
// @Produce image/*
// @Param id path int true "Screenshot ID"
// @Success 200 {file} file
// @Failure 404 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/{id}/view [get]
func (c *ScreenshotController) ViewScreenshot(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, "Invalid screenshot ID")
		return
	}

	screenshot, err := c.screenshotService.GetScreenshot(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusNotFound, err.Error())
		return
	}

	// Check if file exists
	if !utils.FileExists(screenshot.FilePath) {
		utils.ErrorResponse(ctx, http.StatusNotFound, "Screenshot file not found on server")
		return
	}

	// Set appropriate headers for viewing
	ctx.Header("Content-Type", screenshot.MimeType)
	ctx.Header("Content-Disposition", "inline; filename="+filepath.Base(screenshot.FileName))

	// Serve the file
	ctx.File(screenshot.FilePath)
}

// GetTodayScreenshotCount returns the count of screenshots captured today
// @Summary Get today's screenshot count
// @Tags screenshots
// @Accept json
// @Produce json
// @Success 200 {object} utils.SuccessResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /api/v1/screenshots/today/count [get]
func (c *ScreenshotController) GetTodayScreenshotCount(ctx *gin.Context) {
	userID := ctx.GetUint("user_id")

	count, err := c.screenshotService.GetTodayScreenshotCount(userID)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Today's screenshot count retrieved successfully", map[string]interface{}{
		"count": count,
	})
}
