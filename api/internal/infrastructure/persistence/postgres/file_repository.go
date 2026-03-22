package postgres

import (
	"context"
	"errors"

	appcommon "api/internal/application/common"
	filedomain "api/internal/domain/file"

	"gorm.io/gorm"
)

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) FileRepository {
	return FileRepository{db: db}
}

func (r FileRepository) Create(ctx context.Context, file *filedomain.File) error {
	model := fromDomainFile(file)
	if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
		return err
	}

	*file = *model.toDomain()
	return nil
}

func (r FileRepository) GetByID(ctx context.Context, id string) (*filedomain.File, error) {
	var model FileModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	return model.toDomain(), nil
}

func (r FileRepository) List(ctx context.Context, params appcommon.ListParams, uploadedByID string, isAdmin bool) ([]filedomain.File, int64, error) {
	query := r.db.WithContext(ctx).Model(&FileModel{})
	if !isAdmin {
		query = query.Where("uploaded_by_id = ?", uploadedByID)
	}

	query, err := applyListQuery(
		query,
		params,
		[]string{"original_name", "stored_name", "content_type", "provider", "visibility"},
		map[string]string{
			"createdAt": "created_at",
			"updatedAt": "updated_at",
			"name":      "original_name",
			"provider":  "provider",
			"size":      "size_bytes",
		},
	)
	if err != nil {
		return nil, 0, err
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var models []FileModel
	if err := query.Limit(params.Limit).Offset(params.Offset()).Find(&models).Error; err != nil {
		return nil, 0, err
	}

	files := make([]filedomain.File, 0, len(models))
	for _, model := range models {
		files = append(files, *model.toDomain())
	}

	return files, total, nil
}

func (r FileRepository) DeleteByID(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&FileModel{}, "id = ?", id).Error
}
