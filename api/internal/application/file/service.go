package file

import (
	"context"
	"errors"
	"fmt"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	appcommon "api/internal/application/common"
	filedomain "api/internal/domain/file"
	userdomain "api/internal/domain/user"
	platformid "api/internal/platform/id"

	"gorm.io/gorm"
)

type Service struct {
	files          filedomain.Repository
	storage        filedomain.Storage
	bucketBasePath string
	signedURLTTL   time.Duration
	maxSizeBytes   int64
	events         appcommon.EventPublisher
}

type UploadInput struct {
	FileHeader   *multipart.FileHeader
	File         multipart.File
	Path         string
	Visibility   filedomain.Visibility
	UploadedByID string
}

type ListInput struct {
	ActorID   string
	ActorRole userdomain.Role
	Params    appcommon.ListParams
}

func NewService(files filedomain.Repository, storage filedomain.Storage, bucketBasePath string, signedURLTTL time.Duration, maxSizeBytes int64, events appcommon.EventPublisher) Service {
	return Service{files: files, storage: storage, bucketBasePath: strings.Trim(strings.TrimSpace(bucketBasePath), "/"), signedURLTTL: signedURLTTL, maxSizeBytes: maxSizeBytes, events: events}
}

func (s Service) Upload(ctx context.Context, input UploadInput) (*filedomain.File, error) {
	if input.FileHeader == nil || input.File == nil {
		return nil, fmt.Errorf("%w: file is required", appcommon.ErrValidation)
	}

	visibility := input.Visibility
	if visibility == "" {
		visibility = filedomain.VisibilityPrivate
	}
	if !visibility.IsValid() {
		return nil, fmt.Errorf("%w: invalid visibility", appcommon.ErrValidation)
	}

	originalName := strings.TrimSpace(input.FileHeader.Filename)
	if originalName == "" {
		return nil, fmt.Errorf("%w: filename is required", appcommon.ErrValidation)
	}

	if input.FileHeader.Size <= 0 {
		return nil, fmt.Errorf("%w: file size is invalid", appcommon.ErrValidation)
	}

	if s.maxSizeBytes > 0 && input.FileHeader.Size > s.maxSizeBytes {
		return nil, fmt.Errorf("%w: file exceeds maximum allowed size", appcommon.ErrValidation)
	}

	fileID := platformid.New()
	ext := strings.ToLower(filepath.Ext(originalName))
	storedName := fileID + ext
	storageKey := buildStorageKey(s.bucketBasePath, input.Path, input.UploadedByID, storedName)
	contentType := input.FileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if err := s.storage.UploadObject(ctx, filedomain.UploadObjectInput{
		Key:         storageKey,
		Body:        input.File,
		Size:        input.FileHeader.Size,
		ContentType: contentType,
		Visibility:  visibility,
		FileName:    originalName,
	}); err != nil {
		return nil, err
	}

	storedFile := &filedomain.File{
		ID:           fileID,
		OriginalName: originalName,
		StoredName:   storedName,
		StorageKey:   storageKey,
		Bucket:       s.storage.Bucket(),
		Provider:     s.storage.Provider(),
		ContentType:  contentType,
		SizeBytes:    input.FileHeader.Size,
		Visibility:   visibility,
		UploadedByID: input.UploadedByID,
	}

	if err := s.files.Create(ctx, storedFile); err != nil {
		return nil, err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "file.uploaded",
		Channel:        "files",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{storedFile.UploadedByID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"fileId":       storedFile.ID,
			"originalName": storedFile.OriginalName,
			"contentType":  storedFile.ContentType,
			"sizeBytes":    storedFile.SizeBytes,
			"visibility":   storedFile.Visibility,
			"uploadedById": storedFile.UploadedByID,
		},
	})

	return storedFile, nil
}

func (s Service) GetByID(ctx context.Context, id, actorID string, actorRole userdomain.Role) (*filedomain.File, error) {
	file, err := s.files.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, appcommon.ErrNotFound
		}
		return nil, err
	}

	if actorRole != userdomain.RoleAdmin && file.UploadedByID != actorID {
		return nil, appcommon.ErrForbidden
	}

	return file, nil
}

