package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"

	platformid "api/internal/platform/id"
)

//go:embed sql/*.sql
var migrationFS embed.FS

type Runner struct{}

func NewRunner() Runner {
	return Runner{}
}

func (Runner) Run(ctx context.Context, db *sql.DB) error {
	if err := ensureMigrationsTable(ctx, db); err != nil {
		return err
	}

	entries, err := migrationFS.ReadDir("sql")
	if err != nil {
		return err
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		applied, err := wasApplied(ctx, db, name)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		content, err := migrationFS.ReadFile("sql/" + name)
		if err != nil {
			return err
		}

		if err := applyMigration(ctx, db, name, string(content)); err != nil {
			return err
		}
	}

	if err := migrateLegacyIntegerIDs(ctx, db); err != nil {
		return err
	}

	return nil
}

func ensureMigrationsTable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func wasApplied(ctx context.Context, db *sql.DB, version string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists)
	return exists, err
}

func applyMigration(ctx context.Context, db *sql.DB, version string, sqlContent string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.ExecContext(ctx, sqlContent); err != nil {
		return fmt.Errorf("migration %s failed: %w", version, err)
	}

	if _, err = tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func migrateLegacyIntegerIDs(ctx context.Context, db *sql.DB) error {
	legacy, err := hasLegacyIntegerIDs(ctx, db)
	if err != nil || !legacy {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	rows, err := tx.QueryContext(ctx, `SELECT id FROM users`)
	if err != nil {
		return err
	}
	defer rows.Close()

	mapping := map[int64]string{}
	for rows.Next() {
		var oldID int64
		if err = rows.Scan(&oldID); err != nil {
			return err
		}
		mapping[oldID] = platformid.New()
	}
	if err = rows.Err(); err != nil {
		return err
	}

	for oldID, cuid := range mapping {
		if _, err = tx.ExecContext(ctx, `UPDATE users SET cuid_id = $1 WHERE id = $2`, cuid, oldID); err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, `UPDATE refresh_tokens SET cuid_user_id = $1 WHERE user_id = $2`, cuid, oldID); err != nil {
			return err
		}
	}

	statements := []string{
		`ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey`,
		`DROP INDEX IF EXISTS idx_refresh_tokens_user_id`,
		`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey`,
		`ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS user_id`,
		`ALTER TABLE users DROP COLUMN IF EXISTS id`,
		`ALTER TABLE users RENAME COLUMN cuid_id TO id`,
		`ALTER TABLE users ALTER COLUMN id SET NOT NULL`,
		`ALTER TABLE users ADD PRIMARY KEY (id)`,
		`ALTER TABLE refresh_tokens RENAME COLUMN cuid_user_id TO user_id`,
		`ALTER TABLE refresh_tokens ALTER COLUMN user_id SET NOT NULL`,
		`ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
	}

	for _, stmt := range statements {
		if _, err = tx.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}

	if _, err = tx.ExecContext(ctx, `DELETE FROM schema_migrations WHERE version = '000002_convert_integer_ids_to_cuid.sql'`); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ('legacy_integer_id_to_cuid') ON CONFLICT DO NOTHING`); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func hasLegacyIntegerIDs(ctx context.Context, db *sql.DB) (bool, error) {
	var dataType string
	err := db.QueryRowContext(ctx, `
		SELECT data_type
		FROM information_schema.columns
		WHERE table_name = 'users' AND column_name = 'id'
	`).Scan(&dataType)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return dataType == "bigint" || dataType == "integer", nil
}
