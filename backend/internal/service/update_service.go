package service

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
	"remote-time-tracker.dev/internal/config"
	"remote-time-tracker.dev/internal/dto"
	"remote-time-tracker.dev/internal/models"
)

// UpdateService handles auto-update operations from the database and syncs GitHub releases.
type UpdateService struct {
	httpClient *http.Client
	db         *gorm.DB
	ghOwner    string
	ghRepo     string
	ghToken    string
}

// NewUpdateService creates a new update service instance
func NewUpdateService(db *gorm.DB) *UpdateService {
	return &UpdateService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		db:      db,
		ghOwner: config.AppConfig.GitHub.Owner,
		ghRepo:  config.AppConfig.GitHub.Repo,
		ghToken: config.AppConfig.GitHub.Token,
	}
}

// getAuthHeaders returns authorization headers for GitHub API
func (s *UpdateService) getAuthHeaders() map[string]string {
	headers := map[string]string{
		"Accept": "application/vnd.github+json",
	}
	if s.ghToken != "" {
		// Use Bearer for fine-grained PATs, token for classic PATs
		if strings.HasPrefix(s.ghToken, "github_pat_") {
			headers["Authorization"] = "Bearer " + s.ghToken
		} else {
			headers["Authorization"] = "token " + s.ghToken
		}
	}
	return headers
}

// CheckForUpdates checks if a newer version is available
func (s *UpdateService) CheckForUpdates(req dto.UpdateCheckRequest) (*dto.UpdateCheckResponse, error) {
	log.Printf("🔍 Checking for updates: current=%s, platform=%s, arch=%s",
		req.CurrentVersion, req.Platform, req.Arch)

	version, err := s.GetLatestAppVersion()
	if err != nil {
		return nil, err
	}

	latestVersion := strings.TrimPrefix(version.Version, "v")
	currentVersion := strings.TrimPrefix(req.CurrentVersion, "v")
	updateAvailable := compareVersions(latestVersion, currentVersion) > 0

	response := &dto.UpdateCheckResponse{
		UpdateAvailable: updateAvailable,
		LatestVersion:   latestVersion,
		ReleaseDate:     version.ReleaseDate,
		ReleaseNotes:    version.ReleaseNotes,
		IsMandatory:     version.IsMandatory,
	}

	if updateAvailable {
		response.Files = s.filterStoredAssetsForPlatform(version.Assets, req.Platform, req.Arch, latestVersion)
	}

	log.Printf("✅ Update check complete: available=%v, latest=%s", updateAvailable, latestVersion)
	return response, nil
}

// GetLatestAppVersion returns the admin-managed latest release from the database.
func (s *UpdateService) GetLatestAppVersion() (*models.AppVersion, error) {
	var version models.AppVersion
	err := s.db.
		Preload("Assets").
		Where("draft = ?", false).
		Order("is_latest DESC, release_date DESC, created_at DESC").
		First(&version).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("no synced app versions found")
		}
		return nil, err
	}
	return &version, nil
}

// GetAppVersionByVersion returns a specific app version from the database.
func (s *UpdateService) GetAppVersionByVersion(versionValue string) (*models.AppVersion, error) {
	normalizedVersion := strings.TrimPrefix(versionValue, "v")

	var version models.AppVersion
	err := s.db.
		Preload("Assets").
		Where("version = ? OR tag_name = ?", normalizedVersion, versionValue).
		First(&version).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("version %s not found", versionValue)
		}
		return nil, err
	}
	return &version, nil
}

// getLatestRelease fetches the latest release from GitHub
func (s *UpdateService) getLatestRelease() (*dto.GHRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", s.ghOwner, s.ghRepo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for key, value := range s.getAuthHeaders() {
		req.Header.Set(key, value)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.New("no releases found")
	}

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("GitHub API authentication failed (status %d). Check GITHUB_TOKEN", resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	var release dto.GHRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &release, nil
}

