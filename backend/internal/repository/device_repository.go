package repository

import (
	"errors"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// DeviceRepository handles device info data operations
type DeviceRepository interface {
	Create(device *models.DeviceInfo) error
	FindByID(id uint) (*models.DeviceInfo, error)
	FindByUUID(uuid string) (*models.DeviceInfo, error)
	FindByUserID(userID uint) ([]models.DeviceInfo, error)
	Update(device *models.DeviceInfo) error
	UpdateLastSeen(id uint) error
	Delete(id uint) error
}

type deviceRepository struct {
	db *gorm.DB
}

// NewDeviceRepository creates a new device repository
func NewDeviceRepository(db *gorm.DB) DeviceRepository {
	return &deviceRepository{db: db}
}

func (r *deviceRepository) Create(device *models.DeviceInfo) error {
	return r.db.Create(device).Error
}

func (r *deviceRepository) FindByID(id uint) (*models.DeviceInfo, error) {
	var device models.DeviceInfo
	if err := r.db.First(&device, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("device not found")
		}
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) FindByUUID(uuid string) (*models.DeviceInfo, error) {
	var device models.DeviceInfo
	if err := r.db.Where("device_uuid = ?", uuid).First(&device).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &device, nil
}

func (r *deviceRepository) FindByUserID(userID uint) ([]models.DeviceInfo, error) {
	var devices []models.DeviceInfo
	if err := r.db.Where("user_id = ?", userID).
		Order("last_seen_at DESC").
		Find(&devices).Error; err != nil {
		return nil, err
	}
	return devices, nil
}

func (r *deviceRepository) Update(device *models.DeviceInfo) error {
	return r.db.Save(device).Error
}

func (r *deviceRepository) UpdateLastSeen(id uint) error {
	return r.db.Model(&models.DeviceInfo{}).
		Where("id = ?", id).
		Update("last_seen_at", gorm.Expr("NOW()")).Error
}

func (r *deviceRepository) Delete(id uint) error {
	return r.db.Delete(&models.DeviceInfo{}, id).Error
}
