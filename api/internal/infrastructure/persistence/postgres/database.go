package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func New(databaseURL string) (*gorm.DB, error) {
	if err := EnsureDatabaseExists(databaseURL); err != nil {
		return nil, err
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("postgres ping failed: %w", err)
	}

	return db, nil
}

func EnsureDatabaseExists(databaseURL string) error {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	databaseName := path.Base(parsed.Path)
	if databaseName == "." || databaseName == "/" || databaseName == "" {
		return fmt.Errorf("DATABASE_URL must include a database name")
	}

	adminURL := *parsed
	adminURL.Path = "/postgres"

	adminDB, err := sql.Open("pgx", adminURL.String())
	if err != nil {
		return err
	}
	defer adminDB.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := adminDB.PingContext(ctx); err != nil {
		return fmt.Errorf("postgres admin ping failed: %w", err)
	}

	var exists bool
	if err := adminDB.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)`, databaseName).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	if _, err := adminDB.ExecContext(ctx, `CREATE DATABASE `+quoteIdentifier(databaseName)); err != nil {
		return fmt.Errorf("create database failed: %w", err)
	}

	return nil
}

func quoteIdentifier(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}
