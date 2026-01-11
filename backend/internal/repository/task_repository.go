package repository

import (
	"errors"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/models"
	"gorm.io/gorm"
)

// TaskRepository handles task data operations
type TaskRepository interface {
	Create(task *models.Task) error
	FindByID(id uint) (*models.Task, error)
	FindByLocalID(localID string, userID uint) (*models.Task, error)
	FindByUserID(userID uint, page, perPage int) ([]models.Task, int64, error)
	FindByUserIDAndTitle(userID uint, title string) (*models.Task, error)
	FindByUserIDWithStats(userID uint, page, perPage int) ([]map[string]interface{}, int64, error)
	FindActiveByUserIDWithStats(userID uint) ([]map[string]interface{}, error)
	Update(task *models.Task) error
	Delete(id uint) error
	FindActiveByUserID(userID uint) ([]models.Task, error)
}

type taskRepository struct {
	db *gorm.DB
}

// NewTaskRepository creates a new task repository
func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) Create(task *models.Task) error {
	return r.db.Create(task).Error
}

func (r *taskRepository) FindByID(id uint) (*models.Task, error) {
	var task models.Task
	if err := r.db.Preload("User").First(&task, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("task not found")
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) FindByLocalID(localID string, userID uint) (*models.Task, error) {
	var task models.Task
	if err := r.db.Where("local_id = ? AND user_id = ?", localID, userID).First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Not found is not an error
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) FindByUserID(userID uint, page, perPage int) ([]models.Task, int64, error) {
	var tasks []models.Task
	var total int64

	offset := (page - 1) * perPage

	if err := r.db.Model(&models.Task{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("user_id = ?", userID).
		Offset(offset).
		Limit(perPage).
		Order("created_at DESC").
		Find(&tasks).Error; err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

func (r *taskRepository) FindByUserIDAndTitle(userID uint, title string) (*models.Task, error) {
	var task models.Task
	if err := r.db.Where("user_id = ? AND title = ?", userID, title).First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Not found is not an error
		}
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) Update(task *models.Task) error {
	return r.db.Save(task).Error
}

func (r *taskRepository) Delete(id uint) error {
	return r.db.Delete(&models.Task{}, id).Error
}

func (r *taskRepository) FindActiveByUserID(userID uint) ([]models.Task, error) {
	var tasks []models.Task
	if err := r.db.Where("user_id = ? AND status = ?", userID, "active").
		Order("priority DESC, created_at DESC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

// TaskWithStatsRow represents a row from the SQL query with stats
type TaskWithStatsRow struct {
	ID              uint      `gorm:"column:id"`
	Title           string    `gorm:"column:title"`
	Description     *string   `gorm:"column:description"` // Nullable
	Status          string    `gorm:"column:status"`
	Priority        int       `gorm:"column:priority"`
	Color           *string   `gorm:"column:color"` // Nullable
	IsManual        bool      `gorm:"column:is_manual"`
	CreatedAt       time.Time `gorm:"column:created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at"`
	Duration        int64     `gorm:"column:duration"`
	ScreenshotCount int64     `gorm:"column:screenshot_count"`
}

func (r *taskRepository) FindByUserIDWithStats(userID uint, page, perPage int) ([]map[string]interface{}, int64, error) {
	var total int64
	offset := (page - 1) * perPage

	// Count total
	if err := r.db.Model(&models.Task{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Query with aggregated stats using simpler direct JOIN
	// Match by task_local_id = t.local_id OR task_id = t.id
	var rows []TaskWithStatsRow
	query := `
		SELECT 
			t.id,
			t.title,
			t.description,
			t.status,
			t.priority,
			t.color,
			t.is_manual,
			t.created_at,
			t.updated_at,
			COALESCE(
				(SELECT SUM(tl.duration) 
				 FROM time_logs tl 
				 WHERE tl.deleted_at IS NULL 
				   AND (
				     (tl.task_local_id IS NOT NULL AND tl.task_local_id != '' AND tl.task_local_id = t.local_id)
				     OR (tl.task_id = t.id)
				   )
				), 0
			) as duration,
			COALESCE(
				(SELECT COUNT(s.id) 
				 FROM screenshots s 
				 WHERE s.deleted_at IS NULL 
				   AND (
				     (s.task_local_id IS NOT NULL AND s.task_local_id != '' AND s.task_local_id = t.local_id)
				     OR (s.task_id = t.id)
				   )
				), 0
			) as screenshot_count
		FROM tasks t
		WHERE t.user_id = ? AND t.deleted_at IS NULL
		ORDER BY t.created_at DESC
		LIMIT ? OFFSET ?
	`

	if err := r.db.Raw(query, userID, perPage, offset).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	// Convert to map for backward compatibility
	results := make([]map[string]interface{}, len(rows))
	for i, row := range rows {
		desc := ""
		if row.Description != nil {
			desc = *row.Description
		}
		color := ""
		if row.Color != nil {
			color = *row.Color
		}

		results[i] = map[string]interface{}{
			"id":               row.ID,
			"title":            row.Title,
			"description":      desc,
			"status":           row.Status,
			"priority":         row.Priority,
			"color":            color,
			"is_manual":        row.IsManual,
			"created_at":       row.CreatedAt,
			"updated_at":       row.UpdatedAt,
			"duration":         row.Duration,
			"screenshot_count": row.ScreenshotCount,
		}
	}

	return results, total, nil
}

func (r *taskRepository) FindActiveByUserIDWithStats(userID uint) ([]map[string]interface{}, error) {
	var rows []TaskWithStatsRow
	query := `
		SELECT 
			t.id,
			t.title,
			t.description,
			t.status,
			t.priority,
			t.color,
			t.is_manual,
			t.created_at,
			t.updated_at,
			COALESCE(
				(SELECT SUM(tl.duration) 
				 FROM time_logs tl 
				 WHERE tl.deleted_at IS NULL 
				   AND (
				     (tl.task_local_id IS NOT NULL AND tl.task_local_id != '' AND tl.task_local_id = t.local_id)
				     OR (tl.task_id = t.id)
				   )
				), 0
			) as duration,
			COALESCE(
				(SELECT COUNT(s.id) 
				 FROM screenshots s 
				 WHERE s.deleted_at IS NULL 
				   AND (
				     (s.task_local_id IS NOT NULL AND s.task_local_id != '' AND s.task_local_id = t.local_id)
				     OR (s.task_id = t.id)
				   )
				), 0
			) as screenshot_count
		FROM tasks t
		WHERE t.user_id = ? AND t.status = 'active' AND t.deleted_at IS NULL
		ORDER BY t.priority DESC, t.created_at DESC
	`

	if err := r.db.Raw(query, userID).Scan(&rows).Error; err != nil {
		return nil, err
	}

	// Convert to map for backward compatibility
	results := make([]map[string]interface{}, len(rows))
	for i, row := range rows {
		desc := ""
		if row.Description != nil {
			desc = *row.Description
		}
		color := ""
		if row.Color != nil {
			color = *row.Color
		}

		results[i] = map[string]interface{}{
			"id":               row.ID,
			"title":            row.Title,
			"description":      desc,
			"status":           row.Status,
			"priority":         row.Priority,
			"color":            color,
			"is_manual":        row.IsManual,
			"created_at":       row.CreatedAt,
			"updated_at":       row.UpdatedAt,
			"duration":         row.Duration,
			"screenshot_count": row.ScreenshotCount,
		}
	}

	return results, nil
}
