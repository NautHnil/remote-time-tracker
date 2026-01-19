package service

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

// TimeLogService handles time log business logic
type TimeLogService interface {
	Start(userID uint, req *dto.StartTimeLogRequest) (*models.TimeLog, error)
	Stop(userID uint, req *dto.StopTimeLogRequest) (*models.TimeLog, error)
	Pause(userID uint, req *dto.PauseTimeLogRequest) (*models.TimeLog, error)
	Resume(userID uint, req *dto.ResumeTimeLogRequest) (*models.TimeLog, error)
	GetByID(id, userID uint) (*models.TimeLog, error)
	GetByUserID(userID uint, page, perPage int) ([]models.TimeLog, int64, error)
	GetActiveSession(userID uint) (*models.TimeLog, error)
	GetByDateRange(userID uint, startDate, endDate time.Time) ([]models.TimeLog, error)
	GetTotalTime(userID uint, startDate, endDate time.Time) (int64, error)
}

type timeLogService struct {
	timeLogRepo repository.TimeLogRepository
	deviceRepo  repository.DeviceRepository
	userRepo    repository.UserRepository
}

// NewTimeLogService creates a new time log service
func NewTimeLogService(
	timeLogRepo repository.TimeLogRepository,
	deviceRepo repository.DeviceRepository,
	userRepo repository.UserRepository,
) TimeLogService {
	return &timeLogService{
		timeLogRepo: timeLogRepo,
		deviceRepo:  deviceRepo,
		userRepo:    userRepo,
	}
}

func (s *timeLogService) Start(userID uint, req *dto.StartTimeLogRequest) (*models.TimeLog, error) {
	// Check if there's already an active session
	activeSession, err := s.timeLogRepo.FindActiveByUserID(userID)
	if err != nil {
		return nil, err
	}

	if activeSession != nil {
		return nil, errors.New("there is already an active time tracking session")
	}

	// Create new time log
	timeLog := &models.TimeLog{
		UserID:    userID,
		TaskID:    req.TaskID,
		DeviceID:  req.DeviceID,
		LocalID:   req.LocalID,
		StartTime: time.Now().UTC(),
		Status:    "running",
		Notes:     req.Notes,
	}

	if err := s.timeLogRepo.Create(timeLog); err != nil {
		return nil, errors.New("failed to start time tracking")
	}

	now := time.Now().UTC()
	_ = s.userRepo.UpdatePresence(userID, models.UserPresenceWorking, now, &now)
	PresenceBroadcaster.Broadcast(PresenceEvent{
		UserID:         userID,
		Status:         models.UserPresenceWorking,
		LastPresenceAt: now,
		LastWorkingAt:  &now,
	})

	// Update device last seen
	if req.DeviceID != nil {
		s.deviceRepo.UpdateLastSeen(*req.DeviceID)
	}

	return timeLog, nil
}

func (s *timeLogService) Stop(userID uint, req *dto.StopTimeLogRequest) (*models.TimeLog, error) {
	var timeLog *models.TimeLog
	var err error

	// Find time log by local ID or active session
	if req.LocalID != "" {
		timeLog, err = s.timeLogRepo.FindByLocalID(req.LocalID, userID)
		if timeLog == nil {
			timeLog, err = s.timeLogRepo.FindActiveByUserID(userID)
		}
	} else {
		timeLog, err = s.timeLogRepo.FindActiveByUserID(userID)
	}

	if err != nil {
		return nil, err
	}

	if timeLog == nil {
		return nil, errors.New("no active time tracking session found")
	}

	// Check ownership
	if timeLog.UserID != userID {
		return nil, errors.New("unauthorized access to time log")
	}

	now := time.Now().UTC()
	timeLog.EndTime = &now
	timeLog.Status = "stopped"
	if req.Notes != "" {
		timeLog.Notes = req.Notes
	}
	// Save task title if provided
	if req.TaskTitle != "" {
		timeLog.TaskTitle = req.TaskTitle
	}

	// Calculate duration
	duration := now.Sub(timeLog.StartTime).Seconds()
	if timeLog.PausedTotal > 0 {
		duration -= float64(timeLog.PausedTotal)
	}
	timeLog.Duration = int64(duration)

	if err := s.timeLogRepo.Update(timeLog); err != nil {
		return nil, errors.New("failed to stop time tracking")
	}

	_ = s.userRepo.UpdatePresence(userID, models.UserPresenceIdle, now, nil)
	PresenceBroadcaster.Broadcast(PresenceEvent{
		UserID:         userID,
		Status:         models.UserPresenceIdle,
		LastPresenceAt: now,
		LastWorkingAt:  nil,
	})

	return timeLog, nil
}

