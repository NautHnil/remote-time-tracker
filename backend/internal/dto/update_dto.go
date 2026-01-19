package dto

import "time"

// ============================================================
// Auto-Update DTOs
// ============================================================

// UpdateCheckRequest represents a request to check for updates
type UpdateCheckRequest struct {
	CurrentVersion string `json:"current_version" binding:"required"` // Current app version (e.g., "1.0.0")
	Platform       string `json:"platform" binding:"required"`        // darwin, win32, linux
	Arch           string `json:"arch" binding:"required"`            // x64, arm64, ia32
}

// UpdateCheckResponse represents the response for update check
type UpdateCheckResponse struct {
	UpdateAvailable bool           `json:"update_available"`
	LatestVersion   string         `json:"latest_version,omitempty"`
	ReleaseDate     *time.Time     `json:"release_date,omitempty"`
	ReleaseNotes    string         `json:"release_notes,omitempty"`
	IsMandatory     bool           `json:"is_mandatory,omitempty"`
	Files           []ReleaseAsset `json:"files,omitempty"`
}

// ReleaseAsset represents a downloadable file from the release
type ReleaseAsset struct {
	Name        string `json:"name"`         // Filename (e.g., "Remote Time Tracker-1.0.1.dmg")
	URL         string `json:"url"`          // Direct download URL (proxied through backend)
	Size        int64  `json:"size"`         // File size in bytes
	ContentType string `json:"content_type"` // MIME type
	SHA512      string `json:"sha512,omitempty"`
}

// GHRelease represents GitHub release response (internal use)
type GHRelease struct {
	ID          int64     `json:"id"`
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	Body        string    `json:"body"` // Release notes (markdown)
	Draft       bool      `json:"draft"`
	Prerelease  bool      `json:"prerelease"`
	CreatedAt   time.Time `json:"created_at"`
	PublishedAt time.Time `json:"published_at"`
	Assets      []GHAsset `json:"assets"`
}

// GHAsset represents a GitHub release asset (internal use)
type GHAsset struct {
	ID                 int64  `json:"id"`
	Name               string `json:"name"`
	Label              string `json:"label"`
	Size               int64  `json:"size"`
	ContentType        string `json:"content_type"`
	State              string `json:"state"`
	BrowserDownloadURL string `json:"browser_download_url"`
	URL                string `json:"url"` // API URL for downloading
}

// UpdateDownloadRequest represents a request to download an update file
type UpdateDownloadRequest struct {
	AssetName string `json:"asset_name" binding:"required"` // Name of the asset to download
	Version   string `json:"version" binding:"required"`    // Version of the release
}

// YMLUpdateInfo represents the structure of latest.yml/latest-mac.yml files
// @Description YAML update info for electron-updater
type YMLUpdateInfo struct {
	Version     string    `yaml:"version" json:"version" example:"1.0.0"`
	Path        string    `yaml:"path" json:"path" example:"Remote Time Tracker-1.0.0.dmg"`
	SHA512      string    `yaml:"sha512" json:"sha512" example:"sha512hash..."`
	ReleaseDate time.Time `yaml:"releaseDate" json:"releaseDate"`
	Files       []struct {
		URL    string `yaml:"url" json:"url"`
		SHA512 string `yaml:"sha512" json:"sha512"`
		Size   int64  `yaml:"size" json:"size"`
	} `yaml:"files" json:"files,omitempty"`
}

// YMLInfo is alias for YMLUpdateInfo for swagger
type YMLInfo = YMLUpdateInfo

// ReleaseNotesResponse represents release notes response
// @Description Release notes for a specific version
type ReleaseNotesResponse struct {
	Version      string    `json:"version" example:"v1.0.0"`
	ReleaseNotes string    `json:"release_notes" example:"## Changes\n- New feature..."`
	ReleaseDate  time.Time `json:"release_date"`
}

// PublicDownloadsResponse is alias for PublicDownloadResponse for swagger
type PublicDownloadsResponse = PublicDownloadResponse

// ============================================================
// Public Download DTOs (for website)
// ============================================================

// PublicDownloadResponse represents the response for public download links
type PublicDownloadResponse struct {
	Version      string                      `json:"version"`
	ReleaseDate  time.Time                   `json:"release_date"`
	ReleaseNotes string                      `json:"release_notes,omitempty"`
	Downloads    map[string]PlatformDownload `json:"downloads"`
}

// PlatformDownload represents a download link for a specific platform
type PlatformDownload struct {
	Name        string `json:"name"`         // Display name (e.g., "Windows", "macOS (Apple Silicon)")
	Icon        string `json:"icon"`         // Icon identifier (windows, apple, linux)
	Filename    string `json:"filename"`     // Original filename
	URL         string `json:"url"`          // Proxied download URL through backend (use this for private repos)
	Size        int64  `json:"size"`         // File size in bytes
	ContentType string `json:"content_type"` // MIME type
}
