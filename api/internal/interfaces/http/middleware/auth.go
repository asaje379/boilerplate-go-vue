package middleware

import (
	"net/http"
	"strings"

	appauth "api/internal/application/auth"
	appcommon "api/internal/application/common"
	userdomain "api/internal/domain/user"

	"github.com/gin-gonic/gin"
)

const currentUserKey = "current_user"

type CurrentUser struct {
	ID    string
	Email string
	Role  userdomain.Role
}

func Authenticate(authService appauth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			abortWithError(c, http.StatusUnauthorized, appcommon.ErrUnauthorized.Error())
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortWithError(c, http.StatusUnauthorized, "invalid authorization header")
			return
		}

		claims, err := authService.ParseToken(parts[1])
		if err != nil {
			abortWithError(c, http.StatusUnauthorized, appcommon.ErrUnauthorized.Error())
			return
		}

		c.Set(currentUserKey, CurrentUser{ID: claims.UserID, Email: claims.Email, Role: claims.Role})
		c.Next()
	}
}

func RequireRoles(roles ...userdomain.Role) gin.HandlerFunc {
	allowed := make(map[userdomain.Role]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}

	return func(c *gin.Context) {
		current, ok := GetCurrentUser(c)
		if !ok {
			abortWithError(c, http.StatusUnauthorized, appcommon.ErrUnauthorized.Error())
			return
		}

		if _, exists := allowed[current.Role]; !exists {
			abortWithError(c, http.StatusForbidden, appcommon.ErrForbidden.Error())
			return
		}

		c.Next()
	}
}

func GetCurrentUser(c *gin.Context) (CurrentUser, bool) {
	value, ok := c.Get(currentUserKey)
	if !ok {
		return CurrentUser{}, false
	}

	current, ok := value.(CurrentUser)
	return current, ok
}

func abortWithError(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": message})
}
