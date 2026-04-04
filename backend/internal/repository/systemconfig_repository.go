package repository

import (
	"gorm.io/gorm"
	"remote-time-tracker.dev/internal/models"
)

// SystemConfigRepository handles persisted system-wide config values.
type SystemConfigRepository interface {
	FindByKey(key string) (*models.SystemConfig, error)
	FindByKeys(keys []string) ([]models.SystemConfig, error)
	Upsert(config *models.SystemConfig) error
}

type systemConfigRepository struct {
	db *gorm.DB
}

// NewSystemConfigRepository creates a new system config repository.
func NewSystemConfigRepository(db *gorm.DB) SystemConfigRepository {
	return &systemConfigRepository{db: db}
}

func (r *systemConfigRepository) FindByKey(key string) (*models.SystemConfig, error) {
	var config models.SystemConfig
	if err := r.db.Where("key = ?", key).First(&config).Error; err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *systemConfigRepository) FindByKeys(keys []string) ([]models.SystemConfig, error) {
	var configs []models.SystemConfig
	if len(keys) == 0 {
		return configs, nil
	}
	if err := r.db.Where("key IN ?", keys).Find(&configs).Error; err != nil {
		return nil, err
	}
	return configs, nil
}

func (r *systemConfigRepository) Upsert(config *models.SystemConfig) error {
	return r.db.
		Where(models.SystemConfig{Key: config.Key}).
		Assign(models.SystemConfig{
			Value:       config.Value,
			ValueType:   config.ValueType,
			Description: config.Description,
		}).
		FirstOrCreate(config).Error
}
