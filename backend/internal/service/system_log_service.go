package service

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

type BackendSystemLogInput struct {
	UserID         *uint
	DeviceID       *uint
	OrganizationID *uint
	WorkspaceID    *uint
	Source         string
	Level          string
	Component      string
	Message        string
	Details        interface{}
	StackTrace     string
	AppVersion     string
	DeviceUUID     string
	OccurredAt     time.Time
	RequestID      string
	SessionLocalID string
}

type SystemLogPolicy struct {
	RetentionDays   int
	CleanupInterval time.Duration
}

// SystemLogService handles backend-originated logs and client log ingestion.
type SystemLogService interface {
	LogBackend(input BackendSystemLogInput)
	SyncClientLogs(userID uint, device *models.DeviceInfo, items []dto.SyncSystemLogItem, defaultOrgID *uint, defaultWsID *uint) dto.SyncResult
	CleanupExpiredLogs(retentionDays int) (int64, error)
	StartRetentionWorker(retentionDays int, interval time.Duration)
	UpdateRetentionPolicy(retentionDays int, interval time.Duration)
	GetRetentionPolicy() SystemLogPolicy
}

type systemLogService struct {
	repo       repository.SystemLogRepository
	configRepo repository.SystemConfigRepository
	queue      chan models.SystemLog
	mu         sync.RWMutex
	policy     SystemLogPolicy
	stopCh     chan struct{}
}

// NewSystemLogService creates a new system log service.
func NewSystemLogService(
	repo repository.SystemLogRepository,
	configRepo repository.SystemConfigRepository,
) SystemLogService {
	svc := &systemLogService{
		repo:       repo,
		configRepo: configRepo,
		queue:      make(chan models.SystemLog, 512),
	}

	go svc.processQueue()

	return svc
}

func (s *systemLogService) LogBackend(input BackendSystemLogInput) {
	entry := models.SystemLog{
		UserID:         input.UserID,
		DeviceID:       input.DeviceID,
		OrganizationID: input.OrganizationID,
		WorkspaceID:    input.WorkspaceID,
		Source:         defaultString(input.Source, "backend-app"),
		Level:          strings.ToLower(defaultString(input.Level, "info")),
		Component:      input.Component,
		Message:        truncateString(strings.TrimSpace(input.Message), 8000),
		Details:        encodeJSON(input.Details),
		StackTrace:     truncateString(input.StackTrace, 16000),
		AppVersion:     input.AppVersion,
		DeviceUUID:     input.DeviceUUID,
		OccurredAt:     normalizeTime(input.OccurredAt),
		RequestID:      input.RequestID,
		SessionLocalID: input.SessionLocalID,
	}

	select {
	case s.queue <- entry:
	default:
		fmt.Fprintf(os.Stderr, "system log queue full, dropping log: %s\n", entry.Message)
	}
}

func (s *systemLogService) SyncClientLogs(userID uint, device *models.DeviceInfo, items []dto.SyncSystemLogItem, defaultOrgID *uint, defaultWsID *uint) dto.SyncResult {
	result := dto.SyncResult{
		Total:  len(items),
		Errors: []string{},
	}

	logs := make([]models.SystemLog, 0, len(items))

	for _, item := range items {
		orgID := item.OrganizationID
		if orgID == nil {
			orgID = defaultOrgID
		}

		wsID := item.WorkspaceID
		if wsID == nil {
			wsID = defaultWsID
		}

		entry := models.SystemLog{
			UserID:         &userID,
			OrganizationID: orgID,
			WorkspaceID:    wsID,
			Source:         defaultString(item.Source, "electron-main"),
			Level:          strings.ToLower(defaultString(item.Level, "info")),
			Component:      item.Component,
			Message:        truncateString(strings.TrimSpace(item.Message), 8000),
			Details:        encodeJSON(item.Details),
			StackTrace:     truncateString(item.StackTrace, 16000),
			AppVersion:     item.AppVersion,
			DeviceUUID:     item.DeviceUUID,
			OccurredAt:     normalizeTime(item.OccurredAt),
			RequestID:      item.RequestID,
			SessionLocalID: item.SessionLocalID,
		}

		if device != nil {
			entry.DeviceID = &device.ID
			if entry.DeviceUUID == "" {
				entry.DeviceUUID = device.DeviceUUID
			}
		}

		logs = append(logs, entry)
	}

	if err := s.repo.CreateBatch(logs); err != nil {
		result.Failed = len(items)
		result.Errors = append(result.Errors, err.Error())
		return result
	}

	result.Success = len(items)
	return result
}

