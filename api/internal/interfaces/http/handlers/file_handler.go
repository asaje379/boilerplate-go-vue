package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	appcommon "api/internal/application/common"
	appfile "api/internal/application/file"
	filedomain "api/internal/domain/file"
	"api/internal/interfaces/http/middleware"
	"api/internal/interfaces/http/presenter"
	queryhelper "api/internal/interfaces/http/query"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	fileService appfile.Service
}

type UploadFileResponse struct {
	File presenter.FileResponse `json:"file"`
}

func NewFileHandler(fileService appfile.Service) FileHandler {
	return FileHandler{fileService: fileService}
}

// Upload godoc
// @Summary Upload a file
// @Description Uploads a file to object storage and stores metadata in database.
// @Tags files
// @Accept mpfd
// @Produce json
// @Security BearerAuth
// @Param file formData file true "File binary"
// @Param path formData string false "Optional storage path prefix inside the configured bucket base path"
// @Param visibility formData string false "private or public" Enums(private,public)
// @Success 201 {object} UploadFileResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/files/upload [post]
func (h FileHandler) Upload(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "file is required"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "unable to open file"})
		return
	}
	defer file.Close()

	uploadPath := strings.TrimSpace(c.DefaultPostForm("path", ""))
	visibility := filedomain.Visibility(strings.ToLower(strings.TrimSpace(c.DefaultPostForm("visibility", "private"))))
	uploaded, err := h.fileService.Upload(c.Request.Context(), appfile.UploadInput{
		FileHeader:   fileHeader,
		File:         file,
		Path:         uploadPath,
		Visibility:   visibility,
		UploadedByID: current.ID,
	})
	if err != nil {
		log.Printf("file upload failed: user_id=%s filename=%q size=%d path=%q visibility=%s content_type=%q err=%v", current.ID, fileHeader.Filename, fileHeader.Size, uploadPath, visibility, fileHeader.Header.Get("Content-Type"), err)
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, UploadFileResponse{File: presenter.ToFileResponse(uploaded)})
}

// Delete godoc
// @Summary Delete a file
// @Description Deletes the object from storage and removes its metadata.
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param id path string true "File ID"
// @Success 204
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/files/{id} [delete]
func (h FileHandler) Delete(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	if err := h.fileService.Delete(c.Request.Context(), c.Param("id"), current.ID, current.Role); err != nil {
		h.handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// List godoc
// @Summary List files
// @Description Returns uploaded files. Admin sees all, users see only their files.
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number"
// @Param limit query int false "Page size"
// @Param search query string false "Search on name, content type, provider, visibility"
// @Param sortBy query string false "Sort field" Enums(createdAt,updatedAt,name,provider,size)
// @Param sortOrder query string false "Sort order" Enums(asc,desc)
// @Success 200 {object} presenter.PaginatedFilesResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/v1/files [get]
func (h FileHandler) List(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	params, err := queryhelper.ParseListParams(c, "createdAt", map[string]struct{}{
		"createdAt": {},
		"updatedAt": {},
		"name":      {},
		"provider":  {},
		"size":      {},
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	result, err := h.fileService.List(c.Request.Context(), appfile.ListInput{ActorID: current.ID, ActorRole: current.Role, Params: params})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, presenter.ToPaginatedFilesResponse(result))
}

// GetByID godoc
// @Summary Get file metadata
// @Description Returns file metadata if the caller is owner or admin.
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param id path string true "File ID"
// @Success 200 {object} presenter.FileResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/files/{id} [get]
func (h FileHandler) GetByID(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	file, err := h.fileService.GetByID(c.Request.Context(), c.Param("id"), current.ID, current.Role)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, presenter.ToFileResponse(file))
}

// SignedDownload godoc
// @Summary Get signed download URL
// @Description Returns a temporary signed URL for downloading a file.
// @Tags files
// @Produce json
// @Security BearerAuth
// @Param id path string true "File ID"
// @Success 200 {object} presenter.SignedDownloadResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/files/{id}/download-signed [get]
func (h FileHandler) SignedDownload(c *gin.Context) {
	current, ok := middleware.GetCurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: appcommon.ErrUnauthorized.Error()})
		return
	}

	url, file, err := h.fileService.GetSignedDownloadURL(c.Request.Context(), c.Param("id"), current.ID, current.Role)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, presenter.SignedDownloadResponse{URL: url, File: presenter.ToFileResponse(file)})
}

// PublicDownload godoc
// @Summary Public file download
// @Description Redirects to the public file URL if the file visibility is public.
// @Tags files
// @Param id path string true "File ID"
// @Success 302
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /api/v1/files/public/{id}/download [get]
func (h FileHandler) PublicDownload(c *gin.Context) {
	url, _, err := h.fileService.GetPublicDownloadURL(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.Redirect(http.StatusFound, url)
}

func (h FileHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, appcommon.ErrValidation):
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrForbidden):
		c.JSON(http.StatusForbidden, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrNotFound):
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
	case errors.Is(err, appcommon.ErrUnauthorized):
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
	default:
		log.Printf("file handler unexpected error: err=%v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
	}
}
