package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/middleware"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// TimeLogController handles time log endpoints
type TimeLogController struct {
	timeLogService service.TimeLogService
}

// NewTimeLogController creates a new time log controller
func NewTimeLogController(timeLogService service.TimeLogService) *TimeLogController {
	return &TimeLogController{
		timeLogService: timeLogService,
	}
}

// Start handles starting time tracking
func (ctrl *TimeLogController) Start(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.StartTimeLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	timeLog, err := ctrl.timeLogService.Start(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Time tracking started", timeLog)
}

// Stop handles stopping time tracking
func (ctrl *TimeLogController) Stop(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.StopTimeLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	timeLog, err := ctrl.timeLogService.Stop(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Time tracking stopped", timeLog)
}

// Pause handles pausing time tracking
func (ctrl *TimeLogController) Pause(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.PauseTimeLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	timeLog, err := ctrl.timeLogService.Pause(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Time tracking paused", timeLog)
}

// Resume handles resuming time tracking
func (ctrl *TimeLogController) Resume(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.ResumeTimeLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	timeLog, err := ctrl.timeLogService.Resume(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Time tracking resumed", timeLog)
}

// GetActive retrieves active time tracking session
func (ctrl *TimeLogController) GetActive(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	timeLog, err := ctrl.timeLogService.GetActiveSession(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	if timeLog == nil {
		utils.SuccessResponse(c, http.StatusOK, "No active session", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Active session retrieved", timeLog)
}

// List retrieves user's time logs
func (ctrl *TimeLogController) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))

	timeLogs, total, err := ctrl.timeLogService.GetByUserID(userID, page, perPage)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.PaginatedResponse(c, http.StatusOK, timeLogs, page, perPage, total)
}

// GetByID retrieves a specific time log
func (ctrl *TimeLogController) GetByID(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid ID")
		return
	}

	timeLog, err := ctrl.timeLogService.GetByID(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Time log retrieved", timeLog)
}

// GetStats retrieves time tracking statistics
func (ctrl *TimeLogController) GetStats(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse date range
	startDate, _ := time.Parse("2006-01-02", c.DefaultQuery("start_date", time.Now().AddDate(0, 0, -7).Format("2006-01-02")))
	endDate, _ := time.Parse("2006-01-02", c.DefaultQuery("end_date", time.Now().Format("2006-01-02")))

	totalTime, err := ctrl.timeLogService.GetTotalTime(userID, startDate, endDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	timeLogs, err := ctrl.timeLogService.GetByDateRange(userID, startDate, endDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Statistics retrieved", gin.H{
		"total_time_seconds": totalTime,
		"total_time_hours":   float64(totalTime) / 3600,
		"session_count":      len(timeLogs),
		"start_date":         startDate,
		"end_date":           endDate,
	})
}
