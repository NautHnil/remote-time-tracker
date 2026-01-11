package repository

import (
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// AuditLogRepository handles audit log data operations
type AuditLogRepository interface {
	Create(auditLog *models.AuditLog) error
	FindByUserID(userID uint, page, perPage int) ([]models.AuditLog, int64, error)
	FindByAction(action string, page, perPage int) ([]models.AuditLog, int64, error)
}

type auditLogRepository struct {
	db *gorm.DB
}

// NewAuditLogRepository creates a new audit log repository
func NewAuditLogRepository(db *gorm.DB) AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(auditLog *models.AuditLog) error {
	return r.db.Create(auditLog).Error
}

func (r *auditLogRepository) FindByUserID(userID uint, page, perPage int) ([]models.AuditLog, int64, error) {
	var auditLogs []models.AuditLog
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.AuditLog{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("user_id = ?", userID).
		Offset(offset).
		Limit(perPage).
		Order("created_at DESC").
		Find(&auditLogs).Error; err != nil {
		return nil, 0, err
	}

	return auditLogs, total, nil
}

func (r *auditLogRepository) FindByAction(action string, page, perPage int) ([]models.AuditLog, int64, error) {
	var auditLogs []models.AuditLog
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.AuditLog{}).Where("action = ?", action).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("action = ?", action).
		Offset(offset).
		Limit(perPage).
		Order("created_at DESC").
		Find(&auditLogs).Error; err != nil {
		return nil, 0, err
	}

	return auditLogs, total, nil
}
