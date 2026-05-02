package auth

import (
	"errors"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var ErrUnauthorized = errors.New("unauthorized")

type Claims struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	Email  string `json:"email"`
	Type   string `json:"type"`
	jwt.RegisteredClaims
}

type Principal struct {
	UserID string
	Role   string
	Email  string
}

type Service struct {
	jwtSecret []byte
}

func NewService(jwtSecret string) Service {
	return Service{jwtSecret: []byte(jwtSecret)}
}

func (s Service) Authenticate(token string) (Principal, error) {
	parsed, err := jwt.ParseWithClaims(strings.TrimSpace(token), &Claims{}, func(_ *jwt.Token) (any, error) {
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return Principal{}, ErrUnauthorized
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid || claims.Type != "access" || claims.UserID == "" {
		return Principal{}, ErrUnauthorized
	}

	return Principal{UserID: claims.UserID, Role: claims.Role, Email: claims.Email}, nil
}
