package handlers

import (
	"errors"
	"net/http"

	appcommon "api/internal/application/common"

	"github.com/gin-gonic/gin"
)

func HandleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, appcommon.ErrValidation):
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrConflict):
		c.JSON(http.StatusConflict, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrForbidden):
		c.JSON(http.StatusForbidden, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrNotFound):
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
	}
}
