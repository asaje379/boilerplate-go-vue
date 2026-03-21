ALTER TABLE users
ALTER COLUMN two_factor_enabled SET DEFAULT FALSE;

UPDATE users
SET two_factor_enabled = FALSE
WHERE two_factor_enabled IS NULL;
