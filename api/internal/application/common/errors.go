package common

import "errors"

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrConflict     = errors.New("resource already exists")
	ErrNotFound     = errors.New("resource not found")
	ErrValidation   = errors.New("validation error")
)
