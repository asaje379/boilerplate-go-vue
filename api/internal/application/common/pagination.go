package common

import "math"

type ListParams struct {
	Page      int
	Limit     int
	Search    string
	SortBy    string
	SortOrder string
}

type PageMeta struct {
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
	Total      int64  `json:"total"`
	TotalPages int    `json:"totalPages"`
	Search     string `json:"search,omitempty"`
	SortBy     string `json:"sortBy,omitempty"`
	SortOrder  string `json:"sortOrder,omitempty"`
}

type PageResult[T any] struct {
	Items []T      `json:"items"`
	Meta  PageMeta `json:"meta"`
}

func (p ListParams) Normalize(defaultLimit, maxLimit int, defaultSortBy string) ListParams {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.Limit <= 0 {
		p.Limit = defaultLimit
	}
	if p.Limit > maxLimit {
		p.Limit = maxLimit
	}
	if p.SortOrder != "asc" {
		p.SortOrder = "desc"
	}
	if p.SortBy == "" {
		p.SortBy = defaultSortBy
	}

	return p
}

func (p ListParams) Offset() int {
	return (p.Page - 1) * p.Limit
}

func NewPageMeta(params ListParams, total int64) PageMeta {
	totalPages := 0
	if params.Limit > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(params.Limit)))
	}

	return PageMeta{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: totalPages,
		Search:     params.Search,
		SortBy:     params.SortBy,
		SortOrder:  params.SortOrder,
	}
}
