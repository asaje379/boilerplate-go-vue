package file

import "time"

type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityPublic  Visibility = "public"
)

type File struct {
	ID           string
	OriginalName string
	StoredName   string
	StorageKey   string
	Bucket       string
	Provider     string
	ContentType  string
	SizeBytes    int64
	Visibility   Visibility
	UploadedByID string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (v Visibility) IsValid() bool {
	return v == VisibilityPrivate || v == VisibilityPublic
}
