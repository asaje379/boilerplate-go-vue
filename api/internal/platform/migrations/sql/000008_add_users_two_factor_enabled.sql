ALTER TABLE users
ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_users_two_factor_enabled ON users(two_factor_enabled);
