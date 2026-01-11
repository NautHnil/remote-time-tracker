package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/config"
)

// SaveUploadedFile saves an uploaded file to disk
func SaveUploadedFile(file *multipart.FileHeader, subDir string) (string, string, error) {
	cfg := config.AppConfig.Upload

	// Create upload directory if not exists
	uploadDir := filepath.Join(cfg.Path, subDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), GenerateRandomString(8), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Open source file
	src, err := file.Open()
	if err != nil {
		return "", "", fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, src); err != nil {
		return "", "", fmt.Errorf("failed to copy file: %w", err)
	}

	return filePath, filename, nil
}

// SaveBase64File saves a base64 encoded file to disk
func SaveBase64File(data []byte, subDir, filename string) (string, error) {
	cfg := config.AppConfig.Upload

	// Create upload directory if not exists
	uploadDir := filepath.Join(cfg.Path, subDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	filePath := filepath.Join(uploadDir, filename)

	// Write file
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return filePath, nil
}

// DeleteFile deletes a file from disk
func DeleteFile(filePath string) error {
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// CalculateChecksum calculates SHA256 checksum of a file
func CalculateChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// FileExists checks if a file exists
func FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return !os.IsNotExist(err)
}
