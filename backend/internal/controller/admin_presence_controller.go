package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/gin-gonic/gin"
)

// AdminPresenceController handles admin presence stream
type AdminPresenceController struct{}

// NewAdminPresenceController creates a new admin presence controller
func NewAdminPresenceController() *AdminPresenceController {
	return &AdminPresenceController{}
}

// Stream provides an SSE stream of presence updates
// @Summary Presence stream (admin only)
// @Description Stream presence updates via Server-Sent Events
// @Tags admin
// @Produce text/event-stream
// @Security BearerAuth
// @Success 200 {string} string "SSE stream"
// @Router /admin/presence/stream [get]
func (c *AdminPresenceController) Stream(ctx *gin.Context) {
	ctx.Writer.Header().Set("Content-Type", "text/event-stream")
	ctx.Writer.Header().Set("Cache-Control", "no-cache")
	ctx.Writer.Header().Set("Connection", "keep-alive")
	ctx.Writer.Header().Set("X-Accel-Buffering", "no")
	ctx.Status(http.StatusOK)

	flusher, ok := ctx.Writer.(http.Flusher)
	if !ok {
		ctx.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	sub := service.PresenceBroadcaster.Subscribe()
	defer service.PresenceBroadcaster.Unsubscribe(sub)

	pingTicker := time.NewTicker(25 * time.Second)
	defer pingTicker.Stop()

	for {
		select {
		case <-ctx.Request.Context().Done():
			return
		case payload := <-sub:
			_, _ = fmt.Fprintf(ctx.Writer, "data: %s\n\n", payload)
			flusher.Flush()
		case <-pingTicker.C:
			_, _ = fmt.Fprintf(ctx.Writer, ": ping\n\n")
			flusher.Flush()
		}
	}
}
