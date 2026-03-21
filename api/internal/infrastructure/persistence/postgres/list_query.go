package postgres

import (
	"fmt"
	"strings"

	appcommon "api/internal/application/common"
	"gorm.io/gorm"
)

func applyListQuery(db *gorm.DB, params appcommon.ListParams, searchColumns []string, allowedSorts map[string]string) (*gorm.DB, error) {
	query := db
	if params.Search != "" && len(searchColumns) > 0 {
		like := "%" + strings.ToLower(params.Search) + "%"
		parts := make([]string, 0, len(searchColumns))
		args := make([]any, 0, len(searchColumns))
		for _, column := range searchColumns {
			parts = append(parts, fmt.Sprintf("LOWER(%s) LIKE ?", column))
			args = append(args, like)
		}
		query = query.Where(strings.Join(parts, " OR "), args...)
	}

	sortColumn, ok := allowedSorts[params.SortBy]
	if !ok {
		return nil, fmt.Errorf("unsupported sort field")
	}

	return query.Order(sortColumn + " " + params.SortOrder), nil
}