// getReleases fetches recent non-deleted releases from GitHub for synchronization.
func (s *UpdateService) getReleases() ([]dto.GHRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases?per_page=30", s.ghOwner, s.ghRepo)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for key, value := range s.getAuthHeaders() {
		req.Header.Set(key, value)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("GitHub API authentication failed (status %d). Check GITHUB_TOKEN", resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	var releases []dto.GHRelease
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return releases, nil
}

// SyncReleasesFromGitHub syncs GitHub releases and assets into the database.
func (s *UpdateService) SyncReleasesFromGitHub() (*dto.AdminSyncAppVersionsResponse, error) {
	releases, err := s.getReleases()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	syncedCount := 0
	latestVersion := ""

	err = s.db.Transaction(func(tx *gorm.DB) error {
		bestVersion := ""
		currentLatestVersion := ""
		var currentLatest models.AppVersion
		currentLatestErr := tx.Where("is_latest = ? AND draft = ?", true, false).First(&currentLatest).Error
		if currentLatestErr != nil && !errors.Is(currentLatestErr, gorm.ErrRecordNotFound) {
			return currentLatestErr
		}
		if currentLatestErr == nil {
			currentLatestVersion = currentLatest.Version
		}

		for _, release := range releases {
			versionValue := strings.TrimPrefix(release.TagName, "v")
			if versionValue == "" {
				continue
			}
			if release.Draft {
				continue
			}
			if latestVersion == "" || compareVersions(versionValue, bestVersion) > 0 {
				bestVersion = versionValue
				latestVersion = versionValue
			}
		}

		shouldPromoteLatest := currentLatestVersion == ""
		if !shouldPromoteLatest && latestVersion != "" {
			shouldPromoteLatest = compareVersions(latestVersion, currentLatestVersion) > 0
		}

		if shouldPromoteLatest {
			if err := tx.Model(&models.AppVersion{}).Where("is_latest = ?", true).Update("is_latest", false).Error; err != nil {
				return err
			}
		}

		for _, release := range releases {
			versionValue := strings.TrimPrefix(release.TagName, "v")
			if versionValue == "" {
				continue
			}

			var appVersion models.AppVersion
			err := tx.Where("version = ?", versionValue).First(&appVersion).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			isNew := errors.Is(err, gorm.ErrRecordNotFound)
			if isNew {
				appVersion = models.AppVersion{
					Version:      versionValue,
					ReleaseNotes: release.Body,
					IsMandatory:  false,
				}
			}

			appVersion.TagName = release.TagName
			appVersion.Name = release.Name
			appVersion.GitHubReleaseID = release.ID
			appVersion.GitHubURL = release.HTMLURL
			appVersion.ReleaseDate = &release.PublishedAt
			appVersion.OriginalReleaseNotes = release.Body
			appVersion.Draft = release.Draft
			appVersion.Prerelease = release.Prerelease
			if shouldPromoteLatest {
				appVersion.IsLatest = !release.Draft && versionValue == latestVersion
			}
			appVersion.LastSyncedAt = &now

			if isNew {
				if err := tx.Create(&appVersion).Error; err != nil {
					return err
				}
			} else if err := tx.Save(&appVersion).Error; err != nil {
				return err
			}

			for _, asset := range release.Assets {
				var storedAsset models.AppVersionAsset
				assetErr := tx.
					Where("app_version_id = ? AND name = ?", appVersion.ID, asset.Name).
					First(&storedAsset).Error
				if assetErr != nil && !errors.Is(assetErr, gorm.ErrRecordNotFound) {
					return assetErr
				}

				storedAsset.AppVersionID = appVersion.ID
				storedAsset.GitHubAssetID = asset.ID
				storedAsset.Name = asset.Name
				storedAsset.URL = asset.URL
				storedAsset.BrowserDownloadURL = asset.BrowserDownloadURL
				storedAsset.Size = asset.Size
				storedAsset.ContentType = asset.ContentType
				storedAsset.State = asset.State

				if errors.Is(assetErr, gorm.ErrRecordNotFound) {
					if err := tx.Create(&storedAsset).Error; err != nil {
						return err
					}
				} else if err := tx.Save(&storedAsset).Error; err != nil {
					return err
				}
			}

			syncedCount++
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &dto.AdminSyncAppVersionsResponse{
		SyncedCount: syncedCount,
		SyncedAt:    now,
		Latest:      latestVersion,
	}, nil
}

func (s *UpdateService) toAdminAppVersionResponse(version models.AppVersion) dto.AdminAppVersionResponse {
	assets := make([]dto.AdminAppVersionAssetResponse, 0, len(version.Assets))
	for _, asset := range version.Assets {
		assets = append(assets, dto.AdminAppVersionAssetResponse{
			ID:                 asset.ID,
			Name:               asset.Name,
			URL:                asset.URL,
			BrowserDownloadURL: asset.BrowserDownloadURL,
			DownloadURL:        fmt.Sprintf("/api/v1/public/downloads/file/%s/%s", version.Version, asset.Name),
			Size:               asset.Size,
			ContentType:        asset.ContentType,
			State:              asset.State,
			SHA512:             asset.SHA512,
		})
	}

	return dto.AdminAppVersionResponse{
		ID:                   version.ID,
		Version:              version.Version,
		TagName:              version.TagName,
		Name:                 version.Name,
		GitHubReleaseID:      version.GitHubReleaseID,
		GitHubURL:            version.GitHubURL,
		ReleaseDate:          version.ReleaseDate,
		ReleaseNotes:         version.ReleaseNotes,
		OriginalReleaseNotes: version.OriginalReleaseNotes,
		IsMandatory:          version.IsMandatory,
		IsLatest:             version.IsLatest,
		Draft:                version.Draft,
		Prerelease:           version.Prerelease,
		LastSyncedAt:         version.LastSyncedAt,
		CreatedAt:            version.CreatedAt,
		UpdatedAt:            version.UpdatedAt,
		Assets:               assets,
	}
}

// ListAdminAppVersions lists all synced app versions for admin management.
func (s *UpdateService) ListAdminAppVersions() (*dto.AdminAppVersionListResponse, error) {
	var versions []models.AppVersion
	if err := s.db.
		Preload("Assets").
		Order("is_latest DESC, release_date DESC, created_at DESC").
		Find(&versions).Error; err != nil {
		return nil, err
	}

	result := make([]dto.AdminAppVersionResponse, 0, len(versions))
	for _, version := range versions {
		result = append(result, s.toAdminAppVersionResponse(version))
	}

	return &dto.AdminAppVersionListResponse{Versions: result}, nil
}

// UpdateAdminAppVersion updates admin-managed app version fields.
func (s *UpdateService) UpdateAdminAppVersion(id uint, req dto.AdminUpdateAppVersionRequest) (*dto.AdminAppVersionResponse, error) {
	var version models.AppVersion
	if err := s.db.Preload("Assets").First(&version, id).Error; err != nil {
		return nil, err
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if req.ReleaseNotesBase64 != nil {
			decodedNotes, err := base64.StdEncoding.DecodeString(*req.ReleaseNotesBase64)
			if err != nil {
				return fmt.Errorf("invalid release_notes_base64: %w", err)
			}
			version.ReleaseNotes = string(decodedNotes)
		}
		if req.IsMandatory != nil {
			version.IsMandatory = *req.IsMandatory
		}
		if req.IsLatest != nil {
			version.IsLatest = *req.IsLatest
			if *req.IsLatest {
				if err := tx.Model(&models.AppVersion{}).
					Where("id <> ?", version.ID).
					Update("is_latest", false).Error; err != nil {
					return err
				}
			}
		}

		return tx.Save(&version).Error
	})
	if err != nil {
		return nil, err
	}

	if err := s.db.Preload("Assets").First(&version, id).Error; err != nil {
		return nil, err
	}
	response := s.toAdminAppVersionResponse(version)
	return &response, nil
}

// StartSyncWorker starts background GitHub release synchronization.
func (s *UpdateService) StartSyncWorker(interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Minute
	}

	go func() {
		if result, err := s.SyncReleasesFromGitHub(); err != nil {
			log.Printf("❌ Initial app version sync failed: %v", err)
		} else {
			log.Printf("✅ Initial app version sync completed: %d versions, latest=%s", result.SyncedCount, result.Latest)
		}

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			if result, err := s.SyncReleasesFromGitHub(); err != nil {
				log.Printf("❌ Scheduled app version sync failed: %v", err)
			} else {
				log.Printf("✅ Scheduled app version sync completed: %d versions, latest=%s", result.SyncedCount, result.Latest)
			}
		}
	}()
}

// GetReleaseByTag fetches a specific release by tag name
func (s *UpdateService) GetReleaseByTag(tag string) (*dto.GHRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/tags/%s", s.ghOwner, s.ghRepo, tag)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for key, value := range s.getAuthHeaders() {
		req.Header.Set(key, value)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	var release dto.GHRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &release, nil
}

// filterAssetsForPlatform filters assets based on platform and architecture
func (s *UpdateService) filterAssetsForPlatform(assets []dto.GHAsset, platform, arch, version string) []dto.ReleaseAsset {
	var result []dto.ReleaseAsset

	// Define file patterns for each platform
	var patterns []string
	switch platform {
	case "darwin":
		if arch == "arm64" {
			patterns = []string{
				`.*-arm64\.dmg$`,
				`.*-arm64-mac\.zip$`,
				`latest-mac\.yml$`,
			}
		} else {
			patterns = []string{
				`.*\.dmg$`,     // Generic dmg (not arm64)
				`.*-mac\.zip$`, // Generic mac zip (not arm64)
				`latest-mac\.yml$`,
			}
		}
	case "win32":
		patterns = []string{
			`.*Setup.*\.exe$`,
			`.*\.exe\.blockmap$`,
			`latest\.yml$`,
		}
	case "linux":
		patterns = []string{
			`.*\.AppImage$`,
			`latest-linux\.yml$`,
		}
	}

	for _, asset := range assets {
		for _, pattern := range patterns {
			matched, _ := regexp.MatchString(pattern, asset.Name)
			if matched {
				// For dmg on x64 Mac, exclude arm64 files
				if platform == "darwin" && arch != "arm64" {
					if strings.Contains(asset.Name, "arm64") {
						continue
					}
				}

				result = append(result, dto.ReleaseAsset{
					Name:        asset.Name,
					URL:         fmt.Sprintf("/api/v1/updates/download/%s/%s", version, asset.Name),
					Size:        asset.Size,
					ContentType: asset.ContentType,
				})
				break
			}
		}
	}

	return result
}

// filterStoredAssetsForPlatform filters synced assets based on platform and architecture.
func (s *UpdateService) filterStoredAssetsForPlatform(assets []models.AppVersionAsset, platform, arch, version string) []dto.ReleaseAsset {
	var result []dto.ReleaseAsset

	var patterns []string
	switch platform {
	case "darwin":
		if arch == "arm64" {
			patterns = []string{
				`.*-arm64\.dmg$`,
				`.*-arm64-mac\.zip$`,
				`latest-mac\.yml$`,
			}
		} else {
			patterns = []string{
				`.*\.dmg$`,
				`.*-mac\.zip$`,
				`latest-mac\.yml$`,
			}
		}
	case "win32":
		patterns = []string{
			`.*Setup.*\.exe$`,
			`.*\.exe\.blockmap$`,
			`latest\.yml$`,
		}
	case "linux":
		patterns = []string{
			`.*\.AppImage$`,
			`latest-linux\.yml$`,
		}
	}

	for _, asset := range assets {
		for _, pattern := range patterns {
			matched, _ := regexp.MatchString(pattern, asset.Name)
			if matched {
				if platform == "darwin" && arch != "arm64" && strings.Contains(asset.Name, "arm64") {
					continue
				}

				result = append(result, dto.ReleaseAsset{
					Name:        asset.Name,
					URL:         fmt.Sprintf("/api/v1/updates/download/%s/%s", version, asset.Name),
					Size:        asset.Size,
					ContentType: asset.ContentType,
					SHA512:      asset.SHA512,
				})
				break
			}
		}
	}

	return result
}

// AssetInfo contains information about a release asset
type AssetInfo struct {
	Name        string
	URL         string
	Size        int64
	ContentType string
}

// GetAssetInfo returns information about a specific asset
func (s *UpdateService) GetAssetInfo(version, assetName string) (*AssetInfo, error) {
	normalizedVersion := strings.TrimPrefix(version, "v")

	var asset models.AppVersionAsset
	err := s.db.
		Joins("JOIN app_versions ON app_versions.id = app_version_assets.app_version_id").
		Where("app_versions.version = ? AND app_version_assets.name = ?", normalizedVersion, assetName).
		First(&asset).Error
	if err != nil {
		return nil, fmt.Errorf("asset %s not found in release %s", assetName, version)
	}

	return &AssetInfo{
		Name:        asset.Name,
		URL:         asset.URL,
		Size:        asset.Size,
		ContentType: asset.ContentType,
	}, nil
}

// GetAssetDownloadURL returns the actual GitHub download URL for an asset
func (s *UpdateService) GetAssetDownloadURL(version, assetName string) (string, string, error) {
	assetInfo, err := s.GetAssetInfo(version, assetName)
	if err != nil {
		return "", "", err
	}
	return assetInfo.URL, assetInfo.ContentType, nil
}

// StreamAssetDownload streams an asset download to the provided writer
func (s *UpdateService) StreamAssetDownload(version, assetName string, w io.Writer) (int64, string, error) {
	assetURL, contentType, err := s.GetAssetDownloadURL(version, assetName)
	if err != nil {
		return 0, "", err
	}

	// Create a client that follows redirects (GitHub returns 302 for asset downloads)
	downloadClient := &http.Client{
		Timeout: 5 * time.Minute, // Longer timeout for large files
	}

	// Create request to GitHub API
	req, err := http.NewRequest("GET", assetURL, nil)
	if err != nil {
		return 0, "", err
	}

	// Use application/octet-stream to get binary content
	headers := s.getAuthHeaders()
	headers["Accept"] = "application/octet-stream"
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := downloadClient.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("download request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, "", fmt.Errorf("download failed: status %d, body: %s", resp.StatusCode, string(body))
	}

	// Stream the content
	written, err := io.Copy(w, resp.Body)
	if err != nil {
		return written, contentType, fmt.Errorf("streaming failed: %w", err)
	}

	return written, contentType, nil
}

// GetYMLFile retrieves the latest.yml file content
func (s *UpdateService) GetYMLFile(platform string) (*dto.YMLUpdateInfo, error) {
	// Determine which yml file to fetch
	var ymlFileName string
	switch platform {
	case "darwin":
		ymlFileName = "latest-mac.yml"
	case "win32":
		ymlFileName = "latest.yml"
	case "linux":
		ymlFileName = "latest-linux.yml"
	default:
		ymlFileName = "latest.yml"
	}

	version, err := s.GetLatestAppVersion()
	if err != nil {
		return nil, err
	}

	var ymlAsset *models.AppVersionAsset
	for _, asset := range version.Assets {
		if asset.Name == ymlFileName {
			ymlAsset = &asset
			break
		}
	}

	if ymlAsset == nil {
		return nil, fmt.Errorf("yml file %s not found in release", ymlFileName)
	}

	// Download yml content
	req, err := http.NewRequest("GET", ymlAsset.URL, nil)
	if err != nil {
		return nil, err
	}

	headers := s.getAuthHeaders()
	headers["Accept"] = "application/octet-stream"
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download yml file: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read yml content: %w", err)
	}

	var ymlInfo dto.YMLUpdateInfo
	if err := yaml.Unmarshal(body, &ymlInfo); err != nil {
		return nil, fmt.Errorf("failed to parse yml: %w", err)
	}

	return &ymlInfo, nil
}

