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
type YMLUpdateInfo struct {
	Version     string    `yaml:"version" json:"version"`
	Path        string    `yaml:"path" json:"path"`
	SHA512      string    `yaml:"sha512" json:"sha512"`
	ReleaseDate time.Time `yaml:"releaseDate" json:"releaseDate"`
	Files       []struct {
		URL    string `yaml:"url" json:"url"`
		SHA512 string `yaml:"sha512" json:"sha512"`
		Size   int64  `yaml:"size" json:"size"`
	} `yaml:"files" json:"files,omitempty"`
}