func (s Service) List(ctx context.Context, input ListInput) (*appcommon.PageResult[filedomain.File], error) {
	params := input.Params.Normalize(20, 100, "createdAt")
	items, total, err := s.files.List(ctx, params, input.ActorID, input.ActorRole == userdomain.RoleAdmin)
	if err != nil {
		return nil, err
	}

	return &appcommon.PageResult[filedomain.File]{
		Items: items,
		Meta:  appcommon.NewPageMeta(params, total),
	}, nil
}

func (s Service) GetSignedDownloadURL(ctx context.Context, id, actorID string, actorRole userdomain.Role) (string, *filedomain.File, error) {
	file, err := s.GetByID(ctx, id, actorID, actorRole)
	if err != nil {
		return "", nil, err
	}

	url, err := s.storage.GetSignedDownloadURL(ctx, file.StorageKey, s.signedURLTTL, file.OriginalName)
	if err != nil {
		return "", nil, err
	}

	return url, file, nil
}

func (s Service) GetPublicDownloadURL(ctx context.Context, id string) (string, *filedomain.File, error) {
	file, err := s.files.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, appcommon.ErrNotFound
		}
		return "", nil, err
	}

	if file.Visibility != filedomain.VisibilityPublic {
		return "", nil, appcommon.ErrForbidden
	}

	url := s.storage.GetPublicURL(file.StorageKey)
	if url == "" {
		return "", nil, appcommon.ErrForbidden
	}

	return url, file, nil
}

func (s Service) GetAccessibleDownloadURL(ctx context.Context, id, actorID string, actorRole userdomain.Role) (string, *filedomain.File, error) {
	file, err := s.files.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, appcommon.ErrNotFound
		}
		return "", nil, err
	}

	if file.Visibility == filedomain.VisibilityPublic {
		if url := s.storage.GetPublicURL(file.StorageKey); url != "" {
			return url, file, nil
		}
	}

	if actorRole != userdomain.RoleAdmin && file.UploadedByID != actorID {
		return "", nil, appcommon.ErrForbidden
	}

	url, err := s.storage.GetSignedDownloadURL(ctx, file.StorageKey, s.signedURLTTL, file.OriginalName)
	if err != nil {
		return "", nil, err
	}

	return url, file, nil
}

func (s Service) Delete(ctx context.Context, id, actorID string, actorRole userdomain.Role) error {
	file, err := s.GetByID(ctx, id, actorID, actorRole)
	if err != nil {
		return err
	}

	if err := s.storage.DeleteObject(ctx, file.StorageKey); err != nil {
		return err
	}
	if err := s.files.DeleteByID(ctx, file.ID); err != nil {
		return err
	}
	s.publish(ctx, appcommon.RealtimeEvent{
		ID:             platformid.New(),
		Type:           "file.deleted",
		Channel:        "files",
		AllowedRoles:   []string{string(userdomain.RoleAdmin)},
		AllowedUserIDs: []string{file.UploadedByID},
		OccurredAt:     time.Now().UTC(),
		Data: map[string]any{
			"fileId":       file.ID,
			"originalName": file.OriginalName,
			"uploadedById": file.UploadedByID,
		},
	})

	return nil
}

func (s Service) publish(ctx context.Context, event appcommon.RealtimeEvent) {
	if s.events == nil {
		return
	}
	if err := s.events.Publish(ctx, event); err != nil {
		log.Printf("realtime event publish failed: type=%s err=%v", event.Type, err)
	}
}

func buildStorageKey(bucketBasePath, uploadPath, uploadedByID, storedName string) string {
	datePrefix := time.Now().UTC().Format("2006/01/02")
	if uploadedByID == "" {
		uploadedByID = "anonymous"
	}

	segments := make([]string, 0, 4)
	if bucketBasePath = strings.Trim(strings.TrimSpace(bucketBasePath), "/"); bucketBasePath != "" {
		segments = append(segments, bucketBasePath)
	}
	if uploadPath = strings.Trim(strings.TrimSpace(uploadPath), "/"); uploadPath != "" {
		segments = append(segments, uploadPath)
	}

	segments = append(segments, "uploads", uploadedByID, datePrefix, storedName)

	return strings.Join(segments, "/")
}
