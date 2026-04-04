package service

import (
	"errors"
	"strings"
	"time"

	"remote-time-tracker.dev/internal/dto"
	"remote-time-tracker.dev/internal/models"
	"remote-time-tracker.dev/internal/repository"
)

// PresenceService handles user presence updates
type PresenceService interface {
	UpdatePresence(userID uint, req *dto.PresenceHeartbeatRequest) (*dto.PresenceStatusResponse, error)
}

type presenceService struct {
	userRepo   repository.UserRepository
	deviceRepo repository.DeviceRepository
}

// NewPresenceService creates a new presence service
func NewPresenceService(userRepo repository.UserRepository, deviceRepo repository.DeviceRepository) PresenceService {
	return &presenceService{
		userRepo:   userRepo,
		deviceRepo: deviceRepo,
	}
}

func (s *presenceService) UpdatePresence(userID uint, req *dto.PresenceHeartbeatRequest) (*dto.PresenceStatusResponse, error) {
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != models.UserPresenceWorking && status != models.UserPresenceIdle {
		return nil, errors.New("invalid status: must be working or idle")
	}

	now := time.Now().UTC()
	var lastWorkingAt *time.Time
	if status == models.UserPresenceWorking {
		lastWorkingAt = &now
	}

	if err := s.userRepo.UpdatePresence(userID, status, now, lastWorkingAt); err != nil {
		return nil, err
	}

	PresenceBroadcaster.Broadcast(PresenceEvent{
		UserID:         userID,
		Status:         status,
		LastPresenceAt: now,
		LastWorkingAt:  lastWorkingAt,
	})

	if req.DeviceID != nil {
		_ = s.deviceRepo.UpdateLastSeen(*req.DeviceID)
	}

	return &dto.PresenceStatusResponse{
		Status:         status,
		LastPresenceAt: now,
		LastWorkingAt:  lastWorkingAt,
	}, nil
}
