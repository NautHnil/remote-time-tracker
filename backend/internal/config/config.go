package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Upload   UploadConfig
	CORS     CORSConfig
	Log      LogConfig
	GitHub   GitHubConfig
	Presence PresenceConfig
}

// GitHubConfig holds GitHub API configuration for auto-updates
type GitHubConfig struct {
	Token string // Personal access token for private repos
	Owner string // Repository owner
	Repo  string // Repository name
}

// ServerConfig holds server-related configuration
type ServerConfig struct {
	Port string
	Host string
	Env  string
}

// DatabaseConfig holds database-related configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	TimeZone string
}

// JWTConfig holds JWT-related configuration
type JWTConfig struct {
	Secret        string
	Expiry        time.Duration
	RefreshExpiry time.Duration
}

// UploadConfig holds file upload configuration
type UploadConfig struct {
	Path             string
	MaxSize          int64
	AllowedFileTypes []string
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins []string
}

// LogConfig holds logging configuration
type LogConfig struct {
	Level  string
	Format string
}

// PresenceConfig holds presence/heartbeat configuration
type PresenceConfig struct {
	HeartbeatInterval time.Duration
	StaleAfter        time.Duration
}

var AppConfig *Config

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	config := &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Host: getEnv("HOST", "0.0.0.0"),
			Env:  getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "rtt_user"),
			Password: getEnv("DB_PASSWORD", "rtt_password"),
			DBName:   getEnv("DB_NAME", "remote_time_tracker"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			TimeZone: getEnv("DB_TIMEZONE", "UTC"),
		},
		JWT: JWTConfig{
			Secret:        getEnv("JWT_SECRET", "change-this-secret"),
			Expiry:        parseDuration(getEnv("JWT_EXPIRY", "24h")),
			RefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h")),
		},
		Upload: UploadConfig{
			Path:             getEnv("UPLOAD_PATH", "/app/uploads"),
			MaxSize:          parseInt64(getEnv("MAX_UPLOAD_SIZE", "10485760")),
			AllowedFileTypes: []string{"image/png", "image/jpeg", "image/jpg"},
		},
		CORS: CORSConfig{
			AllowedOrigins: parseOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "debug"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		GitHub: GitHubConfig{
			Token: getEnv("GITHUB_TOKEN", ""),
			Owner: getEnv("GITHUB_OWNER", "NautHnil"),
			Repo:  getEnv("GITHUB_REPO", "remote-time-tracker"),
		},
		Presence: PresenceConfig{
			HeartbeatInterval: parseDuration(getEnv("PRESENCE_HEARTBEAT_INTERVAL", "15s")),
			StaleAfter:        parseDuration(getEnv("PRESENCE_STALE_AFTER", "45s")),
		},
	}

	AppConfig = config
	return config, nil
}

// GetDSN returns the database connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.Host,
		c.User,
		c.Password,
		c.DBName,
		c.Port,
		c.SSLMode,
		c.TimeZone,
	)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseOrigins(s string) []string {
	if s == "" {
		return []string{"http://localhost:3000"}
	}
	// Split by comma and trim spaces
	origins := []string{}
	parts := strings.Split(s, ",")
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		log.Printf("Failed to parse duration %s, using default 24h", s)
		return 24 * time.Hour
	}
	return d
}

func parseInt64(s string) int64 {
	i, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		log.Printf("Failed to parse int64 %s, using default 10485760", s)
		return 10485760
	}
	return i
}
