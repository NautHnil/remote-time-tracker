package controller

import (
	"net/http"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/middleware"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// PresenceController handles presence/heartbeat endpoints
type PresenceController struct {
	presenceService service.PresenceService
}

// NewPresenceController creates a new presence controller
func NewPresenceController(presenceService service.PresenceService) *PresenceController {
	return &PresenceController{presenceService: presenceService}
}

// Heartbeat handles presence heartbeat
// @Summary Presence heartbeat
// @Description Update user's presence status (working/idle) with heartbeat
// @Tags presence
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.PresenceHeartbeatRequest true "Presence heartbeat request"
// @Success 200 {object} dto.SuccessResponse{data=dto.PresenceStatusResponse} "Presence updated"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Router /presence/heartbeat [post]
func (c *PresenceController) Heartbeat(ctx *gin.Context) {
	userID, ok := middleware.GetUserID(ctx)
	if !ok {
		utils.ErrorResponse(ctx, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.PresenceHeartbeatRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, err.Error())
		return
	}

	resp, err := c.presenceService.UpdatePresence(userID, &req)
	if err != nil {
		utils.ErrorResponse(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(ctx, http.StatusOK, "Presence updated", resp)
}
