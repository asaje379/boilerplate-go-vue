package query

import (
	"fmt"
	"strconv"
	"strings"

	appcommon "api/internal/application/common"

	"github.com/gin-gonic/gin"
)

func ParseListParams(c *gin.Context, defaultSortBy string, allowedSorts map[string]struct{}) (appcommon.ListParams, error) {
	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		return appcommon.ListParams{}, fmt.Errorf("invalid page")
	}

	limit, err := parsePositiveInt(c.DefaultQuery("limit", "20"))
	if err != nil {
		return appcommon.ListParams{}, fmt.Errorf("invalid limit")
	}

	sortBy := strings.TrimSpace(c.DefaultQuery("sortBy", defaultSortBy))
	if _, ok := allowedSorts[sortBy]; !ok {
		return appcommon.ListParams{}, fmt.Errorf("invalid sortBy")
	}

	sortOrder := strings.ToLower(strings.TrimSpace(c.DefaultQuery("sortOrder", "desc")))
	if sortOrder != "asc" && sortOrder != "desc" {
		return appcommon.ListParams{}, fmt.Errorf("invalid sortOrder")
	}

	return appcommon.ListParams{
		Page:      page,
		Limit:     limit,
		Search:    strings.TrimSpace(c.Query("search")),
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}, nil
}

func parsePositiveInt(value string) (int, error) {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("invalid positive integer")
	}

	return parsed, nil
}
