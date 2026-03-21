package file

import (
	"context"

	appcommon "api/internal/application/common"
)

type Repository interface {
	Create(ctx context.Context, file *File) error
	GetByID(ctx context.Context, id string) (*File, error)
	List(ctx context.Context, params appcommon.ListParams, uploadedByID string, isAdmin bool) ([]File, int64, error)
	DeleteByID(ctx context.Context, id string) error
}
