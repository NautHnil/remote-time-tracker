package repository

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// TimeLogRepository handles time log data operations
type TimeLogRepository interface {
	Create(timeLog *models.TimeLog) error
	FindByID(id uint) (*models.TimeLog, error)
	FindByLocalID(localID string, userID uint) (*models.TimeLog, error)
	FindByUserID(userID uint, page, perPage int) ([]models.TimeLog, int64, error)
	FindActiveByUserID(userID uint) (*models.TimeLog, error)
	FindByTaskID(taskID uint) ([]models.TimeLog, error)
	Update(timeLog *models.TimeLog) error
	Delete(id uint) error
	FindByDateRange(userID uint, startDate, endDate time.Time) ([]models.TimeLog, error)
	BatchCreate(timeLogs []models.TimeLog) error
	GetTotalTimeByUser(userID uint, startDate, endDate time.Time) (int64, error)
}

type timeLogRepository struct {
	db *gorm.DB
}

// NewTimeLogRepository creates a new time log repository
func NewTimeLogRepository(db *gorm.DB) TimeLogRepository {
	return &timeLogRepository{db: db}
}

func (r *timeLogRepository) Create(timeLog *models.TimeLog) error {
	return r.db.Create(timeLog).Error
}

func (r *timeLogRepository) FindByID(id uint) (*models.TimeLog, error) {
	var timeLog models.TimeLog
	if err := r.db.Preload("User").Preload("Task").Preload("Device").
		First(&timeLog, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("time log not found")
		}
		return nil, err
	}
	return &timeLog, nil
}

func (r *timeLogRepository) FindByLocalID(localID string, userID uint) (*models.TimeLog, error) {
	var timeLog models.TimeLog
	if err := r.db.Where("local_id = ? AND user_id = ?", localID, userID).
		First(&timeLog).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil without error if not found
		}
		return nil, err
	}
	return &timeLog, nil
}

func (r *timeLogRepository) FindByUserID(userID uint, page, perPage int) ([]models.TimeLog, int64, error) {
	var timeLogs []models.TimeLog
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.TimeLog{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("user_id = ?", userID).
		Preload("Task").
		Preload("Device").
		Offset(offset).
		Limit(perPage).
		Order("start_time DESC").
		Find(&timeLogs).Error; err != nil {
		return nil, 0, err
	}

	return timeLogs, total, nil
}

func (r *timeLogRepository) FindActiveByUserID(userID uint) (*models.TimeLog, error) {
	var timeLog models.TimeLog
	if err := r.db.Where("user_id = ? AND status IN ?", userID, []string{"running", "paused"}).
		Order("start_time DESC").
		First(&timeLog).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &timeLog, nil
}

func (r *timeLogRepository) FindByTaskID(taskID uint) ([]models.TimeLog, error) {
	var timeLogs []models.TimeLog
	if err := r.db.Where("task_id = ?", taskID).
		Order("start_time DESC").
		Find(&timeLogs).Error; err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (r *timeLogRepository) Update(timeLog *models.TimeLog) error {
	return r.db.Save(timeLog).Error
}

func (r *timeLogRepository) Delete(id uint) error {
	return r.db.Delete(&models.TimeLog{}, id).Error
}

func (r *timeLogRepository) FindByDateRange(userID uint, startDate, endDate time.Time) ([]models.TimeLog, error) {
	var timeLogs []models.TimeLog

	// Set time range boundaries
	rangeStart := startDate
	rangeEnd := endDate.Add(24*time.Hour - time.Second) // End of endDate (23:59:59)

	// Find all STOPPED sessions where end_time (when completed) is within the date range
	// This ensures we only count completed sessions for statistics
	if err := r.db.Where("user_id = ?", userID).
		Where("status = ?", "stopped").
		Where("end_time >= ?", rangeStart).
		Where("end_time <= ?", rangeEnd).
		Preload("Task").
		Order("end_time DESC").
		Find(&timeLogs).Error; err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (r *timeLogRepository) BatchCreate(timeLogs []models.TimeLog) error {
	if len(timeLogs) == 0 {
		return nil
	}
	return r.db.CreateInBatches(timeLogs, 100).Error
}

func (r *timeLogRepository) GetTotalTimeByUser(userID uint, startDate, endDate time.Time) (int64, error) {
	var total int64

	// Set time range boundaries (start of startDate, end of endDate)
	rangeStart := startDate
	rangeEnd := endDate.Add(24*time.Hour - time.Second) // End of endDate (23:59:59)

	// Get all STOPPED sessions where end_time (when stopped) is within the date range
	// This counts sessions based on when they were completed, not when they started
	var stoppedSessions []models.TimeLog
	if err := r.db.Where("user_id = ?", userID).
		Where("status = ?", "stopped").
		Where("end_time >= ?", rangeStart).
		Where("end_time <= ?", rangeEnd).
		Find(&stoppedSessions).Error; err != nil {
		return 0, err
	}

	// Sum up duration from stopped sessions
	for _, session := range stoppedSessions {
		// Use the stored Duration field (already calculated when stopped)
		if session.Duration > 0 {
			total += session.Duration
		}
	}

	return total, nil
}
