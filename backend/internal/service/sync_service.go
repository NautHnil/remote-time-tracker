package service

import (
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
)

// SyncService handles synchronization logic
type SyncService interface {
	BatchSync(userID uint, req *dto.BatchSyncRequest) (*dto.BatchSyncResponse, error)
}

type syncService struct {
	timeLogRepo    repository.TimeLogRepository
	screenshotRepo repository.ScreenshotRepository
	deviceRepo     repository.DeviceRepository
	syncLogRepo    repository.SyncLogRepository
	taskRepo       repository.TaskRepository
}

// NewSyncService creates a new sync service
func NewSyncService(
	timeLogRepo repository.TimeLogRepository,
	screenshotRepo repository.ScreenshotRepository,
	deviceRepo repository.DeviceRepository,
	syncLogRepo repository.SyncLogRepository,
	taskRepo repository.TaskRepository,
) SyncService {
	return &syncService{
		timeLogRepo:    timeLogRepo,
		screenshotRepo: screenshotRepo,
		deviceRepo:     deviceRepo,
		syncLogRepo:    syncLogRepo,
		taskRepo:       taskRepo,
	}
}

func (s *syncService) BatchSync(userID uint, req *dto.BatchSyncRequest) (*dto.BatchSyncResponse, error) {
	startTime := time.Now()
	response := &dto.BatchSyncResponse{
		Success:  true,
		Message:  "Batch sync completed",
		SyncedAt: startTime,
	}

	// Get or create device
	var device *models.DeviceInfo
	var err error

	if req.DeviceInfo != nil {
		device, err = s.syncDeviceInfo(userID, req.DeviceInfo)
		if err != nil {
			return nil, errors.New("failed to sync device info")
		}
		response.DeviceInfo = &dto.DeviceInfoResponse{
			ID:         device.ID,
			DeviceUUID: device.DeviceUUID,
			DeviceName: device.DeviceName,
			OS:         device.OS,
			OSVersion:  device.OSVersion,
			AppVersion: device.AppVersion,
			LastSeenAt: device.LastSeenAt,
			IsActive:   device.IsActive,
		}
	}

	// Sync time logs
	if len(req.TimeLogs) > 0 {
		response.TimeLogsSync = s.syncTimeLogs(userID, device, req.TimeLogs, req.OrganizationID, req.WorkspaceID)
	}

	// Sync screenshots
	if len(req.Screenshots) > 0 {
		response.ScreenshotsSync = s.syncScreenshots(userID, device, req.Screenshots, req.OrganizationID, req.WorkspaceID)
	}

	// Create sync log
	duration := time.Since(startTime).Milliseconds()
	syncLog := &models.SyncLog{
		UserID:       userID,
		SyncType:     "batch",
		Status:       "success",
		ItemsCount:   len(req.TimeLogs) + len(req.Screenshots),
		SuccessCount: response.TimeLogsSync.Success + response.ScreenshotsSync.Success,
		FailedCount:  response.TimeLogsSync.Failed + response.ScreenshotsSync.Failed,
		StartedAt:    startTime,
		CompletedAt:  utils.Ptr(time.Now()),
		Duration:     duration,
	}

	if device != nil {
		syncLog.DeviceID = &device.ID
	}

	s.syncLogRepo.Create(syncLog)

	return response, nil
}

