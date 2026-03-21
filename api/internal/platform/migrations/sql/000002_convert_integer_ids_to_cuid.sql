DO $$
DECLARE
    users_id_type TEXT;
    refresh_user_id_type TEXT;
BEGIN
    SELECT data_type INTO users_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';

    SELECT data_type INTO refresh_user_id_type
    FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'user_id';

    IF users_id_type IN ('bigint', 'integer') THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cuid_id VARCHAR(32);
    END IF;

    IF refresh_user_id_type IN ('bigint', 'integer') THEN
        ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS cuid_user_id VARCHAR(32);
    END IF;
END $$;
