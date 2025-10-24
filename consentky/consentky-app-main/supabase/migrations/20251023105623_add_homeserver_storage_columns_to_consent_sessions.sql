/*
  # Add Homeserver Storage Tracking Columns

  This migration adds columns to track whether consent agreements have been
  saved to each participant's homeserver for permanent backup.

  ## New Columns

  1. **a_homeserver_stored** (boolean)
     - Tracks if Person A has saved the agreement to their homeserver
     - Default: false
     - Nullable: false

  2. **b_homeserver_stored** (boolean)
     - Tracks if Person B has saved the agreement to their homeserver
     - Default: false
     - Nullable: false

  3. **a_homeserver_url** (text)
     - The pubky:// URL where Person A stored the agreement
     - Nullable: true (only set after successful save)

  4. **b_homeserver_url** (text)
     - The pubky:// URL where Person B stored the agreement
     - Nullable: true (only set after successful save)

  5. **homeserver_stored_at** (timestamptz)
     - Timestamp when both parties completed homeserver storage
     - Nullable: true (only set when both have saved)

  ## Purpose

  These columns enable:
  - Tracking backup status for each participant
  - Verification that agreements are permanently stored
  - Direct access to homeserver URLs for proof verification
  - Completion timestamp for audit trails
*/

-- Add homeserver storage tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_stored boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_stored'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_stored boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'a_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN a_homeserver_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'b_homeserver_url'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN b_homeserver_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consent_sessions' AND column_name = 'homeserver_stored_at'
  ) THEN
    ALTER TABLE consent_sessions ADD COLUMN homeserver_stored_at timestamptz;
  END IF;
END $$;

-- Create index for queries filtering by homeserver storage status
CREATE INDEX IF NOT EXISTS idx_consent_sessions_homeserver_stored 
ON consent_sessions(a_homeserver_stored, b_homeserver_stored);
