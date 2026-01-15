package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"gopkg.in/yaml.v3"
)

// UpdateService handles auto-update operations via GitHub API
type UpdateService struct {
	httpClient *http.Client
	ghOwner    string
	ghRepo     string
	ghToken    string
}

// NewUpdateService creates a new update service instance
func NewUpdateService() *UpdateService {
	return &UpdateService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
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

	// Get latest release from GitHub
	release, err := s.getLatestRelease()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch latest release: %w", err)
	}

	// Parse version from tag name (remove 'v' prefix if present)
	latestVersion := strings.TrimPrefix(release.TagName, "v")
	currentVersion := strings.TrimPrefix(req.CurrentVersion, "v")

	// Compare versions
	updateAvailable := compareVersions(latestVersion, currentVersion) > 0

	response := &dto.UpdateCheckResponse{
		UpdateAvailable: updateAvailable,
		LatestVersion:   latestVersion,
		ReleaseDate:     &release.PublishedAt,
		ReleaseNotes:    release.Body,
		IsMandatory:     false, // Can be determined from release notes or tags
	}

	if updateAvailable {
		// Filter assets for the requested platform
		response.Files = s.filterAssetsForPlatform(release.Assets, req.Platform, req.Arch, latestVersion)
	}

	log.Printf("✅ Update check complete: available=%v, latest=%s", updateAvailable, latestVersion)
	return response, nil
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

// GetAssetDownloadURL returns the actual GitHub download URL for an asset
func (s *UpdateService) GetAssetDownloadURL(version, assetName string) (string, string, error) {
	// Get release by tag
	tag := version
	if !strings.HasPrefix(tag, "v") {
		tag = "v" + tag
	}

	release, err := s.GetReleaseByTag(tag)
	if err != nil {
		// Try without 'v' prefix
		release, err = s.GetReleaseByTag(version)
		if err != nil {
			return "", "", fmt.Errorf("release not found: %w", err)
		}
	}

	// Find the asset
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			return asset.URL, asset.ContentType, nil
		}
	}

	return "", "", fmt.Errorf("asset %s not found in release %s", assetName, version)
}

// StreamAssetDownload streams an asset download to the provided writer
func (s *UpdateService) StreamAssetDownload(version, assetName string, w io.Writer) (int64, string, error) {
	assetURL, contentType, err := s.GetAssetDownloadURL(version, assetName)
	if err != nil {
		return 0, "", err
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

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("download request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusFound {
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

	// Get latest release
	release, err := s.getLatestRelease()
	if err != nil {
		return nil, err
	}

	// Find the yml asset
	var ymlAsset *dto.GHAsset
	for _, asset := range release.Assets {
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
