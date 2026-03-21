CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(32) PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(1024) NOT NULL UNIQUE,
    bucket VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    visibility VARCHAR(20) NOT NULL,
    uploaded_by_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_provider ON files(provider);
CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(visibility);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by_id ON files(uploaded_by_id);

DROP TRIGGER IF EXISTS files_set_updated_at ON files;
CREATE TRIGGER files_set_updated_at
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
