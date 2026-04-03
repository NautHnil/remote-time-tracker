package service

import "github.com/beuphecan/remote-time-tracker/internal/repository"

func deleteScreenshotRecordAndFile(
	id uint,
	screenshotRepo repository.ScreenshotRepository,
) error {
	screenshot, err := screenshotRepo.FindByID(id)
	if err != nil {
		return err
	}

	if err := screenshotRepo.DeleteFile(screenshot.FilePath); err != nil {
		return err
	}

	return screenshotRepo.Delete(id)
}
