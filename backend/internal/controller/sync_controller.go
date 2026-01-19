package controller

import (
	"net/http"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/middleware"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// SyncController handles synchronization endpoints
type SyncController struct {
	syncService service.SyncService
}

// NewSyncController creates a new sync controller
func NewSyncController(syncService service.SyncService) *SyncController {
	return &SyncController{
		syncService: syncService,
	}
}

// BatchSync handles batch synchronization from Electron app
// @Summary Batch sync data from desktop app
// @Description Synchronize time logs, screenshots, and device info from Electron desktop app. Supports offline-first sync with conflict resolution.
// @Tags sync
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.BatchSyncRequest true "Batch sync request containing time logs, screenshots, and device info"
// @Success 200 {object} dto.SuccessResponse{data=dto.BatchSyncResponse} "Batch sync completed"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Sync failed"
// @Router /sync/batch [post]
func (ctrl *SyncController) BatchSync(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.BatchSyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	response, err := ctrl.syncService.BatchSync(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Batch sync completed", response)
}
