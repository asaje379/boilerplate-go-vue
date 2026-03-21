package presenter

import (
	appcommon "api/internal/application/common"
	filedomain "api/internal/domain/file"
)

type FileResponse struct {
	ID           string                `json:"id"`
	OriginalName string                `json:"originalName"`
	StoredName   string                `json:"storedName"`
	StorageKey   string                `json:"storageKey"`
	Bucket       string                `json:"bucket"`
	Provider     string                `json:"provider" example:"aws" enums:"aws,minio"`
	ContentType  string                `json:"contentType"`
	SizeBytes    int64                 `json:"sizeBytes"`
	Visibility   filedomain.Visibility `json:"visibility" example:"private" enums:"private,public"`
	UploadedByID string                `json:"uploadedById"`
	CreatedAt    string                `json:"createdAt"`
	UpdatedAt    string                `json:"updatedAt"`
}

type PaginatedFilesResponse struct {
	Items []FileResponse         `json:"items"`
	Meta  PaginationMetaResponse `json:"meta"`
}

type SignedDownloadResponse struct {
	URL  string       `json:"url"`
	File FileResponse `json:"file"`
}

func ToFileResponse(file *filedomain.File) FileResponse {
	return FileResponse{
		ID:           file.ID,
		OriginalName: file.OriginalName,
		StoredName:   file.StoredName,
		StorageKey:   file.StorageKey,
		Bucket:       file.Bucket,
		Provider:     file.Provider,
		ContentType:  file.ContentType,
		SizeBytes:    file.SizeBytes,
		Visibility:   file.Visibility,
		UploadedByID: file.UploadedByID,
		CreatedAt:    file.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    file.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func ToFilesResponse(items []filedomain.File) []FileResponse {
	response := make([]FileResponse, 0, len(items))
	for i := range items {
		response = append(response, ToFileResponse(&items[i]))
	}

	return response
}

func ToPaginatedFilesResponse(result *appcommon.PageResult[filedomain.File]) PaginatedFilesResponse {
	return PaginatedFilesResponse{
		Items: ToFilesResponse(result.Items),
		Meta: PaginationMetaResponse{
			Page:       result.Meta.Page,
			Limit:      result.Meta.Limit,
			Total:      result.Meta.Total,
			TotalPages: result.Meta.TotalPages,
			Search:     result.Meta.Search,
			SortBy:     result.Meta.SortBy,
			SortOrder:  result.Meta.SortOrder,
		},
	}
}
