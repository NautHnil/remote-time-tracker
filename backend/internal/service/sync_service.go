package service

import (
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"time"

	"remote-time-tracker.dev/internal/dto"
	"remote-time-tracker.dev/internal/models"
	"remote-time-tracker.dev/internal/repository"
	"remote-time-tracker.dev/internal/utils"
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
	systemLogSvc   SystemLogService
}

// NewSyncService creates a new sync service
func NewSyncService(
	timeLogRepo repository.TimeLogRepository,
	screenshotRepo repository.ScreenshotRepository,
	deviceRepo repository.DeviceRepository,
	syncLogRepo repository.SyncLogRepository,
	taskRepo repository.TaskRepository,
	systemLogSvc SystemLogService,
) SyncService {
	return &syncService{
		timeLogRepo:    timeLogRepo,
		screenshotRepo: screenshotRepo,
		deviceRepo:     deviceRepo,
		syncLogRepo:    syncLogRepo,
		taskRepo:       taskRepo,
		systemLogSvc:   systemLogSvc,
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

	// Sync system logs
	if len(req.SystemLogs) > 0 {
		response.SystemLogsSync = s.systemLogSvc.SyncClientLogs(userID, device, req.SystemLogs, req.OrganizationID, req.WorkspaceID)
	}

	totalItems := len(req.TimeLogs) + len(req.Screenshots) + len(req.SystemLogs)
	totalSuccess := response.TimeLogsSync.Success + response.ScreenshotsSync.Success + response.SystemLogsSync.Success
	totalFailed := response.TimeLogsSync.Failed + response.ScreenshotsSync.Failed + response.SystemLogsSync.Failed

	syncStatus := "success"
	if totalFailed > 0 {
		response.Success = false
		response.Message = "Batch sync completed with errors"
		if totalSuccess == 0 {
			syncStatus = "failed"
		} else {
			syncStatus = "partial_failed"
		}
	}

	// Create sync log
	duration := time.Since(startTime).Milliseconds()
	syncLog := &models.SyncLog{
		UserID:       userID,
		SyncType:     "batch",
		Status:       syncStatus,
		ItemsCount:   totalItems,
		SuccessCount: totalSuccess,
		FailedCount:  totalFailed,
		StartedAt:    startTime,
		CompletedAt:  utils.Ptr(time.Now()),
		Duration:     duration,
	}

	if device != nil {
		syncLog.DeviceID = &device.ID
	}

	s.syncLogRepo.Create(syncLog)

	if totalFailed > 0 {
		s.logSyncOutcome(userID, device, req, response, "warn", syncStatus)
	}

	return response, nil
}

func (s *syncService) logSyncOutcome(
	userID uint,
	device *models.DeviceInfo,
	req *dto.BatchSyncRequest,
	response *dto.BatchSyncResponse,
	level string,
	status string,
) {
	if s.systemLogSvc == nil {
		return
	}

	var deviceID *uint
	var deviceUUID string
	if device != nil {
		deviceID = &device.ID
		deviceUUID = device.DeviceUUID
	} else if req.DeviceInfo != nil {
		deviceUUID = req.DeviceInfo.DeviceUUID
	}

	details := map[string]interface{}{
		"status":             status,
		"time_logs_total":    response.TimeLogsSync.Total,
		"time_logs_failed":   response.TimeLogsSync.Failed,
		"screenshots_total":  response.ScreenshotsSync.Total,
		"screenshots_failed": response.ScreenshotsSync.Failed,
		"system_logs_total":  response.SystemLogsSync.Total,
		"system_logs_failed": response.SystemLogsSync.Failed,
	}

	if len(response.TimeLogsSync.Errors) > 0 {
		details["time_log_errors"] = response.TimeLogsSync.Errors
	}
	if len(response.ScreenshotsSync.Errors) > 0 {
		details["screenshot_errors"] = response.ScreenshotsSync.Errors
	}
	if len(response.SystemLogsSync.Errors) > 0 {
		details["system_log_errors"] = response.SystemLogsSync.Errors
	}

	s.systemLogSvc.LogBackend(BackendSystemLogInput{
		UserID:         &userID,
		DeviceID:       deviceID,
		OrganizationID: req.OrganizationID,
		WorkspaceID:    req.WorkspaceID,
		Source:         "backend-sync",
		Level:          level,
		Component:      "sync-service",
		Message:        response.Message,
		Details:        details,
		DeviceUUID:     deviceUUID,
		OccurredAt:     time.Now().UTC(),
	})
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
	log.Printf("🔄 syncTimeLogs called with defaultOrgID=%s, defaultWsID=%s",
		utils.UintPtrToString(defaultOrgID), utils.UintPtrToString(defaultWsID))

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
		log.Printf("📋 TimeLog item: LocalID=%s, item.OrgID=%s, item.WsID=%s, resolved orgID=%s, wsID=%s",
			item.LocalID,
			utils.UintPtrToString(item.OrganizationID),
			utils.UintPtrToString(item.WorkspaceID),
			utils.UintPtrToString(orgID),
			utils.UintPtrToString(wsID))

		// Handle task creation/lookup
		var taskID *uint

		// PRIORITY 1: Check if task_id is provided (manual task)
		// This means the time log is for an existing manual task
		if item.TaskID != nil && *item.TaskID > 0 {
			// Verify the task exists and belongs to this user
			existingTask, err := s.taskRepo.FindByID(*item.TaskID)
			if err == nil && existingTask != nil && existingTask.UserID == userID {
				taskID = item.TaskID
				log.Printf("🎯 Using existing manual task ID: %d (Title: %s)", *taskID, existingTask.Title)
			} else {
				log.Printf("⚠️  Manual task ID %d not found or not owned by user, will create new", *item.TaskID)
			}
		}

		// PRIORITY 2: Check task_local_id (UUID) for auto-track tasks
		if taskID == nil && item.TaskLocalID != "" {
			// Check if task already exists by LocalID
			existingTask, _ := s.taskRepo.FindByLocalID(item.TaskLocalID, userID)
			if existingTask != nil {
				taskID = &existingTask.ID
				log.Printf("🔍 Found existing task by LocalID: %s (ID: %d)", item.TaskLocalID, existingTask.ID)
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
					log.Printf("✅ Created task with LocalID: %s (Title: %s, ID: %d, WsID: %s)",
						item.TaskLocalID, item.TaskTitle, task.ID, utils.UintPtrToString(wsID))
				} else {
					log.Printf("⚠️  Failed to create task: %s - %v", item.TaskTitle, err)
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
				log.Printf("✅ Auto-created task: %s (ID: %d, WsID: %s)",
					item.TaskTitle, task.ID, utils.UintPtrToString(wsID))
			} else {
				log.Printf("⚠️  Failed to create task: %s - %v", item.TaskTitle, err)
			}
		}

		// Check if time log already exists
		existing, _ := s.timeLogRepo.FindByLocalID(item.LocalID, userID)
		if existing != nil {
			// Debug logging for UPDATE
			log.Printf("🔄 Backend updating existing TimeLog (LocalID: %s): old duration=%d, new duration=%d, old paused_total=%d, new paused_total=%d",
				item.LocalID, existing.Duration, item.Duration, existing.PausedTotal, item.PausedTotal)

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
					log.Printf("✅ Auto-created task: %s (ID: %d, WsID: %s)",
						newTask.Title, newTask.ID, utils.UintPtrToString(wsID))
				} else {
					log.Printf("⚠️  Failed to create task: %v", err)
				}
			}

			// Debug logging
			log.Printf("🔍 Backend received TimeLog data: duration=%d, paused_total=%d, task_title=%s, start_time=%v, end_time=%v, workspace_id=%v",
				item.Duration, item.PausedTotal, item.TaskTitle, item.StartTime, item.EndTime, wsID)

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
			log.Printf("⚠️  Screenshot file missing, re-uploading: %s", existing.FilePath)
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

		log.Printf("✅ Screenshot saved: %s (size: %d bytes)", filePath, item.FileSize)

		// IMPORTANT: TimeLogID from Electron is LOCAL ID, not server ID
		// We need to find the actual TimeLog by LocalID if provided
		var serverTimeLogID *uint
		if item.TimeLogLocalID != "" {
			timeLog, err := s.timeLogRepo.FindByLocalID(item.TimeLogLocalID, userID)
			if err == nil && timeLog != nil {
				serverTimeLogID = &timeLog.ID
			} else {
				log.Printf("⚠️  TimeLog not found for LocalID: %s, screenshot will have null timelog_id", item.TimeLogLocalID)
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
				log.Printf("✅ Screenshot task found by TaskID: %d", *serverTaskID)
			}
		}
		if serverTaskID == nil && item.TaskLocalID != "" {
			// Find task by TaskLocalID
			task, err := s.taskRepo.FindByLocalID(item.TaskLocalID, userID)
			if err == nil && task != nil {
				serverTaskID = &task.ID
				log.Printf("✅ Screenshot task found by TaskLocalID: %s -> TaskID: %d", item.TaskLocalID, *serverTaskID)
			} else {
				log.Printf("⚠️  Task not found for TaskLocalID: %s", item.TaskLocalID)
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
