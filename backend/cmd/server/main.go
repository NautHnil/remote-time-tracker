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
)

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

	log.Println("✅ Repositories initialized")

	// Initialize services
	authService := service.NewAuthService(userRepo, orgRepo, invitationRepo, workspaceRepo)
	taskService := service.NewTaskService(taskRepo)
	timeLogService := service.NewTimeLogService(timeLogRepo, deviceRepo)
	syncService := service.NewSyncService(timeLogRepo, screenshotRepo, deviceRepo, syncLogRepo, taskRepo)
	screenshotService := service.NewScreenshotService(screenshotRepo, timeLogRepo, taskRepo)
	organizationService := service.NewOrganizationService(orgRepo, workspaceRepo, userRepo)
	workspaceService := service.NewWorkspaceService(workspaceRepo, orgRepo, userRepo)
	invitationService := service.NewInvitationService(invitationRepo, orgRepo, workspaceRepo, userRepo)
	roleService := service.NewRoleService(workspaceRepo, orgRepo)

	log.Println("✅ Services initialized")

	// Initialize controllers
	authController := controller.NewAuthController(authService)
	timeLogController := controller.NewTimeLogController(timeLogService)
	syncController := controller.NewSyncController(syncService)
	screenshotController := controller.NewScreenshotController(screenshotService)
	taskController := controller.NewTaskController(taskService)
	systemController := controller.NewSystemController()
	organizationController := controller.NewOrganizationController(organizationService, workspaceService, invitationService, roleService)
	workspaceController := controller.NewWorkspaceController(workspaceService)
	invitationController := controller.NewInvitationController(invitationService)
	adminController := controller.NewAdminController(userRepo, authService)

	log.Println("✅ Controllers initialized")

	// Setup router with full config
	r := router.SetupRouterWithConfig(&router.RouterConfig{
		AuthController:         authController,
		TimeLogController:      timeLogController,
		SyncController:         syncController,
		ScreenshotController:   screenshotController,
		TaskController:         taskController,
		SystemController:       systemController,
		OrganizationController: organizationController,
		WorkspaceController:    workspaceController,
		InvitationController:   invitationController,
		AdminController:        adminController,
		OrganizationService:    organizationService,
		WorkspaceService:       workspaceService,
	})

	// Start server
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("🚀 Server starting on %s in %s mode", addr, cfg.Server.Env)
	log.Printf("📚 API documentation: http://%s/api/v1", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
