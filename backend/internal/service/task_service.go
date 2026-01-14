package service

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/google/uuid"
)

// TaskService handles task business logic
type TaskService interface {
	Create(userID uint, req *dto.CreateTaskRequest) (*models.Task, error)
	GetByID(id, userID uint) (*models.Task, error)
	GetByUserID(userID uint, page, perPage int) ([]dto.TaskWithStats, int64, error)
	Update(id, userID uint, req *dto.UpdateTaskRequest) (*models.Task, error)
	Delete(id, userID uint) error
	GetActiveTasks(userID uint) ([]dto.TaskWithStats, error)
}

type taskService struct {
	taskRepo repository.TaskRepository
}

// NewTaskService creates a new task service
func NewTaskService(taskRepo repository.TaskRepository) TaskService {
	return &taskService{
		taskRepo: taskRepo,
	}
}

func (s *taskService) Create(userID uint, req *dto.CreateTaskRequest) (*models.Task, error) {
	// Generate LocalID (UUID) if not provided
	localID := uuid.New().String()

	task := &models.Task{
		UserID:         userID,
		OrganizationID: req.OrganizationID, // Set organization context
		WorkspaceID:    req.WorkspaceID,    // Set workspace context
		LocalID:        localID,            // Auto-generate UUID for LocalID
		Title:          req.Title,
		Description:    req.Description,
		Priority:       req.Priority,
		Color:          req.Color,
		Status:         "active",
		IsManual:       req.IsManual, // Set from request
	}

	if err := s.taskRepo.Create(task); err != nil {
		return nil, errors.New("failed to create task")
	}

	return task, nil
}

func (s *taskService) GetByID(id, userID uint) (*models.Task, error) {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check if task belongs to user
	if task.UserID != userID {
		return nil, errors.New("unauthorized access to task")
	}

	return task, nil
}

func (s *taskService) GetByUserID(userID uint, page, perPage int) ([]dto.TaskWithStats, int64, error) {
	results, total, err := s.taskRepo.FindByUserIDWithStats(userID, page, perPage)
	if err != nil {
		return nil, 0, err
	}

	// Convert to TaskWithStats
	tasksWithStats := make([]dto.TaskWithStats, len(results))
	for i, result := range results {
		task, err := mapToTaskWithStats(result)
		if err != nil {
			return nil, 0, err
		}
		tasksWithStats[i] = task
	}

	return tasksWithStats, total, nil
}

func (s *taskService) Update(id, userID uint, req *dto.UpdateTaskRequest) (*models.Task, error) {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Check if task belongs to user
	if task.UserID != userID {
		return nil, errors.New("unauthorized access to task")
	}

	// Update fields if provided
	if req.Title != "" {
		task.Title = req.Title
	}
	if req.Description != "" {
		task.Description = req.Description
	}
	if req.Status != "" {
		task.Status = req.Status
	}
	if req.Priority > 0 {
		task.Priority = req.Priority
	}
	if req.Color != "" {
		task.Color = req.Color
	}
	if req.IsManual != nil {
		task.IsManual = *req.IsManual
	}

	if err := s.taskRepo.Update(task); err != nil {
		return nil, errors.New("failed to update task")
	}

	return task, nil
}

func (s *taskService) Delete(id, userID uint) error {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Check if task belongs to user
	if task.UserID != userID {
		return errors.New("unauthorized access to task")
	}

	return s.taskRepo.Delete(id)
}

func (s *taskService) GetActiveTasks(userID uint) ([]dto.TaskWithStats, error) {
	results, err := s.taskRepo.FindActiveByUserIDWithStats(userID)
	if err != nil {
		return nil, err
	}

	// Convert to TaskWithStats
	tasksWithStats := make([]dto.TaskWithStats, len(results))
	for i, result := range results {
		task, err := mapToTaskWithStats(result)
		if err != nil {
			return nil, err
		}
		tasksWithStats[i] = task
	}

	return tasksWithStats, nil
}

// Helper function to safely convert map to TaskWithStats
func mapToTaskWithStats(m map[string]interface{}) (dto.TaskWithStats, error) {
	task := dto.TaskWithStats{}

	// Safe type conversions with fallbacks
	if id, ok := m["id"].(int64); ok {
		task.ID = uint(id)
	} else if id, ok := m["id"].(uint); ok {
		task.ID = id
	}

	if title, ok := m["title"].(string); ok {
		task.Title = title
	}

	if desc, ok := m["description"].(string); ok {
		task.Description = desc
	}

	if status, ok := m["status"].(string); ok {
		task.Status = status
	}

	if priority, ok := m["priority"].(int64); ok {
		task.Priority = int(priority)
	} else if priority, ok := m["priority"].(int); ok {
		task.Priority = priority
	}

	if color, ok := m["color"].(string); ok {
		task.Color = color
	}

	if isManual, ok := m["is_manual"].(bool); ok {
		task.IsManual = isManual
	}

	// Organization ID
	if orgID, ok := m["organization_id"].(int64); ok {
		orgIDUint := uint(orgID)
		task.OrganizationID = &orgIDUint
	} else if orgID, ok := m["organization_id"].(uint); ok {
		task.OrganizationID = &orgID
	}

	// Workspace ID
	if wsID, ok := m["workspace_id"].(int64); ok {
		wsIDUint := uint(wsID)
		task.WorkspaceID = &wsIDUint
	} else if wsID, ok := m["workspace_id"].(uint); ok {
		task.WorkspaceID = &wsID
	}

	// Duration - can be int64 or float64 from SQL
	if duration, ok := m["duration"].(int64); ok {
		task.Duration = duration
	} else if duration, ok := m["duration"].(float64); ok {
		task.Duration = int64(duration)
	}

	// Screenshot count
	if count, ok := m["screenshot_count"].(int64); ok {
		task.ScreenshotCount = count
	} else if count, ok := m["screenshot_count"].(float64); ok {
		task.ScreenshotCount = int64(count)
	}

	if createdAt, ok := m["created_at"].(time.Time); ok {
		task.CreatedAt = createdAt
	}

	if updatedAt, ok := m["updated_at"].(time.Time); ok {
		task.UpdatedAt = updatedAt
	}

	return task, nil
}
