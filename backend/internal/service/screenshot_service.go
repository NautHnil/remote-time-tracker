package service

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

// ScreenshotService handles business logic for screenshots
type ScreenshotService interface {
	GetScreenshot(id uint, userID uint) (*models.Screenshot, error)
	GetScreenshotsByUser(userID uint, page, perPage int) ([]models.Screenshot, int64, error)
	GetScreenshotsByTimeLog(timeLogID uint, userID uint) ([]models.Screenshot, error)
	GetScreenshotsByTaskID(taskID uint, userID uint) ([]models.Screenshot, error)
	GetScreenshotsByDateRange(userID uint, startDate, endDate time.Time) ([]models.Screenshot, error)
	DeleteScreenshot(id uint, userID uint) error
	GetScreenshotStats(userID uint, startDate, endDate time.Time) (map[string]interface{}, error)
	GetTodayScreenshotCount(userID uint) (int64, error)
}

type screenshotService struct {
	screenshotRepo repository.ScreenshotRepository
	timeLogRepo    repository.TimeLogRepository
	taskRepo       repository.TaskRepository
}

// NewScreenshotService creates a new screenshot service
func NewScreenshotService(
	screenshotRepo repository.ScreenshotRepository,
	timeLogRepo repository.TimeLogRepository,
	taskRepo repository.TaskRepository,
) ScreenshotService {
	return &screenshotService{
		screenshotRepo: screenshotRepo,
		timeLogRepo:    timeLogRepo,
		taskRepo:       taskRepo,
	}
}

// GetScreenshot retrieves a single screenshot by ID
func (s *screenshotService) GetScreenshot(id uint, userID uint) (*models.Screenshot, error) {
	screenshot, err := s.screenshotRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check ownership
	if screenshot.UserID != userID {
		return nil, errors.New("unauthorized access to screenshot")
	}

	return screenshot, nil
}

// GetScreenshotsByUser retrieves screenshots for a user with pagination
func (s *screenshotService) GetScreenshotsByUser(userID uint, page, perPage int) ([]models.Screenshot, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	return s.screenshotRepo.FindByUserID(userID, page, perPage)
}

// GetScreenshotsByTimeLog retrieves all screenshots for a specific timelog
func (s *screenshotService) GetScreenshotsByTimeLog(timeLogID uint, userID uint) ([]models.Screenshot, error) {
	// Verify timelog ownership
	timeLog, err := s.timeLogRepo.FindByID(timeLogID)
	if err != nil {
		return nil, err
	}

	if timeLog.UserID != userID {
		return nil, errors.New("unauthorized access to timelog")
	}

	return s.screenshotRepo.FindByTimeLogID(timeLogID)
}

// GetScreenshotsByTaskID retrieves all screenshots for a specific task
func (s *screenshotService) GetScreenshotsByTaskID(taskID uint, userID uint) ([]models.Screenshot, error) {
	// First, get the task to find its local_id
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if task.UserID != userID {
		return nil, errors.New("unauthorized access to task")
	}

	// Query screenshots by task_local_id (primary) OR task_id (fallback for old data)
	// This handles both new screenshots (with task_local_id) and old screenshots (with task_id)
	screenshots, err := s.screenshotRepo.FindByTaskIDOrLocalID(taskID, task.LocalID, userID)
	if err != nil {
		return nil, err
	}

	return screenshots, nil
}

// GetScreenshotsByDateRange retrieves screenshots within a date range
func (s *screenshotService) GetScreenshotsByDateRange(userID uint, startDate, endDate time.Time) ([]models.Screenshot, error) {
	// Validate date range
	if endDate.Before(startDate) {
		return nil, errors.New("end date must be after start date")
	}

	// Limit to 90 days
	if endDate.Sub(startDate) > 90*24*time.Hour {
		return nil, errors.New("date range cannot exceed 90 days")
	}

	return s.screenshotRepo.FindByDateRange(userID, startDate, endDate)
}

// DeleteScreenshot deletes a screenshot (both DB record and file)
func (s *screenshotService) DeleteScreenshot(id uint, userID uint) error {
	// Verify ownership
	screenshot, err := s.screenshotRepo.FindByID(id)
	if err != nil {
		return err
	}

	if screenshot.UserID != userID {
		return errors.New("unauthorized access to screenshot")
	}

	// Delete from database first
	if err := s.screenshotRepo.Delete(id); err != nil {
		return err
	}

	// Then delete the file from disk
	// Note: We don't fail the whole operation if file deletion fails
	// because the DB record is already gone
	if err := s.screenshotRepo.DeleteFile(screenshot.FilePath); err != nil {
		// Log error but don't return it - DB deletion already succeeded
		// In production, you might want to use a proper logger here
		_ = err
	}

	return nil
}

// GetScreenshotStats retrieves screenshot statistics
func (s *screenshotService) GetScreenshotStats(userID uint, startDate, endDate time.Time) (map[string]interface{}, error) {
	// First, get timelogs in the date range (using the corrected overlap logic)
	timeLogs, err := s.timeLogRepo.FindByDateRange(userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Collect timelog IDs
	timeLogIDs := make([]uint, 0, len(timeLogs))
	for _, tl := range timeLogs {
		timeLogIDs = append(timeLogIDs, tl.ID)
	}

	// Get screenshots for these timelogs
	var screenshots []models.Screenshot
	if len(timeLogIDs) > 0 {
		screenshots, err = s.screenshotRepo.FindByTimeLogIDs(timeLogIDs)
		if err != nil {
			return nil, err
		}
	}

	// Calculate stats
	totalCount := len(screenshots)
	var totalSize int64
	screenshotsByDate := make(map[string]int)
	screenshotsByTask := make(map[uint]int)
	uniqueTimeLogs := make(map[uint]bool)

	for _, screenshot := range screenshots {
		totalSize += screenshot.FileSize

		// Group by date
		date := screenshot.CapturedAt.Format("2006-01-02")
		screenshotsByDate[date]++

		// Group by task
		if screenshot.TaskID != nil {
			screenshotsByTask[*screenshot.TaskID]++
		}

		// Track unique timelogs for avg calculation
		if screenshot.TimeLogID != nil {
			uniqueTimeLogs[*screenshot.TimeLogID] = true
		}
	}

	// Calculate average per session
	avgPerSession := 0.0
	sessionCount := len(timeLogs) // Use actual timelog count from date range
	if sessionCount > 0 {
		avgPerSession = float64(totalCount) / float64(sessionCount)
	}

	stats := map[string]interface{}{
		"total_count":         totalCount,
		"total_size":          totalSize,
		"total_size_bytes":    totalSize,
		"total_size_mb":       float64(totalSize) / (1024 * 1024),
		"avg_per_session":     avgPerSession,
		"session_count":       sessionCount,
		"screenshots_by_date": screenshotsByDate,
		"screenshots_by_task": screenshotsByTask,
		"start_date":          startDate.Format("2006-01-02"),
		"end_date":            endDate.Format("2006-01-02"),
	}

	return stats, nil
}

// GetTodayScreenshotCount returns the count of screenshots captured today
func (s *screenshotService) GetTodayScreenshotCount(userID uint) (int64, error) {
	return s.screenshotRepo.CountTodayScreenshots(userID)
}
