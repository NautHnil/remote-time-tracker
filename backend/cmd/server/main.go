package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/beuphecan/remote-time-tracker/internal/config"
	"github.com/beuphecan/remote-time-tracker/internal/controller"
	"github.com/beuphecan/remote-time-tracker/internal/database"
	"github.com/beuphecan/remote-time-tracker/internal/repository"
	"github.com/beuphecan/remote-time-tracker/internal/router"
	"github.com/beuphecan/remote-time-tracker/internal/service"

	_ "github.com/beuphecan/remote-time-tracker/docs" // Swagger generated docs
)

// @title Remote Time Tracker API
// @version 1.0
// @description API documentation for Remote Time Tracker - A comprehensive time tracking application with screenshot capture, task management, organization/workspace management, and synchronization features.

// @contact.name API Support
// @contact.email support@remotetimetracker.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @tag.name auth
// @tag.description Authentication endpoints - Login, Register, Token refresh

// @tag.name tasks
// @tag.description Task management - Create, Read, Update, Delete tasks

// @tag.name timelogs
// @tag.description Time tracking - Start, Stop, Pause, Resume time tracking sessions

// @tag.name screenshots
// @tag.description Screenshot management - View, Download, Delete captured screenshots

// @tag.name sync
// @tag.description Data synchronization from Electron desktop app

// @tag.name organizations
// @tag.description Organization management - Create, manage organizations and members

// @tag.name workspaces
// @tag.description Workspace/Project management within organizations

// @tag.name invitations
// @tag.description User invitations to organizations and workspaces

// @tag.name admin
// @tag.description System administration - User, Organization, Task, TimeLog management (Admin only)

// @tag.name system
// @tag.description System utilities - Health check, initialization

// @tag.name updates
// @tag.description Application updates - Check for updates, download assets

// ensureUploadDirectories creates necessary upload directories if they don't exist
func ensureUploadDirectories(cfg *config.Config) error {
	uploadPath := cfg.Upload.Path
	screenshotsPath := filepath.Join(uploadPath, "screenshots")

	// Create base upload directory
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create screenshots subdirectory
	if err := os.MkdirAll(screenshotsPath, 0755); err != nil {
		return fmt.Errorf("failed to create screenshots directory: %w", err)
	}

	log.Printf("📁 Upload path: %s", uploadPath)
	log.Printf("📸 Screenshots path: %s", screenshotsPath)

	return nil
}

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Println("✅ Configuration loaded successfully")

	// Ensure upload directories exist
	if err := ensureUploadDirectories(cfg); err != nil {
		log.Fatalf("Failed to create upload directories: %v", err)
	}
	log.Println("✅ Upload directories verified")

	// Connect to database
	db, err := database.Connect(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	timeLogRepo := repository.NewTimeLogRepository(db)
	screenshotRepo := repository.NewScreenshotRepository(db)
	deviceRepo := repository.NewDeviceRepository(db)
	syncLogRepo := repository.NewSyncLogRepository(db)
	orgRepo := repository.NewOrganizationRepository(db)
	workspaceRepo := repository.NewWorkspaceRepository(db)
	invitationRepo := repository.NewInvitationRepository(db)
	adminRepo := repository.NewAdminRepository(db)

	log.Println("✅ Repositories initialized")

	// Initialize services
	authService := service.NewAuthService(userRepo, orgRepo, invitationRepo, workspaceRepo)
	taskService := service.NewTaskService(taskRepo)
	timeLogService := service.NewTimeLogService(timeLogRepo, deviceRepo, userRepo)
	presenceService := service.NewPresenceService(userRepo, deviceRepo)
	syncService := service.NewSyncService(timeLogRepo, screenshotRepo, deviceRepo, syncLogRepo, taskRepo)
	screenshotService := service.NewScreenshotService(screenshotRepo, timeLogRepo, taskRepo)
	organizationService := service.NewOrganizationService(orgRepo, workspaceRepo, userRepo)
	workspaceService := service.NewWorkspaceService(workspaceRepo, orgRepo, userRepo)
	invitationService := service.NewInvitationService(invitationRepo, orgRepo, workspaceRepo, userRepo)
	roleService := service.NewRoleService(workspaceRepo, orgRepo)
	updateService := service.NewUpdateService()
	systemService := service.NewSystemService(userRepo)
	adminService := service.NewAdminService(
		adminRepo,
		userRepo,
		orgRepo,
		workspaceRepo,
		taskRepo,
		timeLogRepo,
		screenshotRepo,
	)

	log.Println("✅ Services initialized")

	// Initialize controllers
	authController := controller.NewAuthController(authService)
	timeLogController := controller.NewTimeLogController(timeLogService)
	presenceController := controller.NewPresenceController(presenceService)
	syncController := controller.NewSyncController(syncService)
	screenshotController := controller.NewScreenshotController(screenshotService)
	taskController := controller.NewTaskController(taskService)
	systemController := controller.NewSystemController(systemService)
	organizationController := controller.NewOrganizationController(organizationService, workspaceService, invitationService, roleService)
	workspaceController := controller.NewWorkspaceController(workspaceService)
	invitationController := controller.NewInvitationController(invitationService)
	adminController := controller.NewAdminController(adminService)
	adminPresenceController := controller.NewAdminPresenceController()
	updateController := controller.NewUpdateController(updateService)

	log.Println("✅ Controllers initialized")

	// Setup router with full config
	r := router.SetupRouterWithConfig(&router.RouterConfig{
		AuthController:          authController,
		TimeLogController:       timeLogController,
		SyncController:          syncController,
		ScreenshotController:    screenshotController,
		TaskController:          taskController,
		SystemController:        systemController,
		PresenceController:      presenceController,
		OrganizationController:  organizationController,
		WorkspaceController:     workspaceController,
		InvitationController:    invitationController,
		AdminController:         adminController,
		AdminPresenceController: adminPresenceController,
		UpdateController:        updateController,
		OrganizationService:     organizationService,
		WorkspaceService:        workspaceService,
	})

	// Start server
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("🚀 Server starting on %s in %s mode", addr, cfg.Server.Env)
	log.Printf("📚 API documentation: http://%s/api/v1", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