func (s *timeLogService) Pause(userID uint, req *dto.PauseTimeLogRequest) (*models.TimeLog, error) {
	var timeLog *models.TimeLog
	var err error

	if req.LocalID != "" {
		timeLog, err = s.timeLogRepo.FindByLocalID(req.LocalID, userID)
	} else {
		timeLog, err = s.timeLogRepo.FindActiveByUserID(userID)
	}

	if err != nil {
		return nil, err
	}

	if timeLog == nil {
		return nil, errors.New("no active time tracking session found")
	}

	if timeLog.UserID != userID {
		return nil, errors.New("unauthorized access to time log")
	}

	if timeLog.Status != "running" {
		return nil, errors.New("time tracking session is not running")
	}

	now := time.Now().UTC()
	timeLog.PausedAt = &now
	timeLog.Status = "paused"

	if err := s.timeLogRepo.Update(timeLog); err != nil {
		return nil, errors.New("failed to pause time tracking")
	}

	_ = s.userRepo.UpdatePresence(userID, models.UserPresenceIdle, now, nil)
	PresenceBroadcaster.Broadcast(PresenceEvent{
		UserID:         userID,
		Status:         models.UserPresenceIdle,
		LastPresenceAt: now,
		LastWorkingAt:  nil,
	})

	return timeLog, nil
}

func (s *timeLogService) Resume(userID uint, req *dto.ResumeTimeLogRequest) (*models.TimeLog, error) {
	var timeLog *models.TimeLog
	var err error

	if req.LocalID != "" {
		timeLog, err = s.timeLogRepo.FindByLocalID(req.LocalID, userID)
	} else {
		timeLog, err = s.timeLogRepo.FindActiveByUserID(userID)
	}

	if err != nil {
		return nil, err
	}

	if timeLog == nil {
		return nil, errors.New("no paused time tracking session found")
	}

	if timeLog.UserID != userID {
		return nil, errors.New("unauthorized access to time log")
	}

	if timeLog.Status != "paused" {
		return nil, errors.New("time tracking session is not paused")
	}

	now := time.Now().UTC()

	// Calculate paused duration and add to total
	if timeLog.PausedAt != nil {
		pausedDuration := int64(now.Sub(*timeLog.PausedAt).Seconds())
		timeLog.PausedTotal += pausedDuration
	}

	timeLog.ResumedAt = &now
	timeLog.Status = "running"
	timeLog.PausedAt = nil

	if err := s.timeLogRepo.Update(timeLog); err != nil {
		return nil, errors.New("failed to resume time tracking")
	}

	_ = s.userRepo.UpdatePresence(userID, models.UserPresenceWorking, now, &now)
	PresenceBroadcaster.Broadcast(PresenceEvent{
		UserID:         userID,
		Status:         models.UserPresenceWorking,
		LastPresenceAt: now,
		LastWorkingAt:  &now,
	})

	return timeLog, nil
}

func (s *timeLogService) GetByID(id, userID uint) (*models.TimeLog, error) {
	timeLog, err := s.timeLogRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if timeLog.UserID != userID {
		return nil, errors.New("unauthorized access to time log")
	}

	return timeLog, nil
}

func (s *timeLogService) GetByUserID(userID uint, page, perPage int) ([]models.TimeLog, int64, error) {
	return s.timeLogRepo.FindByUserID(userID, page, perPage)
}

func (s *timeLogService) GetActiveSession(userID uint) (*models.TimeLog, error) {
	return s.timeLogRepo.FindActiveByUserID(userID)
}

func (s *timeLogService) GetByDateRange(userID uint, startDate, endDate time.Time) ([]models.TimeLog, error) {
	return s.timeLogRepo.FindByDateRange(userID, startDate, endDate)
}

func (s *timeLogService) GetTotalTime(userID uint, startDate, endDate time.Time) (int64, error) {
	return s.timeLogRepo.GetTotalTimeByUser(userID, startDate, endDate)
}