// GetAllPlatformDownloads returns download links for all platforms
// This is used by the website to display download links for users
func (s *UpdateService) GetAllPlatformDownloads() (*dto.PublicDownloadResponse, error) {
	version, err := s.GetLatestAppVersion()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest release: %w", err)
	}

	response := &dto.PublicDownloadResponse{
		Version:      version.Version,
		ReleaseNotes: version.ReleaseNotes,
		Downloads:    make(map[string]dto.PlatformDownload),
	}
	if version.ReleaseDate != nil {
		response.ReleaseDate = *version.ReleaseDate
	}

	// Define platform patterns
	// Order matters: more specific patterns should come first
	platformPatterns := map[string]struct {
		patterns    []string
		displayName string
		icon        string
	}{
		"windows": {
			patterns:    []string{`.*Setup.*\.exe$`},
			displayName: "Windows",
			icon:        "windows",
		},
		"mac-arm": {
			patterns:    []string{`.*-arm64\.dmg$`},
			displayName: "macOS (Apple Silicon)",
			icon:        "apple",
		},
		"mac-intel": {
			patterns:    []string{`.*\.dmg$`}, // Will exclude arm64 in the matching logic below
			displayName: "macOS (Intel)",
			icon:        "apple",
		},
		"linux": {
			patterns:    []string{`.*\.AppImage$`},
			displayName: "Linux",
			icon:        "linux",
		},
	}

	// Process in specific order to handle overlapping patterns correctly
	platformOrder := []string{"windows", "mac-arm", "mac-intel", "linux"}

	// Find assets for each platform
	for _, platformKey := range platformOrder {
		config := platformPatterns[platformKey]
		for _, asset := range version.Assets {
			for _, pattern := range config.patterns {
				matched, _ := regexp.MatchString(pattern, asset.Name)
				if matched {
					// For mac-intel, explicitly exclude arm64 files
					if platformKey == "mac-intel" && strings.Contains(asset.Name, "arm64") {
						continue
					}

					response.Downloads[platformKey] = dto.PlatformDownload{
						Name:        config.displayName,
						Icon:        config.icon,
						Filename:    asset.Name,
						URL:         fmt.Sprintf("/api/v1/public/downloads/file/%s/%s", version.Version, asset.Name),
						Size:        asset.Size,
						ContentType: asset.ContentType,
					}
					break
				}
			}
		}
	}

	return response, nil
}

// compareVersions compares two semantic versions
// Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
func compareVersions(v1, v2 string) int {
	// Simple semver comparison
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var num1, num2 int
		if i < len(parts1) {
			fmt.Sscanf(parts1[i], "%d", &num1)
		}
		if i < len(parts2) {
			fmt.Sscanf(parts2[i], "%d", &num2)
		}

		if num1 > num2 {
			return 1
		}
		if num1 < num2 {
			return -1
		}
	}

	return 0
}
