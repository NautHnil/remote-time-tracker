package utils

import (
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
)

// ComputePresenceStatus returns working/idle/stale based on last heartbeat and stored status.
func ComputePresenceStatus(status string, lastPresenceAt *time.Time, staleAfter time.Duration) string {
	if lastPresenceAt == nil {
		return models.UserPresenceIdle
	}

	if staleAfter > 0 && time.Since(*lastPresenceAt) > staleAfter {
		return models.UserPresenceStale
	}

	switch status {
	case models.UserPresenceWorking:
		return models.UserPresenceWorking
	case models.UserPresenceIdle:
		return models.UserPresenceIdle
	default:
		return models.UserPresenceIdle
	}
}
