package repository

import (
	"errors"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// UserRepository handles user data operations
type UserRepository interface {
	Create(user *models.User) error
	FindByID(id uint) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	Update(user *models.User) error
	Delete(id uint) error
	List(page, perPage int) ([]models.User, int64, error)
	UpdateLastLogin(id uint) error

	// Additional methods for admin
	FindAllPaginated(limit, offset int) ([]models.User, int64, error)
	Count() (int64, error)
	IsSystemAdmin(userID uint) (bool, error)
	CountBySystemRole(role string) (int64, error)
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

func (r *userRepository) List(page, perPage int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Offset(offset).Limit(perPage).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepository) UpdateLastLogin(id uint) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("last_login_at", gorm.Expr("NOW()")).Error
}

func (r *userRepository) FindAllPaginated(limit, offset int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	if err := r.db.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.User{}).Count(&count).Error
	return count, err
}

func (r *userRepository) IsSystemAdmin(userID uint) (bool, error) {
	var user models.User
	err := r.db.Select("role", "system_role").Where("id = ?", userID).First(&user).Error
	if err != nil {
		return false, err
	}
	return user.Role == "admin" || user.SystemRole == "admin", nil
}

// CountBySystemRole counts users by system_role
func (r *userRepository) CountBySystemRole(role string) (int64, error) {
	var count int64
	err := r.db.Model(&models.User{}).
		Where("system_role = ? AND deleted_at IS NULL", role).
		Count(&count).Error
	return count, err
}
