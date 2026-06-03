-- 004_production_readiness.sql

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Extend Audit Logs for entity comparisons
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100) DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB DEFAULT NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
