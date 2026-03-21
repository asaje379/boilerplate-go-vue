CREATE TABLE IF NOT EXISTS email_otps (
    id VARCHAR(32) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_id VARCHAR(32) NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(50) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_user_id ON email_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otps_purpose ON email_otps(purpose);

DROP TRIGGER IF EXISTS email_otps_set_updated_at ON email_otps;
CREATE TRIGGER email_otps_set_updated_at
BEFORE UPDATE ON email_otps
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
