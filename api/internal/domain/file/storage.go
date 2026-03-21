package file

import (
	"context"
	"io"
	"time"
)

type UploadObjectInput struct {
	Key         string
	Body        io.Reader
	Size        int64
	ContentType string
	Visibility  Visibility
	FileName    string
}

type Storage interface {
	UploadObject(ctx context.Context, input UploadObjectInput) error
	DeleteObject(ctx context.Context, key string) error
	GetSignedDownloadURL(ctx context.Context, key string, ttl time.Duration, fileName string) (string, error)
	GetPublicURL(key string) string
	Bucket() string
	Provider() string
}
