package dto

// ============================================================================
// SYSTEM ADMIN DTOs
// ============================================================================

// InitAdminRequest represents request to create initial system admin
type InitAdminRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
}

// InitAdminResponse represents response after creating system admin
type InitAdminResponse struct {
	Success bool         `json:"success"`
	Message string       `json:"message"`
	User    UserResponse `json:"user,omitempty"`
}

// CheckAdminExistsResponse represents response for checking if admin exists
type CheckAdminExistsResponse struct {
	Exists bool `json:"exists"`
}
