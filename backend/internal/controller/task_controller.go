package controller

import (
	"net/http"
	"strconv"

	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/beuphecan/remote-time-tracker/internal/middleware"
	"github.com/beuphecan/remote-time-tracker/internal/service"
	"github.com/beuphecan/remote-time-tracker/internal/utils"
	"github.com/gin-gonic/gin"
)

// TaskController handles task-related HTTP requests
type TaskController struct {
	taskService service.TaskService
}

// NewTaskController creates a new task controller
func NewTaskController(taskService service.TaskService) *TaskController {
	return &TaskController{
		taskService: taskService,
	}
}

// Create handles creating a new task
// @Summary Create a new task
// @Description Create a new task. Tasks can be manually created (is_manual=true) or auto-created from time tracker.
// @Tags tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.CreateTaskRequest true "Task creation details"
// @Success 201 {object} dto.SuccessResponse{data=dto.TaskWithStats} "Task created successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /tasks [post]
func (ctrl *TaskController) Create(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	task, err := ctrl.taskService.Create(userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Task created successfully", task)
}

// GetByID handles retrieving a task by ID
// @Summary Get task by ID
// @Description Get detailed information about a specific task including statistics
// @Tags tasks
// @Produce json
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Success 200 {object} dto.SuccessResponse{data=dto.TaskWithStats} "Task retrieved successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid task ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Task not found"
// @Router /tasks/{id} [get]
func (ctrl *TaskController) GetByID(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	task, err := ctrl.taskService.GetByID(uint(id), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Task retrieved successfully", task)
}

// List handles listing tasks with pagination
// @Summary List tasks
// @Description Get paginated list of tasks for the authenticated user with statistics
// @Tags tasks
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1) minimum(1)
// @Param per_page query int false "Items per page" default(50) minimum(1) maximum(100)
// @Success 200 {object} dto.SuccessResponse "Tasks retrieved successfully"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /tasks [get]
func (ctrl *TaskController) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse query params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	tasks, total, err := ctrl.taskService.GetByUserID(userID, page, perPage)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	// Return response in consistent format with other endpoints
	utils.SuccessResponse(c, http.StatusOK, "Tasks retrieved successfully", map[string]interface{}{
		"tasks": tasks,
		"pagination": dto.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// Update handles updating a task
// @Summary Update task
// @Description Update an existing task's details
// @Tags tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Param request body dto.UpdateTaskRequest true "Task update details"
// @Success 200 {object} dto.SuccessResponse{data=dto.TaskWithStats} "Task updated successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid request"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Task not found"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /tasks/{id} [put]
func (ctrl *TaskController) Update(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	var req dto.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	task, err := ctrl.taskService.Update(uint(id), userID, &req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Task updated successfully", task)
}

// Delete handles deleting a task
// @Summary Delete task
// @Description Delete a task and its associated data
// @Tags tasks
// @Produce json
// @Security BearerAuth
// @Param id path int true "Task ID"
// @Success 200 {object} dto.SuccessResponse "Task deleted successfully"
// @Failure 400 {object} dto.ErrorResponse "Invalid task ID"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 404 {object} dto.ErrorResponse "Task not found"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /tasks/{id} [delete]
func (ctrl *TaskController) Delete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid task ID")
		return
	}

	if err := ctrl.taskService.Delete(uint(id), userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Task deleted successfully", nil)
}

// GetActiveTasks handles retrieving active tasks for a user
// @Summary Get active tasks
// @Description Get all active (non-completed, non-archived) tasks for the authenticated user
// @Tags tasks
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.SuccessResponse "Active tasks retrieved successfully"
// @Failure 401 {object} dto.ErrorResponse "Unauthorized"
// @Failure 500 {object} dto.ErrorResponse "Internal server error"
// @Router /tasks/active [get]
func (ctrl *TaskController) GetActiveTasks(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	tasks, err := ctrl.taskService.GetActiveTasks(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Active tasks retrieved successfully", map[string]interface{}{
		"tasks": tasks,
	})
}
