-- Migration: Add columns for chat widget support
-- Run this after create-tables.sql

-- Add customer_phone and metadata to conversations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE conversations ADD COLUMN customer_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE conversations ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;