func (s *syncService) syncDeviceInfo(userID uint, deviceInfo *dto.SyncDeviceInfoItem) (*models.DeviceInfo, error) {
	// Check if device exists
	device, err := s.deviceRepo.FindByUUID(deviceInfo.DeviceUUID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()

	if device == nil {
		// Create new device
		device = &models.DeviceInfo{
			UserID:     userID,
			DeviceUUID: deviceInfo.DeviceUUID,
			DeviceName: deviceInfo.DeviceName,
			OS:         deviceInfo.OS,
			OSVersion:  deviceInfo.OSVersion,
			AppVersion: deviceInfo.AppVersion,
			IPAddress:  deviceInfo.IPAddress,
			LastSeenAt: &now,
			IsActive:   true,
		}
		if err := s.deviceRepo.Create(device); err != nil {
			return nil, err
		}
	} else {
		// Update existing device
		device.DeviceName = deviceInfo.DeviceName
		device.OSVersion = deviceInfo.OSVersion
		device.AppVersion = deviceInfo.AppVersion
		device.IPAddress = deviceInfo.IPAddress
		device.LastSeenAt = &now
		if err := s.deviceRepo.Update(device); err != nil {
			return nil, err
		}
	}

	return device, nil
}

func (s *syncService) syncTimeLogs(userID uint, device *models.DeviceInfo, items []dto.SyncTimeLogItem, defaultOrgID *uint, defaultWsID *uint) dto.SyncResult {
	// Debug logging
	fmt.Printf("🔄 syncTimeLogs called with defaultOrgID=%v, defaultWsID=%v\n", defaultOrgID, defaultWsID)

	result := dto.SyncResult{
		Total:   len(items),
		Success: 0,
		Failed:  0,
		Errors:  []string{},
	}

	for _, item := range items {
		// Resolve organization and workspace IDs
		// Priority: item-specific > default from batch request
		orgID := item.OrganizationID
		if orgID == nil {
			orgID = defaultOrgID
		}
		wsID := item.WorkspaceID
		if wsID == nil {
			wsID = defaultWsID
		}

		// Debug logging for resolved IDs
		fmt.Printf("📋 TimeLog item: LocalID=%s, item.OrgID=%v, item.WsID=%v, resolved orgID=%v, wsID=%v\n",
			item.LocalID, item.OrganizationID, item.WorkspaceID, orgID, wsID)

		// Handle task creation/lookup
		var taskID *uint

		// PRIORITY 1: Check if task_id is provided (manual task)
		// This means the time log is for an existing manual task
		if item.TaskID != nil && *item.TaskID > 0 {
			// Verify the task exists and belongs to this user
			existingTask, err := s.taskRepo.FindByID(*item.TaskID)
			if err == nil && existingTask != nil && existingTask.UserID == userID {
				taskID = item.TaskID
				fmt.Printf("🎯 Using existing manual task ID: %d (Title: %s)\n", *taskID, existingTask.Title)
			} else {
				fmt.Printf("⚠️  Manual task ID %d not found or not owned by user, will create new\n", *item.TaskID)
			}
		}

		// PRIORITY 2: Check task_local_id (UUID) for auto-track tasks
		if taskID == nil && item.TaskLocalID != "" {
			// Check if task already exists by LocalID
			existingTask, _ := s.taskRepo.FindByLocalID(item.TaskLocalID, userID)
			if existingTask != nil {
				taskID = &existingTask.ID
				fmt.Printf("🔍 Found existing task by LocalID: %s (ID: %d)\n", item.TaskLocalID, existingTask.ID)
			} else if item.TaskTitle != "" {
				// Create new task with LocalID and Title
				taskStatus := "completed"
				if item.Status == "running" || item.Status == "paused" {
					taskStatus = "active"
				}

				task := &models.Task{
					UserID:         userID,
					OrganizationID: orgID,            // Set organization context
					WorkspaceID:    wsID,             // Set workspace context
					LocalID:        item.TaskLocalID, // Set UUID from Electron
					Title:          item.TaskTitle,
					Description:    item.Notes,
					Status:         taskStatus,
					Priority:       1,
					IsManual:       false, // Auto-created from time tracker
				}
				if err := s.taskRepo.Create(task); err == nil {
					taskID = &task.ID
					fmt.Printf("✅ Created task with LocalID: %s (Title: %s, ID: %d, WsID: %v)\n", item.TaskLocalID, item.TaskTitle, task.ID, wsID)
				} else {
					fmt.Printf("⚠️  Failed to create task: %s - %v\n", item.TaskTitle, err)
				}
			}
		}

		// PRIORITY 3: Fallback - create task from title only (backward compatibility)
		if taskID == nil && item.TaskTitle != "" {
			// Create task without LocalID (will generate UUID in DB)
			taskStatus := "completed"
			if item.Status == "running" || item.Status == "paused" {
				taskStatus = "active"
			}

			task := &models.Task{
				UserID:         userID,
				OrganizationID: orgID, // Set organization context
				WorkspaceID:    wsID,  // Set workspace context
				Title:          item.TaskTitle,
				Description:    item.Notes,
				Status:         taskStatus,
				Priority:       1,
				IsManual:       false, // Auto-created from time tracker
			}
			if err := s.taskRepo.Create(task); err == nil {
				taskID = &task.ID
				fmt.Printf("✅ Auto-created task: %s (ID: %d, WsID: %v)\n", item.TaskTitle, task.ID, wsID)
			} else {
				fmt.Printf("⚠️  Failed to create task: %s - %v\n", item.TaskTitle, err)
			}
		}

		// Check if time log already exists
		existing, _ := s.timeLogRepo.FindByLocalID(item.LocalID, userID)
		if existing != nil {
			// Debug logging for UPDATE
			fmt.Printf("🔄 Backend updating existing TimeLog (LocalID: %s):\n", item.LocalID)
			fmt.Printf("   Old Duration: %d seconds\n", existing.Duration)
			fmt.Printf("   New Duration: %d seconds\n", item.Duration)
			fmt.Printf("   Old PausedTotal: %d seconds\n", existing.PausedTotal)
			fmt.Printf("   New PausedTotal: %d seconds\n", item.PausedTotal)

			// Update existing
			existing.EndTime = item.EndTime
			existing.PausedAt = item.PausedAt
			existing.ResumedAt = item.ResumedAt
			existing.Duration = item.Duration
			existing.PausedTotal = item.PausedTotal
			existing.Status = item.Status
			existing.Notes = item.Notes
			existing.TaskTitle = item.TaskTitle
			existing.TaskID = taskID
			existing.IsSynced = true

			if err := s.timeLogRepo.Update(existing); err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to update time log %s", item.LocalID))
			} else {
				result.Success++
				// Update task status and duration if this is for a manual task
				if taskID != nil {
					s.updateTaskAfterTimeLog(*taskID, item.Duration, item.Status)
				}
			}
		} else {
			// Auto-create task from task_title if provided and no task_id
			// Each time tracking session with a title creates a new task
			// Users can have multiple tasks with the same title (different task_id)
			if taskID == nil && item.TaskTitle != "" {
				newTask := &models.Task{
					UserID:         userID,
					OrganizationID: orgID, // Set organization context
					WorkspaceID:    wsID,  // Set workspace context
					Title:          item.TaskTitle,
					Status:         "active",
					Priority:       0,
				}
				if err := s.taskRepo.Create(newTask); err == nil {
					taskID = &newTask.ID
					fmt.Printf("✅ Auto-created task: %s (ID: %d, WsID: %v)\n", newTask.Title, newTask.ID, wsID)
				} else {
					fmt.Printf("⚠️  Failed to create task: %v\n", err)
				}
			}

			// Debug logging
			fmt.Printf("🔍 Backend received TimeLog data:\n")
			fmt.Printf("   Duration: %d seconds\n", item.Duration)
			fmt.Printf("   PausedTotal: %d seconds\n", item.PausedTotal)
			fmt.Printf("   TaskTitle: %s\n", item.TaskTitle)
			fmt.Printf("   StartTime: %v\n", item.StartTime)
			fmt.Printf("   EndTime: %v\n", item.EndTime)
			fmt.Printf("   WorkspaceID: %v\n", wsID)

			// Create new
			timeLog := &models.TimeLog{
				UserID:         userID,
				OrganizationID: orgID, // Set organization context
				WorkspaceID:    wsID,  // Set workspace context
				TaskID:         taskID,
				TaskLocalID:    item.TaskLocalID, // Store UUID for consistent reference
				LocalID:        item.LocalID,
				StartTime:      item.StartTime,
				EndTime:        item.EndTime,
				PausedAt:       item.PausedAt,
				ResumedAt:      item.ResumedAt,
				Duration:       item.Duration,
				PausedTotal:    item.PausedTotal,
				Status:         item.Status,
				Notes:          item.Notes,
				TaskTitle:      item.TaskTitle,
				IsSynced:       true,
			}

			if device != nil {
				timeLog.DeviceID = &device.ID
			}

			if err := s.timeLogRepo.Create(timeLog); err != nil {
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to create time log %s", item.LocalID))
			} else {
				result.Success++

				// Update task status and duration if this is for a manual task
				if taskID != nil {
					s.updateTaskAfterTimeLog(*taskID, item.Duration, item.Status)
				}

				// Update screenshots with task_id if task was created/found
				if taskID != nil {
					screenshots, _ := s.screenshotRepo.FindByTimeLogID(timeLog.ID)
					for _, screenshot := range screenshots {
						if screenshot.TaskID == nil {
							screenshot.TaskID = taskID
							s.screenshotRepo.Update(&screenshot)
						}
					}
				}
			}
		}
	}

	return result
}

