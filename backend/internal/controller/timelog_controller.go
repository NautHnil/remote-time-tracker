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
// @Summary Start time tracking
// @Description Start a new time tracking session. Only one active session is allowed per user.
// @Tags timelogs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.StartTimeLogRequest true "Start time log request"
// @Success 201 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Time tracking started"
// @Failure 400 {object} dto.ErrorResponse "Already have an active session or invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /timelogs/start [post]
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
// @Summary Stop time tracking
// @Description Stop the active time tracking session and save the duration
// @Tags timelogs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.StopTimeLogRequest true "Stop time log request"
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Time tracking stopped"
// @Failure 400 {object} dto.ErrorResponse "No active session or invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /timelogs/stop [post]
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
// @Summary Pause time tracking
// @Description Pause the active time tracking session
// @Tags timelogs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.PauseTimeLogRequest true "Pause time log request"
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Time tracking paused"
// @Failure 400 {object} dto.ErrorResponse "No active session or already paused"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /timelogs/pause [post]
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
// @Summary Resume time tracking
// @Description Resume a paused time tracking session
// @Tags timelogs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.ResumeTimeLogRequest true "Resume time log request"
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Time tracking resumed"
// @Failure 400 {object} dto.ErrorResponse "No paused session or invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /timelogs/resume [post]
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
// @Summary Get active time tracking session
// @Description Get the current active or paused time tracking session for the authenticated user
// @Tags timelogs
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Active session retrieved (null if no active session)"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /timelogs/active [get]
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
// @Summary List time logs
// @Description Get paginated list of time logs for the authenticated user
// @Tags timelogs
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1) minimum(1)
// @Param per_page query int false "Items per page" default(20) minimum(1) maximum(100)
// @Success 200 {object} dto.PaginatedResponse{data=[]dto.TimeLogResponse} "Time logs retrieved"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /timelogs [get]
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
// @Summary Get time log by ID
// @Description Get a specific time log by its ID
// @Tags timelogs
// @Produce json
// @Security BearerAuth
// @Param id path int true "Time log ID"
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogResponse} "Time log retrieved"
// @Failure 400 {object} dto.ErrorResponse "Invalid ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Time log not found"
// @Router /timelogs/{id} [get]
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
// @Summary Get time tracking statistics
// @Description Get time tracking statistics for a date range
// @Tags timelogs
// @Produce json
// @Security BearerAuth
// @Param start_date query string false "Start date (YYYY-MM-DD)" default(7 days ago)
// @Param end_date query string false "End date (YYYY-MM-DD)" default(today)
// @Success 200 {object} dto.SuccessResponse{data=dto.TimeLogStats} "Statistics retrieved"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /timelogs/stats [get]
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
