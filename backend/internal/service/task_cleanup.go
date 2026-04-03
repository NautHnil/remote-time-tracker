package service

import (
	"github.com/beuphecan/remote-time-tracker/internal/models"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
)

func deleteTaskAndScreenshots(
	task *models.Task,
	taskRepo repository.TaskRepository,
	screenshotRepo repository.ScreenshotRepository,
) error {
	screenshots, err := screenshotRepo.FindByTaskIDOrLocalID(task.ID, task.LocalID, task.UserID)
	if err != nil {
		return err
	}

	for _, screenshot := range screenshots {
		if err := screenshotRepo.DeleteFile(screenshot.FilePath); err != nil {
			return err
		}
	}

	if err := screenshotRepo.DeleteByTaskIDOrLocalID(task.ID, task.LocalID, task.UserID); err != nil {
		return err
	}

	return taskRepo.Delete(task.ID)
}