func (s *syncService) syncScreenshots(userID uint, device *models.DeviceInfo, items []dto.SyncScreenshotItem, defaultOrgID *uint, defaultWsID *uint) dto.SyncResult {
	result := dto.SyncResult{
		Total:   len(items),
		Success: 0,
		Failed:  0,
		Errors:  []string{},
	}

	for _, item := range items {
		// Resolve organization and workspace IDs
		// Priority: item-specific > default from batch request
		orgID := item.OrganizationID
		if orgID == nil {
			orgID = defaultOrgID
		}
		wsID := item.WorkspaceID
		if wsID == nil {
			wsID = defaultWsID
		}

		// Check if screenshot already exists
		existing, _ := s.screenshotRepo.FindByLocalID(item.LocalID, userID)
		if existing != nil {
			// Verify file still exists
			if utils.FileExists(existing.FilePath) {
				result.Success++
				continue
			}
			// File missing, delete old record and re-upload
			fmt.Printf("⚠️  Screenshot file missing, re-uploading: %s\n", existing.FilePath)
			s.screenshotRepo.Delete(existing.ID)
		}

		// Decode base64 data
		imageData, err := base64.StdEncoding.DecodeString(item.Base64Data)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to decode screenshot %s: %v", item.LocalID, err))
			continue
		}

		// Save file
		filePath, err := utils.SaveBase64File(imageData, "screenshots", item.FileName)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to save screenshot %s: %v", item.LocalID, err))
			continue
		}

		// Verify file was saved successfully
		if !utils.FileExists(filePath) {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Screenshot file not found after save: %s", filePath))
			continue
		}

		fmt.Printf("✅ Screenshot saved: %s (size: %d bytes)\n", filePath, item.FileSize)

		// IMPORTANT: TimeLogID from Electron is LOCAL ID, not server ID
		// We need to find the actual TimeLog by LocalID if provided
		var serverTimeLogID *uint
		if item.TimeLogLocalID != "" {
			timeLog, err := s.timeLogRepo.FindByLocalID(item.TimeLogLocalID, userID)
			if err == nil && timeLog != nil {
				serverTimeLogID = &timeLog.ID
			} else {
				fmt.Printf("⚠️  TimeLog not found for LocalID: %s, screenshot will have null timelog_id\n", item.TimeLogLocalID)
			}
		}

		// IMPORTANT: Find actual TaskID from TaskLocalID
		// This is essential for manual tasks where TaskID might be set
		var serverTaskID *uint
		if item.TaskID != nil && *item.TaskID > 0 {
			// If TaskID is provided directly (manual task case), verify it exists
			task, err := s.taskRepo.FindByID(*item.TaskID)
			if err == nil && task != nil {
				serverTaskID = &task.ID
				fmt.Printf("✅ Screenshot task found by TaskID: %d\n", *serverTaskID)
			}
		}
		if serverTaskID == nil && item.TaskLocalID != "" {
			// Find task by TaskLocalID
			task, err := s.taskRepo.FindByLocalID(item.TaskLocalID, userID)
			if err == nil && task != nil {
				serverTaskID = &task.ID
				fmt.Printf("✅ Screenshot task found by TaskLocalID: %s -> TaskID: %d\n", item.TaskLocalID, *serverTaskID)
			} else {
				fmt.Printf("⚠️  Task not found for TaskLocalID: %s\n", item.TaskLocalID)
			}
		}

		// Create screenshot record
		screenshot := &models.Screenshot{
			UserID:         userID,
			OrganizationID: orgID,            // Set organization context
			WorkspaceID:    wsID,             // Set workspace context
			TimeLogID:      serverTimeLogID,  // Use mapped server ID or nil
			TaskID:         serverTaskID,     // Use resolved server TaskID
			TaskLocalID:    item.TaskLocalID, // Primary task identifier (UUID)
			LocalID:        item.LocalID,
			FilePath:       filePath,
			FileName:       item.FileName,
			FileSize:       item.FileSize,
			MimeType:       item.MimeType,
			CapturedAt:     item.CapturedAt,
			ScreenNumber:   item.ScreenNumber,
			IsEncrypted:    item.IsEncrypted,
			Checksum:       item.Checksum,
			IsSynced:       true,
		}

		if device != nil {
			screenshot.DeviceID = &device.ID
		}

		if err := s.screenshotRepo.Create(screenshot); err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to create screenshot DB record %s: %v", item.LocalID, err))
			// Cleanup file if DB insert failed
			utils.DeleteFile(filePath)
		} else {
			result.Success++
		}
	}

	return result
}

// updateTaskAfterTimeLog updates task status after time log sync
func (s *syncService) updateTaskAfterTimeLog(taskID uint, duration int64, status string) {
	// Get task
	task, err := s.taskRepo.FindByID(taskID)
	if err != nil || task == nil {
		return
	}

	// Update task status based on time log status
	if status == "running" {
		task.Status = "in_progress"
	} else if status == "stopped" || status == "completed" {
		// Check if there are any running time logs for this task
		hasRunning := false
		timeLogs, _ := s.timeLogRepo.FindByTaskID(taskID)
		for _, tl := range timeLogs {
			if tl.Status == "running" {
				hasRunning = true
				break
			}
		}
		if !hasRunning {
			task.Status = "completed"
		}
	}

	// Save task
	s.taskRepo.Update(task)
}
