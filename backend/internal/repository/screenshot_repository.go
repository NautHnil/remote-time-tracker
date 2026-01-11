package repository

import (
	"errors"
	"os"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// ScreenshotRepository handles screenshot data operations
type ScreenshotRepository interface {
	Create(screenshot *models.Screenshot) error
	FindByID(id uint) (*models.Screenshot, error)
	FindByLocalID(localID string, userID uint) (*models.Screenshot, error)
	FindByUserID(userID uint, page, perPage int) ([]models.Screenshot, int64, error)
	FindByTimeLogID(timeLogID uint) ([]models.Screenshot, error)
	FindByTimeLogIDs(timeLogIDs []uint) ([]models.Screenshot, error)
	FindByTaskID(taskID uint, userID uint) ([]models.Screenshot, error)
	FindByTaskIDOrLocalID(taskID uint, taskLocalID string, userID uint) ([]models.Screenshot, error)
	Update(screenshot *models.Screenshot) error
	Delete(id uint) error
	DeleteFile(filePath string) error
	BatchCreate(screenshots []models.Screenshot) error
	FindByDateRange(userID uint, startDate, endDate time.Time) ([]models.Screenshot, error)
	DeleteOldScreenshots(beforeDate time.Time) error
	CountTodayScreenshots(userID uint) (int64, error)
}

type screenshotRepository struct {
	db *gorm.DB
}

// NewScreenshotRepository creates a new screenshot repository
func NewScreenshotRepository(db *gorm.DB) ScreenshotRepository {
	return &screenshotRepository{db: db}
}

func (r *screenshotRepository) Create(screenshot *models.Screenshot) error {
	return r.db.Create(screenshot).Error
}

func (r *screenshotRepository) FindByID(id uint) (*models.Screenshot, error) {
	var screenshot models.Screenshot
	if err := r.db.Preload("User").Preload("TimeLog").Preload("Device").
		First(&screenshot, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("screenshot not found")
		}
		return nil, err
	}
	return &screenshot, nil
}

func (r *screenshotRepository) FindByLocalID(localID string, userID uint) (*models.Screenshot, error) {
	var screenshot models.Screenshot
	if err := r.db.Where("local_id = ? AND user_id = ?", localID, userID).
		First(&screenshot).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &screenshot, nil
}

func (r *screenshotRepository) FindByUserID(userID uint, page, perPage int) ([]models.Screenshot, int64, error) {
	var screenshots []models.Screenshot
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.Screenshot{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("user_id = ?", userID).
		Offset(offset).
		Limit(perPage).
		Order("captured_at DESC").
		Find(&screenshots).Error; err != nil {
		return nil, 0, err
	}

	return screenshots, total, nil
}

func (r *screenshotRepository) FindByTimeLogID(timeLogID uint) ([]models.Screenshot, error) {
	var screenshots []models.Screenshot
	if err := r.db.Where("time_log_id = ?", timeLogID).
		Order("captured_at ASC").
		Find(&screenshots).Error; err != nil {
		return nil, err
	}
	return screenshots, nil
}

func (r *screenshotRepository) FindByTimeLogIDs(timeLogIDs []uint) ([]models.Screenshot, error) {
	var screenshots []models.Screenshot
	if len(timeLogIDs) == 0 {
		return screenshots, nil
	}
	if err := r.db.Where("time_log_id IN ?", timeLogIDs).
		Order("captured_at DESC").
		Find(&screenshots).Error; err != nil {
		return nil, err
	}
	return screenshots, nil
}

func (r *screenshotRepository) FindByTaskID(taskID uint, userID uint) ([]models.Screenshot, error) {
	var screenshots []models.Screenshot
	if err := r.db.Where("task_id = ? AND user_id = ?", taskID, userID).
		Order("captured_at DESC").
		Find(&screenshots).Error; err != nil {
		return nil, err
	}
	return screenshots, nil
}

// FindByTaskIDOrLocalID finds screenshots by task_id OR task_local_id
// This handles both new data (task_local_id) and old data (task_id)
func (r *screenshotRepository) FindByTaskIDOrLocalID(taskID uint, taskLocalID string, userID uint) ([]models.Screenshot, error) {
	var screenshots []models.Screenshot

	// Query: (task_id = X OR task_local_id = Y) AND user_id = Z
	query := r.db.Where("user_id = ?", userID)

	if taskLocalID != "" {
		// Prefer task_local_id (UUID) for new data
		query = query.Where("task_local_id = ? OR task_id = ?", taskLocalID, taskID)
	} else {
		// Fallback to task_id only if no local_id
		query = query.Where("task_id = ?", taskID)
	}

	if err := query.Order("captured_at DESC").Find(&screenshots).Error; err != nil {
		return nil, err
	}

	return screenshots, nil
}

func (r *screenshotRepository) Update(screenshot *models.Screenshot) error {
	return r.db.Save(screenshot).Error
}

func (r *screenshotRepository) Delete(id uint) error {
	return r.db.Delete(&models.Screenshot{}, id).Error
}

// DeleteFile deletes a screenshot file from disk
func (r *screenshotRepository) DeleteFile(filePath string) error {
	if filePath == "" {
		return nil
	}

	// Import os package at the top if not already imported
	// Try to delete the file, ignore errors if file doesn't exist
	if err := deleteFileIfExists(filePath); err != nil {
		return err
	}

	return nil
}

func (r *screenshotRepository) BatchCreate(screenshots []models.Screenshot) error {
	if len(screenshots) == 0 {
		return nil
	}
	return r.db.CreateInBatches(screenshots, 50).Error
}

func (r *screenshotRepository) FindByDateRange(userID uint, startDate, endDate time.Time) ([]models.Screenshot, error) {
	var screenshots []models.Screenshot
	if err := r.db.Where("user_id = ? AND captured_at >= ? AND captured_at <= ?",
		userID, startDate, endDate).
		Order("captured_at DESC").
		Find(&screenshots).Error; err != nil {
		return nil, err
	}
	return screenshots, nil
}

func (r *screenshotRepository) DeleteOldScreenshots(beforeDate time.Time) error {
	return r.db.Where("captured_at < ?", beforeDate).Delete(&models.Screenshot{}).Error
}

// CountTodayScreenshots counts screenshots captured today for a user
func (r *screenshotRepository) CountTodayScreenshots(userID uint) (int64, error) {
	var count int64

	// Get today's date range (00:00:00 to 23:59:59)
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, now.Location())

	err := r.db.Model(&models.Screenshot{}).
		Where("user_id = ? AND captured_at >= ? AND captured_at <= ?", userID, startOfDay, endOfDay).
		Count(&count).Error

	return count, err
}

// Helper function to delete file if exists
func deleteFileIfExists(filePath string) error {
	if _, err := os.Stat(filePath); err == nil {
		// File exists, delete it
		return os.Remove(filePath)
	} else if os.IsNotExist(err) {
		// File doesn't exist, nothing to do
		return nil
	} else {
		// Some other error checking file
		return err
	}
}
