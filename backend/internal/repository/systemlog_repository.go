package repository

import (
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
	"time"
)

// SystemLogRepository handles system log persistence.
type SystemLogRepository interface {
	Create(systemLog *models.SystemLog) error
	CreateBatch(systemLogs []models.SystemLog) error
	DeleteOlderThan(cutoff time.Time) (int64, error)
}

type systemLogRepository struct {
	db *gorm.DB
}

// NewSystemLogRepository creates a new system log repository.
func NewSystemLogRepository(db *gorm.DB) SystemLogRepository {
	return &systemLogRepository{db: db}
}

func (r *systemLogRepository) Create(systemLog *models.SystemLog) error {
	return r.db.Create(systemLog).Error
}

func (r *systemLogRepository) CreateBatch(systemLogs []models.SystemLog) error {
	if len(systemLogs) == 0 {
		return nil
	}
	return r.db.Create(&systemLogs).Error
}

func (r *systemLogRepository) DeleteOlderThan(cutoff time.Time) (int64, error) {
	result := r.db.Where("occurred_at < ?", cutoff).Delete(&models.SystemLog{})
	return result.RowsAffected, result.Error
}
