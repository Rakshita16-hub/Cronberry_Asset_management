-- Add remarks column to assets table (run this if you have an existing database)
-- Usage: mysql -u your_user -p cronberry_assets < 001_add_remarks_to_assets.sql

USE cronberry_assets;

ALTER TABLE assets ADD COLUMN remarks TEXT DEFAULT NULL;
