package utils

import (
	"github.com/beuphecan/remote-time-tracker/internal/dto"
	"github.com/gin-gonic/gin"
)

// SuccessResponse sends a success JSON response
func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, dto.SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse sends an error JSON response
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, dto.ErrorResponse{
		Error:   "error",
		Message: message,
		Code:    statusCode,
	})
}

// PaginatedResponse sends a paginated JSON response
func PaginatedResponse(c *gin.Context, statusCode int, data interface{}, page, perPage int, total int64) {
	c.JSON(statusCode, dto.PaginatedResponse{
		Success: true,
		Data:    data,
		Meta: dto.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: CalculatePaginationPages(total, perPage),
		},
	})
}
