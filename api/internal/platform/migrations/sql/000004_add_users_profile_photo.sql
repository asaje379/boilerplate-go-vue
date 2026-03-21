ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_photo_file_id VARCHAR(32) NULL REFERENCES files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_profile_photo_file_id ON users(profile_photo_file_id);
