package service

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type SystemConfigEntry struct {
	Key         string
	Label       string
	Description string
	Category    string
	ValueType   string
	Value       string
	Default     string
	UpdatedAt   *time.Time
}

// SystemService handles system-level operations
type SystemService interface {
	// Admin initialization
	InitializeAdmin(req *dto.InitAdminRequest) (*models.User, error)
	HasSystemAdmin() (bool, error)
	CountSystemAdmins() (int64, error)
	ListSystemConfigs() ([]SystemConfigEntry, error)
	UpdateSystemConfig(key string, value string) (*SystemConfigEntry, error)
}

type systemService struct {
	userRepo         repository.UserRepository
	configRepo       repository.SystemConfigRepository
	systemLogService SystemLogService
}

// NewSystemService creates a new system service
func NewSystemService(
	userRepo repository.UserRepository,
	configRepo repository.SystemConfigRepository,
	systemLogService SystemLogService,
) SystemService {
	return &systemService{
		userRepo:         userRepo,
		configRepo:       configRepo,
		systemLogService: systemLogService,
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

func (s *systemService) ListSystemConfigs() ([]SystemConfigEntry, error) {
	definitions := supportedSystemConfigDefinitions()
	if s.configRepo == nil {
		entries := make([]SystemConfigEntry, 0, len(definitions))
		for _, definition := range definitions {
			entries = append(entries, SystemConfigEntry{
				Key:         definition.Key,
				Label:       definition.Label,
				Description: definition.Description,
				Category:    definition.Category,
				ValueType:   definition.ValueType,
				Value:       definition.DefaultValue,
				Default:     definition.DefaultValue,
			})
		}
		return entries, nil
	}

	keys := make([]string, 0, len(definitions))
	for _, definition := range definitions {
		keys = append(keys, definition.Key)
	}

	persistedConfigs, err := s.configRepo.FindByKeys(keys)
	if err != nil {
		return nil, err
	}

	persistedByKey := make(map[string]models.SystemConfig, len(persistedConfigs))
	for _, persisted := range persistedConfigs {
		persistedByKey[persisted.Key] = persisted
	}

	entries := make([]SystemConfigEntry, 0, len(definitions))
	for _, definition := range definitions {
		entry := SystemConfigEntry{
			Key:         definition.Key,
			Label:       definition.Label,
			Description: definition.Description,
			Category:    definition.Category,
			ValueType:   definition.ValueType,
			Value:       definition.DefaultValue,
			Default:     definition.DefaultValue,
		}

		if persisted, ok := persistedByKey[definition.Key]; ok {
			entry.Value = persisted.Value
			entry.UpdatedAt = &persisted.UpdatedAt
		}

		entries = append(entries, entry)
	}

	return entries, nil
}

func (s *systemService) UpdateSystemConfig(key string, value string) (*SystemConfigEntry, error) {
	definition, ok := supportedSystemConfigDefinitionByKey(key)
	if !ok {
		return nil, errors.New("unsupported system config key")
	}
	if s.configRepo == nil {
		return nil, errors.New("system config repository is not available")
	}

	normalizedValue, err := validateSystemConfigValue(definition, value)
	if err != nil {
		return nil, err
	}

	configModel := &models.SystemConfig{
		Key:         definition.Key,
		Value:       normalizedValue,
		ValueType:   definition.ValueType,
		Description: definition.Description,
	}

	if err := s.configRepo.Upsert(configModel); err != nil {
		return nil, err
	}

	if err := s.applyRuntimeSystemConfig(definition.Key, normalizedValue); err != nil {
		return nil, err
	}

	persisted, err := s.configRepo.FindByKey(definition.Key)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	entry := &SystemConfigEntry{
		Key:         definition.Key,
		Label:       definition.Label,
		Description: definition.Description,
		Category:    definition.Category,
		ValueType:   definition.ValueType,
		Value:       normalizedValue,
		Default:     definition.DefaultValue,
	}
	if persisted != nil {
		entry.UpdatedAt = &persisted.UpdatedAt
	}

	return entry, nil
}

type systemConfigDefinition struct {
	Key          string
	Label        string
	Description  string
	Category     string
	ValueType    string
	DefaultValue string
}

func supportedSystemConfigDefinitions() []systemConfigDefinition {
	return []systemConfigDefinition{
		{
			Key:          "system_log_retention_days",
			Label:        "System Log Retention Days",
			Description:  "How many days system logs are kept before automatic cleanup removes expired entries.",
			Category:     "logging",
			ValueType:    "int",
			DefaultValue: strconv.Itoa(config.AppConfig.Log.SystemLogRetentionDays),
		},
		{
			Key:          "system_log_cleanup_interval",
			Label:        "System Log Cleanup Interval",
			Description:  "How often the backend retention worker scans and deletes expired system logs.",
			Category:     "logging",
			ValueType:    "duration",
			DefaultValue: config.AppConfig.Log.SystemLogCleanupInterval.String(),
		},
	}
}

func supportedSystemConfigDefinitionByKey(key string) (systemConfigDefinition, bool) {
	for _, definition := range supportedSystemConfigDefinitions() {
		if definition.Key == key {
			return definition, true
		}
	}
	return systemConfigDefinition{}, false
}

func validateSystemConfigValue(definition systemConfigDefinition, value string) (string, error) {
	switch definition.Key {
	case "system_log_retention_days":
		retentionDays, err := strconv.Atoi(value)
		if err != nil {
			return "", errors.New("retention_days must be a valid integer")
		}
		if retentionDays < 1 {
			return "", errors.New("retention_days must be at least 1")
		}
		return strconv.Itoa(retentionDays), nil
	case "system_log_cleanup_interval":
		interval, err := time.ParseDuration(value)
		if err != nil {
			return "", errors.New("cleanup_interval must be a valid duration")
		}
		if interval < time.Minute {
			return "", errors.New("cleanup_interval must be at least 1m")
		}
		return interval.String(), nil
	default:
		return "", fmt.Errorf("unsupported system config key: %s", definition.Key)
	}
}

func (s *systemService) applyRuntimeSystemConfig(updatedKey string, updatedValue string) error {
	if s.systemLogService == nil {
		return nil
	}

	if updatedKey != "system_log_retention_days" && updatedKey != "system_log_cleanup_interval" {
		return nil
	}

	policy := s.systemLogService.GetRetentionPolicy()
	retentionDays := policy.RetentionDays
	cleanupInterval := policy.CleanupInterval

	switch updatedKey {
	case "system_log_retention_days":
		parsed, err := strconv.Atoi(updatedValue)
		if err != nil {
			return err
		}
		retentionDays = parsed
	case "system_log_cleanup_interval":
		parsed, err := time.ParseDuration(updatedValue)
		if err != nil {
			return err
		}
		cleanupInterval = parsed
	}

	s.systemLogService.UpdateRetentionPolicy(retentionDays, cleanupInterval)
	config.AppConfig.Log.SystemLogRetentionDays = retentionDays
	config.AppConfig.Log.SystemLogCleanupInterval = cleanupInterval

	return nil
}
