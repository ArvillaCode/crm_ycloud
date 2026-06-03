-- 003_phase3_hardening.sql

-- Add soft-delete timestamps
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Indexes to filter soft-deleted rows quickly
CREATE INDEX IF NOT EXISTS idx_contacts_deleted ON contacts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_deleted ON conversations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Webhook Idempotency: Partial Unique Index to ensure only non-null messages are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id_unique
ON messages(whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;
