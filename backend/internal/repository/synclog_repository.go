package repository

import (
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// SyncLogRepository handles sync log data operations
type SyncLogRepository interface {
	Create(syncLog *models.SyncLog) error
	FindByID(id uint) (*models.SyncLog, error)
	FindByUserID(userID uint, page, perPage int) ([]models.SyncLog, int64, error)
	Update(syncLog *models.SyncLog) error
}

type syncLogRepository struct {
	db *gorm.DB
}

// NewSyncLogRepository creates a new sync log repository
func NewSyncLogRepository(db *gorm.DB) SyncLogRepository {
	return &syncLogRepository{db: db}
}

func (r *syncLogRepository) Create(syncLog *models.SyncLog) error {
	return r.db.Create(syncLog).Error
}

func (r *syncLogRepository) FindByID(id uint) (*models.SyncLog, error) {
	var syncLog models.SyncLog
	if err := r.db.Preload("User").Preload("Device").First(&syncLog, id).Error; err != nil {
		return nil, err
	}
	return &syncLog, nil
}

func (r *syncLogRepository) FindByUserID(userID uint, page, perPage int) ([]models.SyncLog, int64, error) {
	var syncLogs []models.SyncLog
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.SyncLog{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("user_id = ?", userID).
		Offset(offset).
		Limit(perPage).
		Order("started_at DESC").
		Find(&syncLogs).Error; err != nil {
		return nil, 0, err
	}

	return syncLogs, total, nil
}

func (r *syncLogRepository) Update(syncLog *models.SyncLog) error {
	return r.db.Save(syncLog).Error
}
