-- Add remarks column to assets table for PostgreSQL (run this if you have an existing database)
-- Usage: psql -d cronberry_assets -f 001_add_remarks_to_assets.sql

ALTER TABLE assets ADD COLUMN IF NOT EXISTS remarks TEXT DEFAULT NULL;