func (s *systemLogService) CleanupExpiredLogs(retentionDays int) (int64, error) {
	if retentionDays <= 0 {
		return 0, nil
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -retentionDays)
	return s.repo.DeleteOlderThan(cutoff)
}

func (s *systemLogService) StartRetentionWorker(retentionDays int, interval time.Duration) {
	retentionDays, interval = s.loadPersistedPolicy(retentionDays, interval)
	s.UpdateRetentionPolicy(retentionDays, interval)
}

func (s *systemLogService) UpdateRetentionPolicy(retentionDays int, interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.policy = SystemLogPolicy{
		RetentionDays:   retentionDays,
		CleanupInterval: interval,
	}

	if s.stopCh != nil {
		close(s.stopCh)
		s.stopCh = nil
	}

	if retentionDays <= 0 || interval <= 0 {
		return
	}

	s.stopCh = make(chan struct{})
	stopCh := s.stopCh

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		if deleted, err := s.CleanupExpiredLogs(retentionDays); err == nil && deleted > 0 {
			fmt.Fprintf(os.Stdout, "system log retention cleanup deleted %d entries\n", deleted)
		}

		for {
			select {
			case <-ticker.C:
				if deleted, err := s.CleanupExpiredLogs(retentionDays); err != nil {
					fmt.Fprintf(os.Stderr, "system log retention cleanup failed: %v\n", err)
				} else if deleted > 0 {
					fmt.Fprintf(os.Stdout, "system log retention cleanup deleted %d entries\n", deleted)
				}
			case <-stopCh:
				return
			}
		}
	}()

	s.persistPolicy(retentionDays, interval)
}

func (s *systemLogService) GetRetentionPolicy() SystemLogPolicy {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.policy
}

func (s *systemLogService) loadPersistedPolicy(defaultRetentionDays int, defaultInterval time.Duration) (int, time.Duration) {
	retentionDays := defaultRetentionDays
	cleanupInterval := defaultInterval

	if s.configRepo == nil {
		return retentionDays, cleanupInterval
	}

	if config, err := s.configRepo.FindByKey("system_log_retention_days"); err == nil {
		if value, parseErr := strconv.Atoi(config.Value); parseErr == nil && value > 0 {
			retentionDays = value
		}
	}

	if config, err := s.configRepo.FindByKey("system_log_cleanup_interval"); err == nil {
		if value, parseErr := time.ParseDuration(config.Value); parseErr == nil && value > 0 {
			cleanupInterval = value
		}
	}

	return retentionDays, cleanupInterval
}

func (s *systemLogService) persistPolicy(retentionDays int, interval time.Duration) {
	if s.configRepo == nil {
		return
	}

	if err := s.configRepo.Upsert(&models.SystemConfig{
		Key:         "system_log_retention_days",
		Value:       strconv.Itoa(retentionDays),
		ValueType:   "int",
		Description: "Persisted retention period in days for system logs",
	}); err != nil {
		fmt.Fprintf(os.Stderr, "failed to persist system log retention days: %v\n", err)
	}

	if err := s.configRepo.Upsert(&models.SystemConfig{
		Key:         "system_log_cleanup_interval",
		Value:       interval.String(),
		ValueType:   "duration",
		Description: "Persisted cleanup interval for system log retention worker",
	}); err != nil {
		fmt.Fprintf(os.Stderr, "failed to persist system log cleanup interval: %v\n", err)
	}
}

func (s *systemLogService) processQueue() {
	for entry := range s.queue {
		if err := s.repo.Create(&entry); err != nil {
			fmt.Fprintf(os.Stderr, "failed to persist system log: %v\n", err)
		}
	}
}

func encodeJSON(value interface{}) string {
	if value == nil {
		return ""
	}

	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Sprintf(`{"marshal_error":%q}`, err.Error())
	}

	return string(data)
}

func normalizeTime(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func truncateString(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}
