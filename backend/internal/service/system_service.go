package service

import (
	"errors"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// SystemService handles system-level operations
type SystemService interface {
	// Admin initialization
	InitializeAdmin(req *dto.InitAdminRequest) (*models.User, error)
	HasSystemAdmin() (bool, error)
	CountSystemAdmins() (int64, error)
}

type systemService struct {
	userRepo repository.UserRepository
}

// NewSystemService creates a new system service
func NewSystemService(userRepo repository.UserRepository) SystemService {
	return &systemService{
		userRepo: userRepo,
	}
}

// HasSystemAdmin checks if system admin exists
func (s *systemService) HasSystemAdmin() (bool, error) {
	count, err := s.CountSystemAdmins()
	return count > 0, err
}

// CountSystemAdmins counts users with system_role = 'admin'
func (s *systemService) CountSystemAdmins() (int64, error) {
	return s.userRepo.CountBySystemRole(models.SystemRoleAdmin)
}

// InitializeAdmin creates the first system admin
func (s *systemService) InitializeAdmin(req *dto.InitAdminRequest) (*models.User, error) {
	// Check if admin already exists
	hasAdmin, err := s.HasSystemAdmin()
	if err != nil {
		return nil, err
	}
	if hasAdmin {
		return nil, errors.New("system admin already exists")
	}

	// Check if email already exists
	existingUser, _ := s.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create admin user
	admin := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         "admin",
		SystemRole:   models.SystemRoleAdmin,
		IsActive:     true,
	}

	if err := s.userRepo.Create(admin); err != nil {
		return nil, errors.New("failed to create admin user: " + err.Error())
	}

	return admin, nil
}
